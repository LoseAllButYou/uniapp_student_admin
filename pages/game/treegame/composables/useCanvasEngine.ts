import { ref, Ref, onUnmounted } from 'vue'
import { Camera, TreeData, TreeRenderData, WORLD_WIDTH, WORLD_HEIGHT, MIN_ZOOM, MAX_ZOOM, MIN_TREE_DISTANCE, BannerData, TreeConfig } from '../scripts/types'
import { buildTreeRenderData, drawBackgroundOnCanvas, drawTreeOnCanvas, isPointNearTree, getImage, getImgSrc, calculateInitialZoom, IMG_BASE, MIN_TREE_DISTANCE_X, drawGroupContributionPanel, GroupContribution, updateWindTime, getWindTime, drawBanners } from '../scripts/treeResources'
import { TREE_PANEL_CONFIG, TREE_SIZE_CONFIG } from '../scripts/resourceConfig'

// 条幅面板配置
const BANNER_PANEL_CONFIG = {
	bgColor: 'rgba(0,0,0,0.7)',
	borderRadius: 12,
	padding: 10,
	cardWidth: 70,
	cardHeight: 90,
	cardGap: 10,
	panelWidth: 90,
}

// 条幅颜色配置
const BANNER_COLORS: Record<string, { color: string; name: string }> = {
	red: { color: '#FF6B6B', name: '红色' },
	orange: { color: '#FFA500', name: '橙色' },
	yellow: { color: '#FFD93D', name: '黄色' },
	green: { color: '#6BCB77', name: '绿色' },
	blue: { color: '#4D96FF', name: '蓝色' },
	purple: { color: '#9B59B6', name: '紫色' },
	pink: { color: '#FF69B4', name: '粉色' },
}

export interface BannerDragData {
	color: string
	content: string
	worldX: number
	worldY: number
	screenX: number
	screenY: number
}

