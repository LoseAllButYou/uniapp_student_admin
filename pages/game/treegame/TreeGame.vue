<template>
	<div class="tree-game-container">
		<div v-if="isLoading" class="loading-wrapper">
			<div class="loading-content">
				<p class="loading-text">班级绿洲 正在加载中...</p>
				<el-progress :percentage="loadingProgress" :stroke-width="15" :format="formatProgress" :text-inside="true" />
			</div>
		</div>

		<el-dialog v-model="gameVisible" width="92%" top="2vh" :show-close="false" :close-on-click-modal="false"
			append-to-body class="game-big-dialog" @opened="onGameOpened" @close="handleClose">
			<template #header>
				<div class="dialog-header-custom">
					<span class="dialog-title">{{ className || '班级绿洲' }}</span>
					<div class="dialog-header-actions">
						<el-button size="small" @click="minimizeGame" :icon="Minus" type="primary">最小化</el-button>
						<el-button size="small" @click="handleClose" :icon="Close" type="danger">关闭</el-button>
					</div>
				</div>
			</template>

			<div class="game-main">
				<div class="canvas-container" ref="containerEl">
					<canvas ref="canvasEl"
					@mousedown="onMouseDown"
					@mousemove="handleCanvasMouseMove"
					@mouseup="handleMouseUp"
					@mouseleave="onMouseUp"
					@click="handleCanvasClick"
					@touchstart="onTouchStart"
					@touchmove="onTouchMove"
					@touchend="onTouchEnd"
				></canvas>
					<div v-if="isDraggingPlant" class="drag-plant-hint">
					将树木拖入画布种植，松开左键确认位置
				</div>
				<div v-if="isBannerPlacing" class="drag-plant-hint banner-mode-hint">
					点击画布选择条幅放置位置
				</div>
				<div class="zoom-info">
					缩放: {{ Math.round(camera.zoom * 100) }}%
				</div>
				</div>

				<div class="sidebar">
					<div class="sidebar-header">
						<h3>{{ className || '班级绿洲' }}</h3>
						<el-button size="small" circle @click="refreshTrees" :loading="treeLoading">
							<el-icon><Refresh /></el-icon>
						</el-button>
					</div>

					<div v-if="currentTree" class="tree-detail-card">
						<div class="detail-name">{{ currentTree.tree_name }}</div>
						<div class="detail-level">等级 {{ currentTree.level }}/10</div>
						<div class="detail-bars">
							<div class="dbar-item">
								<span class="dbar-icon">🌱经验</span>
								<div class="dbar-track">
									<div class="dbar-fill" :style="{ width: expPercent + '%', background: getProgressColor(expPercent) }"></div>
								</div>
								<span class="dbar-val" :style="{ color: getProgressColor(expPercent) }">{{ currentTree.exp }}/{{ getLevelExp(currentTree.level) }}</span>
							</div>
						</div>
						<div class="detail-actions">
						<el-button type="primary" @click="openWater" round>💧 浇水</el-button>
						<el-button type="warning" @click="openFertilize" round>🌿 施肥</el-button>
					</div>
					</div>

					<div v-else class="no-tree-card">
						<div class="no-tree-icon">🌱</div>
						<div class="no-tree-text">点击画布中的树木查看详情</div>
					</div>

					<div class="tree-list">
						<h4>树木列表 ({{ treesData.length }})</h4>
						<div v-for="t in treesData" :key="t.id" class="tree-list-item"
							:class="{ active: selectedTreeId === t.id }" @click="selectTree(t)">
							<span class="tree-list-name">{{ t.tree_name }}</span>
							<el-tag size="small">Lv.{{ t.level }}</el-tag>
						</div>
					</div>
				</div>
			</div>
		</el-dialog>

		<div v-if="isMinimized" class="minimized-ball" @click="restoreGame">
			<div class="ball-icon">🌳</div>
			<div class="ball-label">植树游戏</div>
		</div>

		<el-dialog v-model="plantConfirmVisible" title="🌱 确认种植" width="400px" append-to-body>
			<div class="plant-confirm-body">
				<div class="plant-confirm-tree">
					<img v-if="pendingPlantImg" :src="pendingPlantImg" class="plant-confirm-img" />
					<span v-else class="plant-confirm-placeholder">🌲</span>
					<span class="plant-confirm-name">{{ pendingPlantName }}</span>
				</div>
				<p class="plant-confirm-coord">种植坐标: ({{ plantConfirmX }}, {{ plantConfirmY }})</p>
				<p class="plant-confirm-tip">是否种植到该位置？</p>
			</div>
			<template #footer>
				<el-button @click="cancelPlantConfirm">取消</el-button>
				<el-button type="primary" @click="doPlantConfirm" :loading="planting">确认种植</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="waterVisible" title="💧 浇水" width="400px" append-to-body>
			<div v-if="currentTree">
				<p>为 <b>{{ currentTree.tree_name }}</b> 浇水</p>
				<p>当前经验: {{ currentTree.exp }}/{{ getLevelExp(currentTree.level) }}</p>
				<p>浇水将获得: {{ Math.floor(getLevelExp(currentTree.level) * 0.5) }} 经验</p>
			</div>
			<template #footer>
				<el-button @click="waterVisible = false">取消</el-button>
				<el-button type="primary" @click="doWater" :loading="watering">确认浇水</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="fertilizeVisible" title="🌿 施肥" width="450px" append-to-body>
			<div v-if="currentTree">
				<div class="feed-pet-info">
					<span>{{ currentTree.tree_name }}</span>
					<el-tag size="small">Lv.{{ currentTree.level }}</el-tag>
				</div>
				<div class="feed-list">
					<div v-for="f in availableFertilizers" :key="f.item_code" class="feed-item"
						:class="{ picked: pickFertilizer === f.item_code }" @click="pickFertilizer = f.item_code">
						<span class="feed-icon">🌿</span>
						<div class="feed-info">
							<div class="feed-name">{{ f.item_name }}</div>
							<div class="feed-effect">+{{ f.exp_add || 0 }} 经验</div>
						</div>
						<el-tag size="small" type="info">x{{ f.quantity }}</el-tag>
					</div>
					<el-empty v-if="availableFertilizers.length === 0" description="肥料背包为空" :image-size="60" />
				</div>
			</div>
			<template #footer>
				<el-button @click="fertilizeVisible = false">取消</el-button>
				<el-button type="success" @click="doBatchFertilize" :loading="fertilizing" :disabled="bagFertilizers.length === 0">一键施肥</el-button>
				<el-button type="primary" @click="doFertilize" :loading="fertilizing" :disabled="!pickFertilizer">确认</el-button>
			</template>
		</el-dialog>

		<!-- 条幅位置确认弹窗 -->
		<el-dialog v-model="bannerPosConfirmVisible" title="📍 确认条幅位置" width="400px" append-to-body>
			<div class="banner-pos-confirm">
				<p class="confirm-text">确定将条幅挂载到以下位置吗？</p>
				<p class="confirm-coord">坐标：({{ pendingBannerX }}, {{ pendingBannerY }})</p>
				<p class="confirm-color">颜色：<span :style="{ color: BANNER_COLORS[pendingBannerColor] || '#FF6B6B' }">{{ getBannerColorName(pendingBannerColor) }}</span></p>
			</div>
			<template #footer>
				<el-button @click="cancelBannerPosConfirm">取消</el-button>
				<el-button type="primary" @click="confirmBannerPosition">确定，配置内容</el-button>
			</template>
		</el-dialog>

		<!-- 条幅内容配置弹窗 -->
		<el-dialog v-model="bannerVisible" title="🎌 配置条幅内容" width="550px" append-to-body @close="cancelBannerPlacement">
			<div class="banner-body">
				<div class="banner-position-info">
					<p class="position-label">📍 挂载位置</p>
					<p class="position-coord">({{ pendingBannerX }}, {{ pendingBannerY }})</p>
				</div>
				<p>选择预设条幅：</p>
				<div class="banner-templates">
					<div v-for="t in bannerTemplates" :key="t.id" class="template-item"
						:class="{ picked: bannerContent === t.content }" @click="selectTemplate(t)">
						{{ t.content }}
					</div>
				</div>
				<el-input v-model="bannerContent" placeholder="或自定义条幅内容（30字以内）" maxlength="30" style="margin-bottom: 15px" />
				<p>条幅背景颜色：</p>
				<div class="banner-colors">
					<div v-for="(hex, key) in BANNER_COLORS" :key="key" class="color-option"
						:class="{ picked: bannerColor === key }" @click="bannerColor = key as string"
						:style="{ background: hex }"></div>
				</div>
				<p style="margin-top: 15px">文字颜色：</p>
				<div class="banner-colors">
					<div class="color-option" :class="{ picked: bannerTextColor === '#fff' }"
						@click="bannerTextColor = '#fff'" :style="{ background: '#fff', border: '1px solid #ccc' }"></div>
					<div class="color-option" :class="{ picked: bannerTextColor === '#000' }"
						@click="bannerTextColor = '#000'" :style="{ background: '#000' }"></div>
					<div class="color-option" :class="{ picked: bannerTextColor === '#FFD700' }"
						@click="bannerTextColor = '#FFD700'" :style="{ background: '#FFD700' }"></div>
					<div class="color-option" :class="{ picked: bannerTextColor === '#00FF00' }"
						@click="bannerTextColor = '#00FF00'" :style="{ background: '#00FF00' }"></div>
				</div>
				<div style="margin-top: 15px">
					<el-checkbox v-model="bannerTextBold">文字加粗</el-checkbox>
				</div>
			</div>
			<template #footer>
				<el-button @click="cancelBannerPlacement">取消</el-button>
				<el-button type="primary" @click="submitBanner" :loading="bannerAdding" :disabled="!bannerContent">确认挂载</el-button>
			</template>
		</el-dialog>

		<!-- 小组贡献记录弹窗 -->
		<el-dialog v-model="groupLogsVisible" :title="`📋 ${selectedGroup?.group_name || '小组'}贡献记录`" width="500px" append-to-body>
			<div class="group-logs-body">
				<div class="group-logs-summary">
					<div class="logs-stat">
						<div class="logs-stat-value">{{ selectedGroup?.total_exp || 0 }}</div>
						<div class="logs-stat-label">总贡献值</div>
					</div>
					<div class="logs-stat">
						<div class="logs-stat-value">{{ selectedGroup?.action_count || 0 }}</div>
						<div class="logs-stat-label">操作次数</div>
					</div>
				</div>
				<div class="logs-list">
					<div v-for="(log, idx) in selectedGroup?.recent_logs || []" :key="idx" class="log-item">
						<div class="log-icon">{{ log.action_type === 'water' ? '💧' : '🌿' }}</div>
						<div class="log-content">
							<div class="log-title">{{ log.item_name || (log.action_type === 'water' ? '浇水' : '施肥') }}</div>
							<div class="log-meta">
								<span class="log-exp">+{{ log.exp_add }} 经验</span>
								<span class="log-time">{{ formatLogTime(log.create_time) }}</span>
							</div>
						</div>
					</div>
					<el-empty v-if="!selectedGroup?.recent_logs?.length" description="暂无记录" :image-size="60" />
				</div>
			</div>
			<template #footer>
				<el-button @click="groupLogsVisible = false">关闭</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Minus, Close } from '@element-plus/icons-vue'
