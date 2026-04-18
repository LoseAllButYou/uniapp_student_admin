import { ref, Ref, onUnmounted } from 'vue'
import { Camera, TreeData, TreeRenderData, WORLD_WIDTH, WORLD_HEIGHT, MIN_ZOOM, MAX_ZOOM, MIN_TREE_DISTANCE, BannerData, TreeConfig } from '../scripts/types'
import { buildTreeRenderData, drawBackgroundOnCanvas, drawTreeOnCanvas, isPointNearTree, getImage, getImgSrc, calculateInitialZoom, IMG_BASE } from '../scripts/treeResources'
import { TREE_PANEL_CONFIG, TREE_SIZE_CONFIG } from '../scripts/resourceConfig'

export function useCanvasEngine(
	treesData: Ref<TreeData[]>,
	selectedTreeId: Ref<number | null>,
	treeConfigs: Ref<TreeConfig[]>
) {
	const camera = ref<Camera>({ x: 0, y: 0, zoom: 1 })
	const canvasEl = ref<HTMLCanvasElement | null>(null)
	const containerEl = ref<HTMLElement | null>(null)
	const isDragging = ref(false)
	const isPlantMode = ref(false)
	const plantPosition = ref<{ x: number; y: number } | null>(null)
	const treeRenderList = ref<TreeRenderData[]>([])
	const animFrameId = ref<number>(0)

	const dragPlantTreeType = ref('')
	const dragPlantScreenX = ref(0)
	const dragPlantScreenY = ref(0)
	const dragPlantWorldX = ref(0)
	const dragPlantWorldY = ref(0)
	const dragPlantValid = ref(true)
	const dragPlantTooClose = ref(false)
	const isDraggingPlant = ref(false)
	const plantPreviewBounced = ref(false)

	const showTreePanel = ref(true)
	const panelCards: { type: string; name: string; unlocked: boolean; hint: string; icon: string; lockedIcon: string }[] = []

	let dragStartX = 0
	let dragStartY = 0
	let cameraStartX = 0
	let cameraStartY = 0
	let hasDragged = false
	let ctx: CanvasRenderingContext2D | null = null
	let dpr = 1
	let canvasW = 0
	let canvasH = 0
	let worldW = WORLD_WIDTH
	let worldH = WORLD_HEIGHT
	let wheelBound = false
	let panelOffsetX = 0
	let panelDragging = false
	let panelDragStartX = 0
	let panelDragStartOffset = 0
	let panelTotalWidth = 0
	let panelX = 0
	let panelY = 0
	let panelH = 0

	const calcPanelMetrics = () => {
		const cfg = TREE_PANEL_CONFIG
		const count = panelCards.length
		if (count === 0) { panelTotalWidth = 0; return }
		panelTotalWidth = count * cfg.cardWidth + Math.max(0, count - 1) * cfg.cardGap + cfg.padding * 2
		panelH = cfg.cardHeight + cfg.padding * 2
		panelX = (canvasW - panelTotalWidth) / 2
		panelY = 0
	}

	const updatePanelCards = () => {
		const treeCount = treesData.value.length
		const maxLevel = treesData.value.reduce((max, t) => Math.max(max, t.level), 0)
		panelCards.length = 0
		for (const tc of treeConfigs.value) {
			const level = tc.level || 1
			let unlocked = false
			let hint = ''
			if (level <= 1) { unlocked = true; hint = '可直接种植' }
			else if (level === 2) { unlocked = treeCount >= 2; hint = unlocked ? '可种植' : '需要种植2棵树' }
			else if (level === 3) { unlocked = maxLevel >= 3 || treeCount >= 5; hint = unlocked ? '可种植' : '需要树木达3级或5棵树' }
			else { unlocked = treeCount >= level * 3; hint = unlocked ? '可种植' : `需要种植${level * 3}棵树` }
			const icon = getImage(getImgSrc(tc.tree_type))
			panelCards.push({
				type: tc.tree_type,
				name: tc.tree_name,
				unlocked,
				hint: unlocked ? tc.description : hint,
				icon: icon && icon.complete ? getImgSrc(tc.tree_type) : '',
				lockedIcon: unlocked ? '' : '🔒',
			})
		}
		calcPanelMetrics()
	}

	const isOnPanel = (sx: number, sy: number): boolean => {
		if (!showTreePanel.value || panelCards.length === 0) return false
		return sx >= panelX && sx <= panelX + panelTotalWidth && sy >= panelY && sy <= panelY + panelH
	}

	const getCardIndexAt = (sx: number): number => {
		const cfg = TREE_PANEL_CONFIG
		const relX = sx - panelX - cfg.padding + panelOffsetX
		if (relX < 0) return -1
		return Math.floor(relX / (cfg.cardWidth + cfg.cardGap))
	}

	const isCardLocked = (idx: number): boolean => {
		if (idx < 0 || idx >= panelCards.length) return true
		return !panelCards[idx].unlocked
	}

	const rebuildRenderList = () => {
		treeRenderList.value = treesData.value.map(t => {
			const banners: BannerData[] = (t as any).banners || []
			return buildTreeRenderData(t.pos_x, t.pos_y, t.tree_type, t.level, banners)
		})
	}

	const screenToWorld = (sx: number, sy: number): { x: number; y: number } => {
		return {
			x: sx / camera.value.zoom + camera.value.x,
			y: sy / camera.value.zoom + camera.value.y,
		}
	}

	const worldToScreen = (wx: number, wy: number): { x: number; y: number } => {
		return {
			x: (wx - camera.value.x) * camera.value.zoom,
			y: (wy - camera.value.y) * camera.value.zoom,
		}
	}

	const clampCamera = () => {
		const z = camera.value.zoom
		const viewW = canvasW / z
		const viewH = canvasH / z

		if (viewW >= worldW) {
			camera.value.x = (worldW - viewW) / 2
		} else {
			camera.value.x = Math.max(0, Math.min(worldW - viewW, camera.value.x))
		}

		if (viewH >= worldH) {
			camera.value.y = (worldH - viewH) / 2
		} else {
			camera.value.y = Math.max(0, Math.min(worldH - viewH, camera.value.y))
		}
	}

	const drawPanel = () => {
		if (!ctx || !showTreePanel.value || panelCards.length === 0) return
		const cfg = TREE_PANEL_CONFIG

		ctx.save()
		ctx.fillStyle = cfg.bgColor
		ctx.beginPath()
		ctx.roundRect(panelX, panelY, panelTotalWidth, panelH, cfg.borderRadius)
		ctx.fill()

		for (let i = 0; i < panelCards.length; i++) {
			const card = panelCards[i]
			const x = panelX + cfg.padding + i * (cfg.cardWidth + cfg.cardGap) - panelOffsetX
			const y = panelY + cfg.padding

			if (!card.unlocked) {
				ctx.fillStyle = 'rgba(80,80,80,0.7)'
				ctx.beginPath()
				ctx.roundRect(x, y, cfg.cardWidth, cfg.cardHeight, 8)
				ctx.fill()
				ctx.strokeStyle = 'rgba(255,255,255,0.2)'
				ctx.lineWidth = 1
				ctx.stroke()
			} else {
				ctx.fillStyle = 'rgba(255,255,255,0.9)'
				ctx.beginPath()
				ctx.roundRect(x, y, cfg.cardWidth, cfg.cardHeight, 8)
				ctx.fill()
				ctx.strokeStyle = 'rgba(76,175,80,0.5)'
				ctx.lineWidth = 1.5
				ctx.stroke()
			}

			const iconSize = cfg.iconSize
			const iconX = x + (cfg.cardWidth - iconSize) / 2
			const iconY = y + 5

			if (card.unlocked && card.icon) {
				const img = getImage(card.icon)
				if (img && img.complete && img.naturalWidth > 0) {
					ctx.drawImage(img, iconX, iconY, iconSize, iconSize)
				}
			} else if (card.lockedIcon) {
				ctx.font = `${iconSize * 0.7}px sans-serif`
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				ctx.fillText(card.lockedIcon, x + cfg.cardWidth / 2, iconY + iconSize / 2)
			}

			ctx.font = `bold ${cfg.nameFontSize}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'bottom'
			ctx.fillStyle = card.unlocked ? '#333' : '#aaa'
			const nameY = y + cfg.cardHeight - 2
			ctx.fillText(card.name, x + cfg.cardWidth / 2, nameY)
		}

		ctx.restore()
	}

	const render = () => {
		if (!ctx) return
		const { x: cx, y: cy, zoom } = camera.value

		ctx.clearRect(0, 0, canvasW * dpr, canvasH * dpr)
		drawBackgroundOnCanvas(ctx, cx, cy, zoom, canvasW, canvasH, dpr)

		const sorted = [...treeRenderList.value].sort((a, b) => a.worldY - b.worldY)
		for (const tree of sorted) {
			const selected = treesData.value.find(t => t.pos_x === tree.worldX && t.pos_y === tree.worldY)?.id === selectedTreeId.value
			drawTreeOnCanvas(ctx, tree, cx, cy, zoom, !!selected, dpr)
		}

		if (isDraggingPlant.value && dragPlantTreeType.value) {
			const px = (dragPlantWorldX.value - cx) * zoom * dpr
			const py = (dragPlantWorldY.value - cy) * zoom * dpr

			const tooClose = treeRenderList.value.some(t => {
				const dx = dragPlantWorldX.value - t.worldX
				const dy = dragPlantWorldY.value - t.worldY
				return Math.sqrt(dx * dx + dy * dy) < MIN_TREE_DISTANCE
			})
			dragPlantTooClose.value = tooClose
			dragPlantValid.value = !tooClose

			const treeCfg = TREE_SIZE_CONFIG
			const previewH = canvasH * treeCfg.plantPreviewHeightRatio * dpr
			const imgName = getImgSrc(dragPlantTreeType.value)
			const img = getImage(imgName)
			let drawW = previewH
			let drawH = previewH
			if (img && img.complete && img.naturalWidth > 0) {
				drawH = previewH
				drawW = (img.naturalWidth / img.naturalHeight) * drawH
			}

			const valid = dragPlantValid.value
			const radius = Math.max(drawW, drawH) * 0.6

			ctx.save()
			ctx.setLineDash([5, 5])
			ctx.strokeStyle = valid ? '#4CAF50' : '#f44336'
			ctx.lineWidth = 3 * dpr
			ctx.beginPath()
			ctx.arc(px, py, radius, 0, Math.PI * 2)
			ctx.stroke()
			ctx.setLineDash([])
			ctx.fillStyle = valid ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'
			ctx.beginPath()
			ctx.arc(px, py, radius, 0, Math.PI * 2)
			ctx.fill()

			if (img && img.complete && img.naturalWidth > 0) {
				ctx.globalAlpha = valid ? 0.9 : 0.5
				ctx.drawImage(img, px - drawW / 2, py - drawH, drawW, drawH)
				ctx.globalAlpha = 1
			}

			const worldPos = `(${Math.round(dragPlantWorldX.value)}, ${Math.round(dragPlantWorldY.value)})`
			ctx.font = `bold ${14 * dpr}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'bottom'
			ctx.fillStyle = valid ? '#4CAF50' : '#f44336'
			ctx.fillText(worldPos, px, py - radius - 5 * dpr)
			ctx.fillText(valid ? '✅ 可以种植' : '❌ 距离太近', px, py - radius - 22 * dpr)
			ctx.restore()
		}

		if (isPlantMode.value && plantPosition.value) {
			const px = (plantPosition.value.x - cx) * zoom * dpr
			const py = (plantPosition.value.y - cy) * zoom * dpr
			ctx.save()
			ctx.setLineDash([5, 5])
			ctx.strokeStyle = '#4CAF50'
			ctx.lineWidth = 2 * dpr
			ctx.beginPath()
			ctx.arc(px, py, 25 * zoom * dpr, 0, Math.PI * 2)
			ctx.stroke()
			ctx.setLineDash([])
			ctx.fillStyle = 'rgba(76, 175, 80, 0.3)'
			ctx.beginPath()
			ctx.arc(px, py, 25 * zoom * dpr, 0, Math.PI * 2)
			ctx.fill()
			ctx.restore()
		}

		drawPanel()
	}

	const renderLoop = () => {
		render()
		animFrameId.value = requestAnimationFrame(renderLoop)
	}

	const startRender = () => {
		if (animFrameId.value) cancelAnimationFrame(animFrameId.value)
		renderLoop()
	}

	const stopRender = () => {
		if (animFrameId.value) {
			cancelAnimationFrame(animFrameId.value)
			animFrameId.value = 0
		}
	}

	const getRect = () => {
		const el = containerEl.value
		if (!el) return null
		if (typeof el.getBoundingClientRect === 'function') return el.getBoundingClientRect()
		return { left: 0, top: 0, width: canvasW || 800, height: canvasH || 600 }
	}

	const getRealCanvas = (): HTMLCanvasElement | null => {
		const el = canvasEl.value
		if (!el) return null
		if (typeof el.getContext === 'function') return el
		const container = containerEl.value
		if (container) {
			const list = container.querySelectorAll('canvas')
			for (let i = 0; i < list.length; i++) {
				if (typeof list[i].getContext === 'function') return list[i]
			}
		}
		return null
	}

	const resizeCanvas = () => {
		const realCanvas = getRealCanvas()
		const container = containerEl.value
		if (!realCanvas || !container) return

		const rect = getRect()
		if (!rect) return

		dpr = window.devicePixelRatio || 1
		canvasW = rect.width
		canvasH = rect.height
		realCanvas.width = Math.round(canvasW * dpr)
		realCanvas.height = Math.round(canvasH * dpr)
		realCanvas.style.width = canvasW + 'px'
		realCanvas.style.height = canvasH + 'px'
		calcPanelMetrics()
		clampCamera()
	}

	const initCanvas = () => {
		const realCanvas = getRealCanvas()
		if (!realCanvas) {
			console.error('Canvas 元素未找到')
			return
		}

		ctx = realCanvas.getContext('2d')
		if (!ctx) {
			console.error('Canvas 2D context 获取失败')
			return
		}

		resizeCanvas()

		const bgImg = getImage(`${IMG_BASE}/bg.svg`)
		if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
			worldW = bgImg.naturalWidth
			worldH = bgImg.naturalHeight
		}

		const initialZoom = calculateInitialZoom(canvasW, canvasH)
		camera.value.zoom = Math.min(initialZoom, MAX_ZOOM)
		camera.value.x = (worldW - canvasW / camera.value.zoom) / 2
		camera.value.y = (worldH - canvasH / camera.value.zoom) / 2

		updatePanelCards()
		clampCamera()
		rebuildRenderList()
		startRender()

		if (!wheelBound) {
			const container = containerEl.value
			if (container) {
				container.addEventListener('wheel', onWheel, { passive: false })
				wheelBound = true
			}
		}
	}

	const onMouseDown = (e: MouseEvent) => {
		if (isDraggingPlant.value) return
		const rect = getRect()
		if (!rect) return
		const sx = e.clientX - rect.left
		const sy = e.clientY - rect.top

		if (showTreePanel.value && isOnPanel(sx, sy)) {
			const idx = getCardIndexAt(sx)
			if (idx >= 0 && !isCardLocked(idx)) {
				startDragPlant(panelCards[idx].type)
			}
			panelDragging = true
			panelDragStartX = sx
			panelDragStartOffset = panelOffsetX
			return
		}

		isDragging.value = true
		hasDragged = false
		dragStartX = e.clientX
		dragStartY = e.clientY
		cameraStartX = camera.value.x
		cameraStartY = camera.value.y
	}

	const onMouseMove = (e: MouseEvent) => {
		if (isDraggingPlant.value) {
			const rect = getRect()
			if (!rect) return
			const sx = e.clientX - rect.left
			const sy = e.clientY - rect.top
			if (isOnPanel(sx, sy)) return
			const world = screenToWorld(sx, sy)
			dragPlantWorldX.value = world.x
			dragPlantWorldY.value = world.y
			dragPlantScreenX.value = sx
			dragPlantScreenY.value = sy
			return
		}
		if (panelDragging) {
			const rect = getRect()
			if (!rect) return
			const sx = e.clientX - rect.left
			const maxOffset = Math.max(0, panelTotalWidth - canvasW)
			panelOffsetX = Math.max(0, Math.min(maxOffset, panelDragStartOffset + (panelDragStartX - sx)))
			return
		}
		if (!isDragging.value) return
		const dx = e.clientX - dragStartX
		const dy = e.clientY - dragStartY
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true
		camera.value.x = cameraStartX - dx / camera.value.zoom
		camera.value.y = cameraStartY - dy / camera.value.zoom
		clampCamera()
	}

	const onMouseUp = (e: MouseEvent) => {
		if (panelDragging) {
			const rect = getRect()
			if (rect) {
				const sx = e.clientX - rect.left
				const sy = e.clientY - rect.top
				if (isOnPanel(sx, sy) && !isDraggingPlant.value) {
					const idx = getCardIndexAt(sx)
					if (idx >= 0 && !isCardLocked(idx)) {
						startDragPlant(panelCards[idx].type)
					}
				}
			}
			panelDragging = false
		}
		isDragging.value = false
	}

	const onWheel = (e: WheelEvent) => {
		e.preventDefault()
		e.stopPropagation()
		const rect = getRect()
		if (!rect) return

		const mouseX = e.clientX - rect.left
		const mouseY = e.clientY - rect.top
		const worldBefore = screenToWorld(mouseX, mouseY)

		const factor = e.deltaY > 0 ? 0.9 : 1.1
		const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.value.zoom * factor))
		camera.value.zoom = newZoom

		const worldAfter = screenToWorld(mouseX, mouseY)
		camera.value.x += worldBefore.x - worldAfter.x
		camera.value.y += worldBefore.y - worldAfter.y
		clampCamera()
	}

	const onCanvasClick = (e: MouseEvent): { type: 'tree' | 'ground' | 'none'; treeId?: number; worldX?: number; worldY?: number } => {
		if (hasDragged) return { type: 'none' }
		const rect = getRect()
		if (!rect) return { type: 'none' }
		const sx = e.clientX - rect.left
		const sy = e.clientY - rect.top
		const world = screenToWorld(sx, sy)

		if (isPlantMode.value) {
			const tooClose = treeRenderList.value.some(t => {
				const dx = world.x - t.worldX
				const dy = world.y - t.worldY
				return Math.sqrt(dx * dx + dy * dy) < MIN_TREE_DISTANCE
			})
			if (tooClose) return { type: 'none' }
			plantPosition.value = { x: Math.round(world.x), y: Math.round(world.y) }
			return { type: 'ground', worldX: Math.round(world.x), worldY: Math.round(world.y) }
		}

		for (let i = treeRenderList.value.length - 1; i >= 0; i--) {
			const tree = treeRenderList.value[i]
			if (isPointNearTree(world.x, world.y, tree)) {
				const found = treesData.value.find(t => t.pos_x === tree.worldX && t.pos_y === tree.worldY)
				if (found) return { type: 'tree', treeId: found.id }
			}
		}

		return { type: 'ground', worldX: Math.round(world.x), worldY: Math.round(world.y) }
	}

	const onTouchStart = (e: TouchEvent) => {
		if (e.touches.length === 1) {
			isDragging.value = true
			hasDragged = false
			dragStartX = e.touches[0].clientX
			dragStartY = e.touches[0].clientY
			cameraStartX = camera.value.x
			cameraStartY = camera.value.y
		}
	}

	const onTouchMove = (e: TouchEvent) => {
		if (!isDragging.value || e.touches.length !== 1) return
		e.preventDefault()
		const dx = e.touches[0].clientX - dragStartX
		const dy = e.touches[0].clientY - dragStartY
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true
		camera.value.x = cameraStartX - dx / camera.value.zoom
		camera.value.y = cameraStartY - dy / camera.value.zoom
		clampCamera()
	}

	const onTouchEnd = () => {
		isDragging.value = false
	}

	const startDragPlant = (treeType: string) => {
		isDraggingPlant.value = true
		dragPlantTreeType.value = treeType
		dragPlantValid.value = true
		dragPlantTooClose.value = false
	}

	const cancelDragPlant = () => {
		isDraggingPlant.value = false
		dragPlantTreeType.value = ''
		plantPreviewBounced.value = false
	}

	const confirmPlantAt = (wx: number, wy: number) => {
		cancelDragPlant()
		return { worldX: Math.round(wx), worldY: Math.round(wy) }
	}

	const centerOnTree = (treeId: number) => {
		const found = treesData.value.find(t => t.id === treeId)
		if (!found) return
		camera.value.x = found.pos_x - canvasW / (2 * camera.value.zoom)
		camera.value.y = found.pos_y - canvasH / (2 * camera.value.zoom)
		clampCamera()
	}

	const refreshPanel = () => {
		updatePanelCards()
	}

	onUnmounted(() => {
		stopRender()
		if (wheelBound) {
			const container = containerEl.value
			if (container) {
				container.removeEventListener('wheel', onWheel)
				wheelBound = false
			}
		}
	})

	return {
		camera,
		canvasEl,
		containerEl,
		isDragging,
		isPlantMode,
		plantPosition,
		treeRenderList,
		dragPlantTreeType,
		dragPlantScreenX,
		dragPlantScreenY,
		dragPlantWorldX,
		dragPlantWorldY,
		dragPlantValid,
		dragPlantTooClose,
		isDraggingPlant,
		plantPreviewBounced,
		showTreePanel,
		panelCards,
		initCanvas,
		resizeCanvas,
		startRender,
		stopRender,
		rebuildRenderList,
		refreshPanel,
		screenToWorld,
		onMouseDown,
		onMouseMove,
		onMouseUp,
		onWheel,
		onCanvasClick,
		onTouchStart,
		onTouchMove,
		onTouchEnd,
		startDragPlant,
		cancelDragPlant,
		confirmPlantAt,
		centerOnTree,
	}
}