export function useCanvasEngine(
	treesData: Ref<TreeData[]>,
	selectedTreeId: Ref<number | null>,
	treeConfigs: Ref<TreeConfig[]>,
	independentBanners?: Ref<BannerData[]>
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

	// 条幅选择面板相关
	const showBannerPanel = ref(true) // 默认显示条幅面板
	const isDraggingBanner = ref(false)
	const dragBannerData = ref<BannerDragData | null>(null)
	const bannerPanelCollapsed = ref(true) // 默认收起
	const selectedBannerColor = ref<string | null>(null) // 选中的条幅颜色
	const isBannerPlacing = ref(false) // 是否正在选择条幅位置

	const showTreePanel = ref(true)
	const showGroupPanel = ref(true)
	const groupContributions = ref<GroupContribution[]>([])
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
				lockedIcon: unlocked ? '' : '',
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

	// 绘制条幅选择面板（顶部居中，从上而下布局）
	const drawBannerPanel = () => {
		if (!ctx || !showBannerPanel.value) return
		const cfg = BANNER_PANEL_CONFIG
		const colors = Object.keys(BANNER_COLORS)

		// 从上而下布局
		const panelWidth = colors.length * 55 * dpr + 20 * dpr
		const panelHeight = bannerPanelCollapsed.value ? 40 * dpr : 100 * dpr
		const panelX = (canvasW * dpr - panelWidth) / 2
		const panelY = 10 * dpr

		ctx.save()

		// 绘制面板背景
		ctx.fillStyle = cfg.bgColor
		ctx.beginPath()
		ctx.roundRect(panelX, panelY, panelWidth, panelHeight, cfg.borderRadius * dpr)
		ctx.fill()

		// 绘制标题栏
		ctx.fillStyle = '#fff'
		ctx.font = `bold ${12 * dpr}px sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'top'
		ctx.fillText('🎌 条幅', panelX + panelWidth / 2, panelY + 8 * dpr)

		// 展开时显示颜色选项（从左到右排列）
		if (!bannerPanelCollapsed.value) {
			const startX = panelX + 15 * dpr
			const startY = panelY + 35 * dpr
			const cardW = 45 * dpr
			const cardH = 50 * dpr
			const gap = 10 * dpr

			colors.forEach((key, index) => {
				const x = startX + index * (cardW + gap)
				const colorInfo = BANNER_COLORS[key]

				// 高亮选中的颜色
				if (selectedBannerColor.value === key) {
					ctx.strokeStyle = '#fff'
					ctx.lineWidth = 3 * dpr
					ctx.beginPath()
					ctx.roundRect(x - 2 * dpr, startY - 2 * dpr, cardW + 4 * dpr, cardH + 4 * dpr, 8 * dpr)
					ctx.stroke()
				}

				// 绘制条幅预览
				ctx.fillStyle = colorInfo.color
				ctx.beginPath()
				ctx.roundRect(x, startY, cardW, cardH, 6 * dpr)
				ctx.fill()

				// 绘制颜色名称
				ctx.fillStyle = '#fff'
				ctx.font = `bold ${11 * dpr}px sans-serif`
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				ctx.fillText(colorInfo.name, x + cardW / 2, startY + cardH / 2)
			})
		}

		// 收缩/展开按钮
		ctx.fillStyle = '#fff'
		ctx.font = `${12 * dpr}px sans-serif`
		ctx.textAlign = 'right'
		ctx.fillText(bannerPanelCollapsed.value ? '▼' : '▲', panelX + panelWidth - 10 * dpr, panelY + 10 * dpr)

		ctx.restore()
	}

	// 检测点击是否在条幅面板上
	const isOnBannerPanel = (sx: number, sy: number): boolean => {
		if (!showBannerPanel.value) return false
		const colors = Object.keys(BANNER_COLORS)
		const panelWidth = colors.length * 55 + 20
		const panelHeight = bannerPanelCollapsed.value ? 40 : 100
		const panelX = (canvasW - panelWidth) / 2
		const panelY = 10

		return sx >= panelX && sx <= panelX + panelWidth &&
			sy >= panelY && sy <= panelY + panelHeight
	}

	// 获取条幅面板上点击的颜色
	const getBannerColorAt = (sx: number, sy: number): string | null => {
		if (!showBannerPanel.value || bannerPanelCollapsed.value) return null
		const colors = Object.keys(BANNER_COLORS)
		const panelWidth = colors.length * 55 + 20
		const panelX = (canvasW - panelWidth) / 2
		const panelY = 10
		const startX = panelX + 15
		const startY = panelY + 35
		const cardW = 45
		const cardH = 50
		const gap = 10

		for (let i = 0; i < colors.length; i++) {
			const x = startX + i * (cardW + gap)
			if (sx >= x && sx <= x + cardW && sy >= startY && sy <= startY + cardH) {
				return colors[i]
			}
		}
		return null
	}

	// 开始拖拽条幅
	const startDragBanner = (color: string) => {
		isDraggingBanner.value = true
		dragBannerData.value = {
			color,
			content: '',
			worldX: 0,
			worldY: 0,
			screenX: 0,
			screenY: 0,
		}
	}

	// 取消拖拽条幅
	const cancelDragBanner = () => {
		isDraggingBanner.value = false
		dragBannerData.value = null
	}

	// 绘制拖拽中的条幅预览
	const drawDragBannerPreview = () => {
		if (!ctx || !isDraggingBanner.value || !dragBannerData.value) return

		const { screenX, screenY, color } = dragBannerData.value
		const colorInfo = BANNER_COLORS[color] || BANNER_COLORS.red

		ctx.save()
		ctx.translate(screenX * dpr, screenY * dpr)

		// 绘制条幅形状
		const bannerWidth = 80 * dpr
		const bannerHeight = 35 * dpr
		ctx.fillStyle = colorInfo.color
		ctx.globalAlpha = 0.8
		ctx.beginPath()
		ctx.moveTo(-bannerWidth / 2, 0)
		ctx.lineTo(bannerWidth / 2, 0)
		ctx.lineTo(bannerWidth / 2, bannerHeight)
		ctx.lineTo(0, bannerHeight + 10 * dpr)
		ctx.lineTo(-bannerWidth / 2, bannerHeight)
		ctx.closePath()
		ctx.fill()

		// 提示文字
		ctx.globalAlpha = 1
		ctx.fillStyle = '#fff'
		ctx.font = `bold ${12 * dpr}px sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText('松开放置', 0, bannerHeight / 2)

		ctx.restore()
	}

	const render = () => {
		if (!ctx) return
		const { x: cx, y: cy, zoom } = camera.value

		// 更新随风摇摆时间
		updateWindTime(0.016) // 约60fps
		const windOffset = Math.sin(getWindTime() * 0.5) * 0.5 // -0.5 到 0.5 的摇摆

		ctx.clearRect(0, 0, canvasW * dpr, canvasH * dpr)
		drawBackgroundOnCanvas(ctx, cx, cy, zoom, canvasW, canvasH, dpr)

		const sorted = [...treeRenderList.value].sort((a, b) => a.worldY - b.worldY)
		for (const tree of sorted) {
			const selected = treesData.value.find(t => t.pos_x === tree.worldX && t.pos_y === tree.worldY)?.id === selectedTreeId.value
			// 传入windOffset实现随风摇摆效果
			drawTreeOnCanvas(ctx, tree, cx, cy, zoom, !!selected, dpr, windOffset)
		}

		// 绘制小组贡献榜（在最上层，树木之后绘制）
		console.log('render check - showGroupPanel:', showGroupPanel.value, 'contributions:', groupContributions.value.length)
		if (showGroupPanel.value && groupContributions.value.length > 0) {
			drawGroupContributionPanel(ctx, groupContributions.value, canvasW * dpr, canvasH * dpr, dpr)
		}

		// 绘制独立条幅（tree_id为0的条幅）
		if (independentBanners && independentBanners.value && independentBanners.value.length > 0) {
			drawBanners(ctx, independentBanners.value, 0, 0, cx, cy, zoom, dpr)
		}

		// 绘制条幅选择面板（右侧）
		drawBannerPanel()

		// 绘制拖拽中的条幅预览
		drawDragBannerPreview()

		if (isDraggingPlant.value && dragPlantTreeType.value) {
			const px = (dragPlantWorldX.value - cx) * zoom * dpr
			const py = (dragPlantWorldY.value - cy) * zoom * dpr

			// 使用X轴距离检测（350px）
			const tooClose = treeRenderList.value.some(t => {
				const dx = Math.abs(dragPlantWorldX.value - t.worldX)
				return dx < MIN_TREE_DISTANCE_X
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

	// 获取条幅位置（返回屏幕坐标和世界坐标）
	const getBannerClickPos = (e: MouseEvent): { sx: number; sy: number; wx: number; wy: number } | null => {
		const rect = getRect()
		if (!rect) return null

		const sx = e.clientX - rect.left
		const sy = e.clientY - rect.top

		const world = screenToWorld(sx, sy)
		return { sx, sy, wx: world.x, wy: world.y }
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

		const bgImg = getImage(`${IMG_BASE}/bg.png`)
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

		// 检测条幅面板点击
		if (showBannerPanel.value && isOnBannerPanel(sx, sy)) {
			const colors = Object.keys(BANNER_COLORS)
			const panelWidth = colors.length * 55 + 20
			const panelX = (canvasW - panelWidth) / 2
			const panelY = 10

			// 点击展开/收起按钮（右上角区域）
			if (sx >= panelX + panelWidth - 30 && sx <= panelX + panelWidth && sy >= panelY && sy <= panelY + 25) {
				bannerPanelCollapsed.value = !bannerPanelCollapsed.value
				return
			}

			// 点击颜色卡片，选中颜色（不立即拖拽）
			const color = getBannerColorAt(sx, sy)
			if (color) {
				selectedBannerColor.value = color
				isBannerPlacing.value = true
			}
			return
		}

		// 如果正在选择条幅位置，点击画面位置时触发确认
		if (isBannerPlacing.value && selectedBannerColor.value) {
			// 这里不处理，让 onCanvasClick 处理
		}

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
		// 条幅拖拽
		if (isDraggingBanner.value && dragBannerData.value) {
			const rect = getRect()
			if (!rect) return
			const sx = e.clientX - rect.left
			const sy = e.clientY - rect.top
			const world = screenToWorld(sx, sy)
			dragBannerData.value.screenX = sx
			dragBannerData.value.screenY = sy
			dragBannerData.value.worldX = world.x
			dragBannerData.value.worldY = world.y
			return
		}

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
		// 条幅拖拽结束 - 不在这里处理，让外部组件处理
		// 通过 confirmBannerPlacement 或 cancelDragBanner 来处理

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

	// 确认条幅放置（返回世界坐标和颜色）
	const confirmBannerPlacement = (): { x: number; y: number; color: string } | null => {
		if (!isDraggingBanner.value || !dragBannerData.value) return null
		const result = {
			x: Math.round(dragBannerData.value.worldX),
			y: Math.round(dragBannerData.value.worldY),
			color: dragBannerData.value.color,
		}
		isDraggingBanner.value = false
		dragBannerData.value = null
		return result
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

	const onCanvasClick = (e: MouseEvent): { type: 'tree' | 'ground' | 'banner' | 'none'; treeId?: number; worldX?: number; worldY?: number; bannerColor?: string } => {
		if (hasDragged) return { type: 'none' }
		const rect = getRect()
		if (!rect) return { type: 'none' }
		const sx = e.clientX - rect.left
		const sy = e.clientY - rect.top

		// 如果在条幅面板上点击，不处理
		if (isOnBannerPanel(sx, sy)) return { type: 'none' }

		const world = screenToWorld(sx, sy)

		// 如果正在选择条幅位置，返回条幅放置信息
		if (isBannerPlacing.value && selectedBannerColor.value) {
			const color = selectedBannerColor.value
			// 重置状态
			isBannerPlacing.value = false
			return { type: 'banner', worldX: Math.round(world.x), worldY: Math.round(world.y), bannerColor: color }
		}

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

	// 设置小组贡献榜数据
	const setGroupContributions = (data: GroupContribution[]) => {
		console.log('setGroupContributions called with:', data.length, 'items')
		groupContributions.value = data
		console.log('groupContributions.value updated:', groupContributions.value.length, 'items')
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
		showGroupPanel,
		groupContributions,
		panelCards,
		// 条幅相关
		showBannerPanel,
		bannerPanelCollapsed,
		isDraggingBanner,
		dragBannerData,
		selectedBannerColor,
		isBannerPlacing,
		startDragBanner,
		cancelDragBanner,
		confirmBannerPlacement,
		initCanvas,
		resizeCanvas,
		startRender,
		stopRender,
		rebuildRenderList,
		refreshPanel,
		setGroupContributions,
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