import { getTreeConfigs, getTreeList, plantTree, waterTree, fertilizeTree, batchFertilize, getTreeBag, getBannerTemplates, addBanner, getGroupContributions, getTreeBanners } from '@/api/request'
import { TreeData, BANNER_COLORS, TreeConfig } from './scripts/types'
import { getProgressColor, getLevelExp, getExpPercent, preloadAllImages, getImgSrc, IMG_BASE } from './scripts/treeResources'
import { useCanvasEngine } from './composables/useCanvasEngine'
import { useTreeActions } from './composables/useTreeActions'

const emit = defineEmits(['gameClose', 'minimize'])

const isLoading = ref(false)
const loadingProgress = ref(0)
const gameVisible = ref(false)
const isMinimized = ref(false)
const gameInitialized = ref(false)
const classId = ref(0)
const className = ref('')
const currentGroupId = ref(0)
const treesData = ref<TreeData[]>([])
const selectedTreeId = ref<number | null>(null)
const treeConfigs = ref<TreeConfig[]>([])
const treeLoading = ref(false)

// 获取当前用户的小组ID
const getCurrentGroupId = () => {
	const info = uni.getStorageSync('teacherInfo')
	// 优先使用存储的当前小组ID，否则使用第一个小组
	return currentGroupId.value || info?.group_id || info?.groups?.[0]?.id || 0
}

