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
						@mousemove="onMouseMove"
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
							<el-button v-if="currentTree.level >= 3" type="danger" @click="openBanner" round>🎌 条幅</el-button>
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

		<el-dialog v-model="bannerVisible" title="🎌 挂载祝福条幅" width="550px" append-to-body>
			<div class="banner-body">
				<p>选择预设条幅：</p>
				<div class="banner-templates">
					<div v-for="t in bannerTemplates" :key="t.id" class="template-item"
						:class="{ picked: bannerContent === t.content }" @click="selectTemplate(t)">
						{{ t.content }}
					</div>
				</div>
				<el-input v-model="bannerContent" placeholder="或自定义条幅内容（30字以内）" maxlength="30" style="margin-bottom: 15px" />
				<p>选择条幅颜色：</p>
				<div class="banner-colors">
					<div v-for="(hex, key) in BANNER_COLORS" :key="key" class="color-option"
						:class="{ picked: bannerColor === key }" @click="bannerColor = key as string"
						:style="{ background: hex }"></div>
				</div>
			</div>
			<template #footer>
				<el-button @click="bannerVisible = false">取消</el-button>
				<el-button type="primary" @click="doAddBanner" :loading="bannerAdding" :disabled="!bannerContent">确认挂载</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Minus, Close } from '@element-plus/icons-vue'
import { getTreeConfigs, getTreeList, plantTree, waterTree, fertilizeTree, batchFertilize, getTreeBag, getBannerTemplates, addBanner } from '@/api/request'
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
const treesData = ref<TreeData[]>([])
const selectedTreeId = ref<number | null>(null)
const treeConfigs = ref<TreeConfig[]>([])
const treeLoading = ref(false)

const {
	camera, canvasEl, containerEl, isPlantMode, isDraggingPlant,
	initCanvas, resizeCanvas, startRender, stopRender, rebuildRenderList,
	onMouseDown, onMouseMove, onMouseUp, onWheel,
	onTouchStart, onTouchMove, onTouchEnd,
	centerOnTree, onCanvasClick: canvasEngineClick,
	startDragPlant, cancelDragPlant, confirmPlantAt,
	dragPlantTreeType, dragPlantWorldX, dragPlantWorldY, dragPlantValid,
	refreshPanel,
} = useCanvasEngine(treesData, selectedTreeId, treeConfigs)

const {
	waterVisible, watering,
	fertilizeVisible, pickFertilizer, fertilizing, bagFertilizers,
	bannerVisible, bannerContent, bannerColor, bannerAdding, bannerTemplates,
	openWater, doWater,
	openFertilize, doFertilize, doBatchFertilize,
	openBanner, doAddBanner, selectTemplate,
} = useTreeActions(treesData, selectedTreeId, classId, () => { refreshTrees(); refreshPanel() })

const plantConfirmVisible = ref(false)
const pendingPlantType = ref('')
const pendingPlantName = ref('')
const pendingPlantImg = ref('')
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

const getTreeImgSrc = (treeType: string) => {
	const name = getImgSrc(treeType)
	return name ? `${IMG_BASE}/${name}.svg` : ''
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
}

const handleMouseUp = (e: MouseEvent) => {
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

		const tooClose = treesData.value.some(t => {
			const dx = wx - t.pos_x
			const dy = wy - t.pos_y
			return Math.sqrt(dx * dx + dy * dy) < 80
		})

		if (tooClose) {
			ElMessage.warning('距离其他树太近，请换个位置')
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
	} catch (e) { ElMessage.error('刷新失败') }
	finally { treeLoading.value = false }
}

const loadGameResources = async () => {
	isLoading.value = true
	loadingProgress.value = 0
	const steps = [
		{ name: '加载图片资源', fn: () => preloadAllImages() },
		{ name: '加载游戏数据', fn: () => new Promise(r => setTimeout(r, 300)) },
		{ name: '初始化场景', fn: () => new Promise(r => setTimeout(r, 200)) },
	]
	for (let i = 0; i < steps.length; i++) {
		await steps[i].fn()
		loadingProgress.value = Math.round((i + 1) / steps.length * 100)
	}
	isLoading.value = false
}

const loadGameData = async () => {
	const cid = uni.getStorageSync('currentClassId')
	if (!cid) { ElMessage.warning('请先选择班级'); return }
	classId.value = cid
	const info = uni.getStorageSync('teacherInfo')
	className.value = info?.classes?.find((c: any) => c.id === cid)?.name || ''

	await loadGameResources()

	const [tRes, pRes] = await Promise.all([getTreeConfigs({}), getTreeList(cid)])
	if (tRes.code === 1) {
		treeConfigs.value = tRes.data
	}
	if (pRes.code === 1) {
		treesData.value = pRes.data || []
	}

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
	emit('gameClose', '')
}

const minimizeGame = () => {
	isMinimized.value = true
	gameVisible.value = false
	stopRender()
	emit('minimize', true)
}

const restoreGame = () => {
	isMinimized.value = false
	emit('minimize', false)
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
