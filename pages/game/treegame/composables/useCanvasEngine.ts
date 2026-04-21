import { ref, Ref, onUnmounted } from 'vue'
import { Camera, TreeData, TreeRenderData, WORLD_WIDTH, WORLD_HEIGHT, MIN_ZOOM, MAX_ZOOM, MIN_TREE_DISTANCE, BannerData, TreeConfig } from '../scripts/types'
import { buildTreeRenderData, drawBackgroundOnCanvas, drawTreeOnCanvas, isPointNearTree, getImage, getImgSrc, calculateInitialZoom, IMG_BASE, MIN_TREE_DISTANCE_X, drawGroupContributionPanel, GroupContribution, updateWindTime, getWindTime, drawBanners, BG_CONFIG, startBannerAnimation, stopBannerAnimation } from '../scripts/treeResources'
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
	const bannerPreviewX = ref(0) // 条幅预览X坐标
	const bannerPreviewY = ref(0) // 条幅预览Y坐标

	const showTreePanel = ref(true)
	const showGroupPanel = ref(true)
	const groupPanelCollapsed = ref(false)
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
	let dynamicMinZoom = 0.5

	// 限制相机位置在边界内
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
		// 获取每种树的最大等级和数量
		const treeStatsByType: Record<string, { maxLevel: number; count: number }> = {}
		for (const t of treesData.value) {
			if (!treeStatsByType[t.tree_type]) {
				treeStatsByType[t.tree_type] = { maxLevel: 0, count: 0 }
			}
			treeStatsByType[t.tree_type].maxLevel = Math.max(treeStatsByType[t.tree_type].maxLevel, t.level)
			treeStatsByType[t.tree_type].count++
		}

		// 按sort_order排序配置
		const sortedConfigs = [...treeConfigs.value].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

		// 获取所有树种的最大等级上限（从等级配置表获取最高等级）
		const maxLevelLimit = 10 // 默认最高10级，可从treeConfigs的max_level字段获取

		panelCards.length = 0
		for (let i = 0; i < sortedConfigs.length; i++) {
			const tc = sortedConfigs[i]
			const treeType = tc.tree_type || tc.tree_type
			const stats = treeStatsByType[treeType] || { maxLevel: 0, count: 0 }

			let unlocked = false
			let hint = ''

			if (i === 0) {
				// 第一棵树（sort_order=1）：初始解锁
				unlocked = true
				hint = tc.description || '可种植'
			} else {
				// 后续树：解析unlock_condition
				const condition = tc.unlock_condition || ''
				// 匹配 "满级X棵树后解锁" 或 "满级X棵"
				const match = condition.match(/满级(\d+)棵/)
				if (match) {
					const requiredCount = parseInt(match[1])
					// 计算已满级的树数量（所有树种中达到最高等级的树）
					let maxLevelTreesCount = 0
					for (const st of sortedConfigs) {
						const stStats = treeStatsByType[st.tree_type] || { maxLevel: 0, count: 0 }
						if (stStats.maxLevel >= maxLevelLimit) {
							maxLevelTreesCount++
						}
					}
					if (maxLevelTreesCount >= requiredCount) {
						unlocked = true
						hint = tc.description || '已解锁'
					} else {
						hint = `需要${requiredCount}棵树满级（当前${maxLevelTreesCount}棵满级）`
					}
				} else {
					// 其他解锁条件，默认检查上一棵树是否满级
					const prevConfig = sortedConfigs[i - 1]
					if (prevConfig) {
						const prevStats = treeStatsByType[prevConfig.tree_type] || { maxLevel: 0, count: 0 }
						if (prevStats.maxLevel >= maxLevelLimit) {
							unlocked = true
							hint = tc.description || '已解锁'
						} else {
							hint = `需要"${prevConfig.tree_name}"满级（当前${prevStats.maxLevel}级）`
						}
					}
				}
			}

			const icon = getImage(getImgSrc(tc.tree_type))
			panelCards.push({
				type: tc.tree_type,
				name: tc.tree_name,
				unlocked,
				hint: unlocked ? (tc.description || '可种植') : hint,
				icon: icon && icon.complete ? getImgSrc(tc.tree_type) : '',
				lockedIcon: '🔒',
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
				// 锁定状态：淡灰色半透明背景，能看到树的样子
				ctx.fillStyle = 'rgba(200, 200, 200, 0.3)'
				ctx.beginPath()
				ctx.roundRect(x, y, cfg.cardWidth, cfg.cardHeight, 8)
				ctx.fill()
				ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)'
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
			} else if (!card.unlocked && card.icon) {
				// 锁定状态：显示淡化后的树图片
				const img = getImage(card.icon)
				if (img && img.complete && img.naturalWidth > 0) {
					ctx.globalAlpha = 0.4
					ctx.drawImage(img, iconX, iconY, iconSize, iconSize)
					ctx.globalAlpha = 1
					// 右上角小锁图标
					ctx.font = `${14 * dpr}px sans-serif`
					ctx.textAlign = 'center'
					ctx.textBaseline = 'middle'
					ctx.fillText('🔒', x + cfg.cardWidth - 12, y + 12)
				}
			}

			ctx.font = `bold ${cfg.nameFontSize}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'bottom'
			ctx.fillStyle = card.unlocked ? '#333' : '#888'
			const nameY = y + cfg.cardHeight - 2
			ctx.fillText(card.name, x + cfg.cardWidth / 2, nameY)
		}

		ctx.restore()
	}

	// 绘制条幅选择面板（右侧垂直居中）
	const drawBannerPanel = () => {
		if (!ctx || !showBannerPanel.value) return
		const cfg = BANNER_PANEL_CONFIG
		const colors = Object.keys(BANNER_COLORS)

		// 右侧垂直居中布局
		const panelWidth = bannerPanelCollapsed.value ? 50 * dpr : 70 * dpr
		const panelHeight = colors.length * 45 * dpr + 50 * dpr
		const panelX = canvasW * dpr - panelWidth - 10 * dpr
		const panelY = (canvasH * dpr - panelHeight) / 2

		ctx.save()

		// 绘制面板背景
		ctx.fillStyle = cfg.bgColor
		ctx.beginPath()
		ctx.roundRect(panelX, panelY, panelWidth, panelHeight, cfg.borderRadius * dpr)
		ctx.fill()

		// 绘制标题栏
		if (bannerPanelCollapsed.value) {
			ctx.fillStyle = '#FFD700'
			ctx.font = `bold ${16 * dpr}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			const centerX = panelX + panelWidth / 2
			const centerStartY = panelY + panelHeight * 0.2
			const charSpacing = 20 * dpr
			for (let i = 0; i < '添加条幅'.length; i++) {
				ctx.fillText('添加条幅'[i], centerX, centerStartY + i * charSpacing)
			}
		} else {
			ctx.fillStyle = '#fff'
			ctx.font = `bold ${12 * dpr}px sans-serif`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'top'
			ctx.fillText('🎌', panelX + panelWidth / 2, panelY + 8 * dpr)
			ctx.font = `${10 * dpr}px sans-serif`
			ctx.fillText('条幅', panelX + panelWidth / 2, panelY + 24 * dpr)
		}

		// 展开时显示颜色选项（从上到下排列）
		if (!bannerPanelCollapsed.value) {
			const startX = panelX + 10 * dpr
			const startY = panelY + 45 * dpr
			const cardW = 50 * dpr
			const cardH = 35 * dpr
			const gap = 10 * dpr

			colors.forEach((key, index) => {
				const y = startY + index * (cardH + gap)
				const colorInfo = BANNER_COLORS[key]

				// 高亮选中的颜色
				if (selectedBannerColor.value === key) {
					ctx.strokeStyle = '#fff'
					ctx.lineWidth = 3 * dpr
					ctx.beginPath()
					ctx.roundRect(startX - 2 * dpr, y - 2 * dpr, cardW + 4 * dpr, cardH + 4 * dpr, 8 * dpr)
					ctx.stroke()
				}

				// 绘制条幅预览
				ctx.fillStyle = colorInfo.color
				ctx.beginPath()
				ctx.roundRect(startX, y, cardW, cardH, 6 * dpr)
				ctx.fill()

				// 绘制颜色名称
				ctx.fillStyle = '#fff'
				ctx.font = `bold ${11 * dpr}px sans-serif`
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				ctx.fillText(colorInfo.name, startX + cardW / 2, y + cardH / 2)
			})

			// 收缩/展开按钮
			ctx.fillStyle = '#fff'
			ctx.font = `${12 * dpr}px sans-serif`
			ctx.textAlign = 'center'
			ctx.fillText('▶', panelX + panelWidth / 2, panelY + panelHeight - 15 * dpr)
		} else {
			// 收缩状态下的展开按钮
			ctx.fillStyle = '#fff'
			ctx.font = `${14 * dpr}px sans-serif`
			ctx.textAlign = 'center'
			ctx.fillText('◀', panelX + panelWidth / 2, panelY + panelHeight - 15 * dpr)
		}

		ctx.restore()
	}

	// 检测点击是否在条幅面板上
	const isOnBannerPanel = (sx: number, sy: number): boolean => {
		if (!showBannerPanel.value) return false
		const colors = Object.keys(BANNER_COLORS)
		const panelWidth = bannerPanelCollapsed.value ? 50 : 70
		const panelHeight = colors.length * 45 + 50
		const panelX = canvasW - panelWidth - 10
		const panelY = (canvasH - panelHeight) / 2

		return sx >= panelX && sx <= panelX + panelWidth &&
			sy >= panelY && sy <= panelY + panelHeight
	}

	// 检测点击是否在小组贡献榜面板上
	const isOnGroupPanel = (sx: number, sy: number): boolean => {
		if (!showGroupPanel.value) return false
		const rowHeight = 45
		if (groupPanelCollapsed.value) {
			const panelWidth = 50
			const panelHeight = 180
			const panelX = 10
			const panelY = (canvasH - panelHeight) / 2
			return sx >= panelX && sx <= panelX + panelWidth && sy >= panelY && sy <= panelY + panelHeight
		} else {
			const panelWidth = 200
			const panelHeight = Math.min(groupContributions.value.length * rowHeight + 60, 500)
			const panelX = 10
			const panelY = (canvasH - panelHeight) / 2
			return sx >= panelX && sx <= panelX + panelWidth && sy >= panelY && sy <= panelY + panelHeight
		}
	}

	// 获取条幅面板上点击的颜色
	const getBannerColorAt = (sx: number, sy: number): string | null => {
		if (!showBannerPanel.value || bannerPanelCollapsed.value) return null
		const colors = Object.keys(BANNER_COLORS)
		const panelWidth = 70
		const panelHeight = colors.length * 45 + 50
		const panelX = canvasW - panelWidth - 10
		const panelY = (canvasH - panelHeight) / 2
		const startX = panelX + 10
		const startY = panelY + 45
		const cardW = 50
		const cardH = 35
		const gap = 10

		for (let i = 0; i < colors.length; i++) {
			const y = startY + i * (cardH + gap)
			if (sx >= startX && sx <= startX + cardW && sy >= y && sy <= y + cardH) {
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

	// 绘制条幅放置预览（像种树一样）
	const drawBannerPreview = () => {
		if (!ctx || !isBannerPlacing.value || !selectedBannerColor.value) return

		const { x: cx, y: cy, zoom } = camera.value
		const px = (bannerPreviewX.value - cx) * zoom * dpr
		const py = (bannerPreviewY.value - cy) * zoom * dpr
		const colorInfo = BANNER_COLORS[selectedBannerColor.value] || BANNER_COLORS.red

		ctx.save()

		// 绘制圆形指示器
		const radius = 60 * dpr
		ctx.setLineDash([5, 5])
		ctx.strokeStyle = '#fff'
		ctx.lineWidth = 2 * dpr
		ctx.beginPath()
		ctx.arc(px, py, radius, 0, Math.PI * 2)
		ctx.stroke()
		ctx.setLineDash([])
		ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
		ctx.beginPath()
		ctx.arc(px, py, radius, 0, Math.PI * 2)
		ctx.fill()

		// 绘制条幅预览
		ctx.translate(px, py)
		const bannerWidth = 60 * dpr
		const bannerHeight = 160 * dpr
		ctx.fillStyle = colorInfo.color
		ctx.globalAlpha = 0.8
		ctx.beginPath()
		ctx.moveTo(-bannerWidth / 2, 0)
		ctx.lineTo(bannerWidth / 2, 0)
		ctx.lineTo(bannerWidth / 2, bannerHeight)
		ctx.lineTo(0, bannerHeight + 20 * dpr)
		ctx.lineTo(-bannerWidth / 2, bannerHeight)
		ctx.closePath()
		ctx.fill()

		// 提示文字
		ctx.globalAlpha = 1
		ctx.fillStyle = '#fff'
		ctx.font = `bold ${14 * dpr}px sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText('点击放置', 0, bannerHeight / 2)

		ctx.restore()
	}

	const render = () => {
		if (!ctx) return
		const { x: cx, y: cy, zoom } = camera.value

		// 更新随风摇摆时间
		updateWindTime(0.016) // 约60fps
		const windOffset = Math.sin(getWindTime() * 0.5) * 0.5 // -0.5 到 0.5 的摇摆

		ctx.clearRect(0, 0, canvasW * dpr, canvasH * dpr)

		// 应用视口变换：平移 + 缩放
		ctx.save()
		ctx.translate(-camera.value.x * zoom, -camera.value.y * zoom)
		ctx.scale(zoom, zoom)

		// 绘制背景（在世界坐标中，4000x2500）
		drawBackgroundOnCanvas(ctx, canvasW, canvasH, dpr)

		// 树木绘制（在世界坐标中）
		const sorted = [...treeRenderList.value].sort((a, b) => a.worldY - b.worldY)
		for (const tree of sorted) {
			const selected = treesData.value.find(t => t.pos_x === tree.worldX && t.pos_y === tree.worldY)?.id === selectedTreeId.value
			// 传入windOffset实现随风摇摆效果，树木位置直接在世界坐标中绘制
			drawTreeOnCanvas(ctx, tree, !!selected, dpr, windOffset)
		}

		// 绘制独立条幅（在世界坐标中）
		if (independentBanners && independentBanners.value && independentBanners.value.length > 0) {
			drawBanners(ctx, independentBanners.value, 0, 0, dpr)
		}

		// 植物预览（在世界坐标中转换到屏幕坐标）
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

		// 恢复变换，准备绘制UI元素
		ctx.restore()

		// 绘制小组贡献榜（在屏幕坐标中）
		console.log('render check - showGroupPanel:', showGroupPanel.value, 'contributions:', groupContributions.value.length)
		if (showGroupPanel.value && groupContributions.value.length > 0) {
			drawGroupContributionPanel(ctx, groupContributions.value, canvasW * dpr, canvasH * dpr, dpr, groupPanelCollapsed.value)
		}

		// 绘制条幅选择面板（右侧，屏幕坐标）
		drawBannerPanel()

		// 绘制条幅放置预览（屏幕坐标）
		drawBannerPreview()

		drawPanel()
	}

	const renderLoop = () => {
		render()
		setTimeout(() => {
			animFrameId.value = requestAnimationFrame(renderLoop)
		}, 66)
	}

	const startRender = () => {
		if (animFrameId.value) cancelAnimationFrame(animFrameId.value)
		startBannerAnimation()
		renderLoop()
	}

	const stopRender = () => {
		if (animFrameId.value) {
			cancelAnimationFrame(animFrameId.value)
			animFrameId.value = 0
		}
		stopBannerAnimation()
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

		worldW = BG_CONFIG.worldWidth
		worldH = BG_CONFIG.worldHeight

		// 最小缩放比例固定为50%
		dynamicMinZoom = 0.5

		const initialZoom = calculateInitialZoom(canvasW, canvasH)
		camera.value.zoom = Math.min(initialZoom, MAX_ZOOM)

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
			const panelWidth = bannerPanelCollapsed.value ? 50 : 70
			const panelHeight = colors.length * 45 + 50
			const panelX = canvasW - panelWidth - 10
			const panelY = (canvasH - panelHeight) / 2

			if (!bannerPanelCollapsed.value) {
				if (sy >= panelY + panelHeight - 25 && sy <= panelY + panelHeight) {
					bannerPanelCollapsed.value = !bannerPanelCollapsed.value
					return
				}
				const color = getBannerColorAt(sx, sy)
				if (color) {
					selectedBannerColor.value = color
					isBannerPlacing.value = true
				}
			} else {
				bannerPanelCollapsed.value = false
			}
			return
		}

		// 检测小组贡献榜面板点击
		if (showGroupPanel.value && isOnGroupPanel(sx, sy)) {
			groupPanelCollapsed.value = !groupPanelCollapsed.value
			return
		}

		// 如果正在选择条幅位置，点击画面时不阻止默认行为
		// 坐标获取在 handleMouseUp 中处理

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
	}

	const onMouseMove = (e: MouseEvent) => {
		// 条幅放置预览
		if (isBannerPlacing.value && selectedBannerColor.value) {
			const rect = getRect()
			if (!rect) return
			const sx = e.clientX - rect.left
			const sy = e.clientY - rect.top
			// 不在面板上时更新预览位置
			if (!isOnBannerPanel(sx, sy)) {
				const world = screenToWorld(sx, sy)
				bannerPreviewX.value = world.x
				bannerPreviewY.value = world.y
			}
		}

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
		camera.value.x -= dx / camera.value.zoom
		camera.value.y -= dy / camera.value.zoom
		clampCamera()
		dragStartX = e.clientX
		dragStartY = e.clientY
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
		const newZoom = Math.max(dynamicMinZoom, Math.min(MAX_ZOOM, camera.value.zoom * factor))
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
		}
	}

	const onTouchMove = (e: TouchEvent) => {
		if (!isDragging.value || e.touches.length !== 1) return
		e.preventDefault()
		const dx = e.touches[0].clientX - dragStartX
		const dy = e.touches[0].clientY - dragStartY
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true
		camera.value.x -= dx / camera.value.zoom
		camera.value.y -= dy / camera.value.zoom
		clampCamera()
		dragStartX = e.touches[0].clientX
		dragStartY = e.touches[0].clientY
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
		groupPanelCollapsed,
		groupContributions,
		panelCards,
		// 条幅相关
		showBannerPanel,
		bannerPanelCollapsed,
		isDraggingBanner,
		dragBannerData,
		selectedBannerColor,
		isBannerPlacing,
		bannerPreviewX,
		bannerPreviewY,
		isOnBannerPanel,
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