// 条幅数据（必须在useCanvasEngine之前定义）
const banners = ref<any[]>([])

// 小组贡献相关（必须在loadGroupContributions之前定义）
const groupLoading = ref(false)
const groupLogsVisible = ref(false)
const selectedGroup = ref<any>(null)

const {
	camera, canvasEl, containerEl, isPlantMode, isDraggingPlant,
	groupContributions,
	showBannerPanel, bannerPanelCollapsed, isDraggingBanner, dragBannerData,
	selectedBannerColor, isBannerPlacing, bannerPreviewX, bannerPreviewY,
	isOnBannerPanel,
	initCanvas, resizeCanvas, startRender, stopRender, rebuildRenderList,
	onMouseDown, onMouseMove, onMouseUp, onWheel,
	onTouchStart, onTouchMove, onTouchEnd,
	centerOnTree, onCanvasClick: canvasEngineClick,
	startDragPlant, cancelDragPlant, confirmPlantAt,
	dragPlantTreeType, dragPlantWorldX, dragPlantWorldY, dragPlantValid,
	refreshPanel, setGroupContributions, screenToWorld,
} = useCanvasEngine(treesData, selectedTreeId, treeConfigs, banners)

// 加载小组贡献数据
const loadGroupContributions = async () => {
	if (!classId.value) return
	groupLoading.value = true
	try {
		const teacherInfo = uni.getStorageSync('teacherInfo')
		const currentClass = teacherInfo?.classes?.find((c: any) => c.id === classId.value)
		const storageGroups = currentClass?.groups || []

		const res = await getGroupContributions(classId.value)

		if (res.code === 1) {
			let apiContributions = []
			if (Array.isArray(res.data)) {
				apiContributions = res.data
			} else if (res.data?.contributions) {
				apiContributions = res.data.contributions
			} else if (typeof res.data === 'object') {
				apiContributions = Object.values(res.data)
			}

			const contributionMap = new Map()
			apiContributions.forEach((g: any) => {
				const gid = g.group_id || g.id
				if (gid) contributionMap.set(gid, g)
			})

			let contributions = []
			if (storageGroups.length > 0) {
				contributions = storageGroups.map((sg: any, index: number) => {
					const apiData = contributionMap.get(sg.id)
					if (apiData) {
						return {
							group_id: apiData.group_id || sg.id,
							group_name: apiData.group_name || sg.name,
							group_avatar: apiData.group_avatar || sg.description || '',
							total_exp: apiData.total_exp || 0,
							action_count: apiData.action_count || 0,
							rank: 0,
							recent_logs: apiData.recent_logs || []
						}
					} else {
						return {
							group_id: sg.id,
							group_name: sg.name,
							group_avatar: sg.description || '',
							total_exp: 0,
							action_count: 0,
							rank: 0,
							recent_logs: []
						}
					}
				})
			} else {
				contributions = apiContributions.map((g: any) => ({
					group_id: g.group_id || g.id,
					group_name: g.group_name || g.name || `小组${g.group_id || g.id}`,
					group_avatar: g.group_avatar || '',
					total_exp: g.total_exp || 0,
					action_count: g.action_count || 0,
					rank: 0,
					recent_logs: g.recent_logs || []
				}))
			}

			contributions.sort((a: any, b: any) => b.total_exp - a.total_exp)
			contributions.forEach((g: any, index: number) => { g.rank = index + 1 })
			setGroupContributions(contributions)
		}
	} catch (e) { console.error('加载小组贡献榜失败:', e) }
	finally { groupLoading.value = false }
}

const {
	waterVisible, watering,
	fertilizeVisible, pickFertilizer, fertilizing, bagFertilizers,
	bannerVisible, bannerContent, bannerColor, bannerAdding, bannerTemplates,
	openWater, doWater,
	openFertilize, doFertilize, doBatchFertilize,
	openBanner, doAddBanner, selectTemplate,
	loadBannerTemplates, loadBanners,
} = useTreeActions(treesData, selectedTreeId, banners, classId, async () => { await refreshTrees(); refreshPanel() }, loadGroupContributions, getCurrentGroupId)

const plantConfirmVisible = ref(false)
const pendingPlantType = ref('')
const pendingPlantName = ref('')
const pendingPlantImg = ref('')

// 条幅相关状态
const bannerPosConfirmVisible = ref(false)
const pendingBannerX = ref(0)
const pendingBannerY = ref(0)
const pendingBannerColor = ref('red')
const bannerTextColor = ref('#fff')
const bannerTextBold = ref(true)

// 条幅颜色名称映射
const getBannerColorName = (color: string) => {
	const names: Record<string, string> = {
		red: '红色', orange: '橙色', yellow: '黄色', green: '绿色',
		blue: '蓝色', purple: '紫色', pink: '粉色'
	}
	return names[color] || color
}
const plantConfirmX = ref(0)
const plantConfirmY = ref(0)
const planting = ref(false)

const currentTree = computed(() => {
	if (!selectedTreeId.value) return null
	return treesData.value.find(t => t.id === selectedTreeId.value) || null
})

const expPercent = computed(() => {
	if (!currentTree.value) return 0
	return getExpPercent(currentTree.value.level, currentTree.value.exp)
})

const availableFertilizers = computed(() => bagFertilizers.value.filter(f => (f.quantity || 0) > 0))

const formatProgress = (p: number) => `${p}%`

const showGroupLogs = (group: any) => {
	selectedGroup.value = group
	groupLogsVisible.value = true
}

const formatLogTime = (timestamp: number | string) => {
	if (!timestamp) return ''
	const date = new Date(timestamp * 1000 || timestamp)
	return date.toLocaleString('zh-CN', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	})
}

const getTreeImgSrc = (treeType: string) => {
	// 使用打包后的相对路径 /web/static/game/tree/tree/
	return `/web/static/game/tree/tree/${treeType}.svg`
}

const cancelPlantConfirm = () => {
	plantConfirmVisible.value = false
	cancelDragPlant()
}

const doPlantConfirm = async () => {
	if (!pendingPlantType.value) return
	planting.value = true
	try {
		const res = await plantTree({
			class_id: classId.value,
			tree_type: pendingPlantType.value,
			pos_x: plantConfirmX.value,
			pos_y: plantConfirmY.value
		})
		if (res.code === 1) {
			ElMessage.success('种植成功！')
			plantConfirmVisible.value = false
			pendingPlantType.value = ''
			await refreshTrees()
		} else {
			ElMessage.error(res.msg || '种植失败')
		}
	} catch (e) { ElMessage.error('种植失败') }
	finally { planting.value = false }
}

const selectTree = (t: TreeData) => {
	selectedTreeId.value = t.id
	centerOnTree(t.id)
}

const handleCanvasClick = (e: MouseEvent) => {
	const result = canvasEngineClick(e)
	if (result.type === 'tree' && result.treeId) {
		selectedTreeId.value = result.treeId
	}
	// 处理条幅放置
	if (result.type === 'banner' && result.worldX !== undefined && result.worldY !== undefined && result.bannerColor) {
		pendingBannerX.value = result.worldX
		pendingBannerY.value = result.worldY
		pendingBannerColor.value = result.bannerColor
		bannerPosConfirmVisible.value = true
	}
}

// 鼠标移动
const handleCanvasMouseMove = (e: MouseEvent) => {
	onMouseMove(e)
}

// 开始条幅添加（显示条幅面板）
const startBannerPlacement = () => {
	showBannerPanel.value = true
	bannerPanelCollapsed.value = false
}

// 取消条幅添加
const cancelBannerPlacement = () => {
	selectedBannerColor.value = null
	isBannerPlacing.value = false
	bannerVisible.value = false
}

// 取消条幅位置确认
const cancelBannerPosConfirm = () => {
	bannerPosConfirmVisible.value = false
	selectedBannerColor.value = null
	isBannerPlacing.value = false
}

// 确认条幅位置（从位置确认弹窗点击确定后）
const confirmBannerPosition = () => {
	bannerPosConfirmVisible.value = false
	bannerColor.value = pendingBannerColor.value
	bannerVisible.value = true
}

// 提交条幅（输入内容后确认）
const submitBanner = async () => {
	await doAddBanner(pendingBannerX.value, pendingBannerY.value, bannerTextColor.value, bannerTextBold.value)

	// 重置状态
	selectedBannerColor.value = null
	isBannerPlacing.value = false
	bannerContent.value = ''
}

const handleMouseUp = (e: MouseEvent) => {
	// 条幅放置结束（像种树一样）
	if (isBannerPlacing.value && selectedBannerColor.value) {
		const rect = containerEl.value?.getBoundingClientRect()
		if (!rect) {
			cancelBannerPlacement()
			return
		}
		const sx = e.clientX - rect.left
		const sy = e.clientY - rect.top

		// 如果是在条幅面板上松开，不处理
		if (!isOnBannerPanel(sx, sy)) {
			// 使用screenToWorld获取世界坐标
			const { x: wx, y: wy } = screenToWorld(sx, sy)

			if (wx && wy) {
				pendingBannerX.value = Math.round(wx)
				pendingBannerY.value = Math.round(wy)
				pendingBannerColor.value = selectedBannerColor.value
				bannerPosConfirmVisible.value = true
				// 重置放置状态
				selectedBannerColor.value = null
				isBannerPlacing.value = false
			} else {
				ElMessage.warning('无法获取位置，请重新点击画布')
				cancelBannerPlacement()
			}
			return
		} else {
			cancelBannerPlacement()
			return
		}
	}

	if (isDraggingPlant.value) {
		const rect = containerEl.value?.getBoundingClientRect()
		if (!rect) {
			cancelDragPlant()
			return
		}
		const sx = e.clientX - rect.left
		const sy = e.clientY - rect.top
		const wx = dragPlantWorldX.value
		const wy = dragPlantWorldY.value

		if (sx < 0 || sy < 0 || sx > rect.width || sy > rect.height) {
			cancelDragPlant()
			return
		}

		// X轴距离检测：左右350px范围内不能种树
		const MIN_TREE_DISTANCE_X = 350
		const tooCloseX = treesData.value.some(t => {
			const dx = Math.abs(wx - t.pos_x)
			return dx < MIN_TREE_DISTANCE_X
		})

		if (tooCloseX) {
			ElMessage.warning('左右两侧350px范围内已有树木，请换个位置')
			cancelDragPlant()
			return
		}

		const tc = treeConfigs.value.find(c => c.tree_type === dragPlantTreeType.value)
		pendingPlantType.value = dragPlantTreeType.value
		pendingPlantName.value = tc?.tree_name || dragPlantTreeType.value
		pendingPlantImg.value = getTreeImgSrc(dragPlantTreeType.value)
		plantConfirmX.value = Math.round(wx)
		plantConfirmY.value = Math.round(wy)
		plantConfirmVisible.value = true
		cancelDragPlant()
	}
	onMouseUp(e)
}

async function refreshTrees() {
	treeLoading.value = true
	try {
		const res = await getTreeList(classId.value)
		if (res.code === 1) {
			treesData.value = res.data || []
			rebuildRenderList()
			refreshPanel()
		}
		// 同时刷新条幅数据
		await loadBanners()
	} catch (e) { ElMessage.error('刷新失败') }
	finally { treeLoading.value = false }
}

const loadGameResources = async () => {
	isLoading.value = true
	loadingProgress.value = 0

	await preloadAllImages((progress) => {
		loadingProgress.value = progress
	})
	isLoading.value = false
}

const loadGameData = async () => {
	const cid = uni.getStorageSync('currentClassId')
	if (!cid) { ElMessage.warning('请先选择班级'); return }
	classId.value = cid
	const info = uni.getStorageSync('teacherInfo')
	className.value = info?.classes?.find((c: any) => c.id === cid)?.name || ''

	await loadGameResources()

	// 并行加载：树木配置、树木列表、条幅模板、条幅数据
	const [tRes, pRes] = await Promise.all([
		getTreeConfigs({}),
		getTreeList(cid),
		loadBannerTemplates(),
		loadBanners()
	])
	if (tRes.code === 1) {
		treeConfigs.value = tRes.data
	}
	if (pRes.code === 1) {
		treesData.value = pRes.data || []
	}

	// 加载小组贡献数据
	await loadGroupContributions()

	gameVisible.value = true
	await nextTick()
	initCanvas()
	rebuildRenderList()
	refreshPanel()
}

const onGameOpened = () => {
	gameInitialized.value = true
}

const handleClose = () => {
	gameVisible.value = false
	stopRender()
	emit('gameClose', 'tree')
}

const minimizeGame = () => {
	isMinimized.value = true
	gameVisible.value = false
	stopRender()
	emit('minimize', 'tree', true)
}

const restoreGame = () => {
	isMinimized.value = false
	gameVisible.value = true
	emit('minimize', 'tree', false)
	loadGameData()
}

const enterGame = async () => {
	await loadGameData()
}

defineExpose({ enterGame, restoreGame })

let resizeHandler: (() => void) | null = null

onMounted(() => {
	resizeHandler = () => resizeCanvas()
	window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
	stopRender()
	if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})
</script>

<style scoped src="./styles/TreeGame.scss"></style>
