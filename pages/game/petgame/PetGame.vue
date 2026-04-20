<template>
	<div class="pet-game-container">
		<!-- 游戏加载进度条 -->
		<div v-if="isLoading" class="loading-wrapper">
			<div class="loading-content">
				<p class="loading-text">宠物乐园 正在加载中...</p>
				<el-progress :percentage="loadingProgress" :stroke-width="15" :format="formatProgress"
					:text-inside="true" />
			</div>
		</div>

		<el-dialog v-model="gameVisible" width="92%" top="2vh" :show-close="false" :close-on-click-modal="false"
			append-to-body class="game-big-dialog" @opened="onGameOpened" @close="onGameClose">
			<template #header>
				<div class="dialog-header-custom">
					<span class="dialog-title">{{ className || '宠物乐园' }}</span>
					<div class="dialog-header-actions">
						<el-button size="small" @click="minimizeGame" :icon="Edit" type="primary">
							最小化
						</el-button>
						<el-button size="small" @click="gameVisible = false" :icon="Close" type="danger">
							关闭
						</el-button>
					</div>
				</div>
			</template>
			<div class="game-main">
				<div class="farm-scene" ref="farmRef">
					<div class="farm-area">
						<div class="eggs-bar" v-if="eggSprites.length > 0">
							<div v-for="(sp, idx) in eggSprites" :key="'egg-' + sp.groupId" class="egg-slot"
								@click.stop="onSpriteClick(sp)">
								<div class="egg-cloud"></div>
								<div class="egg-svg" v-html="getEggImgHTML(50)"></div>
								<div class="egg-label">
									<span class="egg-rank">{{ idx + 1 }}</span>
									<span class="egg-group">{{ sp.groupName }}</span>
								</div>
							</div>
						</div>

						<div class="farm-sky">
							<div class="farm-sun"></div>
							<div class="farm-cloud fc1"></div>
							<div class="farm-cloud fc2"></div>
							<div class="farm-cloud fc3"></div>
						</div>
						<div class="farm-ground">
							<div class="farm-barn">
								<div class="barn-roof"></div>
								<div class="barn-body">
									<div class="barn-door"></div>
								</div>
							</div>
							<div class="farm-fence"></div>
							<div class="farm-tree ft1">
								<div class="trunk"></div>
								<div class="crown"></div>
							</div>
							<div class="farm-tree ft2">
								<div class="trunk"></div>
								<div class="crown"></div>
							</div>
							<div class="farm-tree ft3">
								<div class="trunk"></div>
								<div class="crown"></div>
							</div>
							<div class="farm-pond"></div>
							<div class="farm-path"></div>
							<div class="farm-flowers"><span>🌸</span><span>🌼</span><span>🌺</span></div>
						</div>

						<div class="sprites-layer">
							<div v-for="sp in petSprites" :key="sp.groupId" class="sprite-wrapper"
								:class="[sp.state, sp.direction, { 'energy-critical': sp.energy <= 0, 'mood-critical': sp.mood <= 0 }]"
								:style="{ left: sp.x + '%', top: sp.y + '%', zIndex: Math.round(sp.y) }"
								@click.stop="onSpriteClick(sp)">
								<div class="sprite-info">
									<span class="sname">{{ sp.petName }}</span>
									<span class="sgroup">{{ sp.groupName }}</span>
									<span class="sstage">Lv.{{ sp.lifeStage }}</span>
								</div>
								<div class="sprite-bars">
									<div class="sbar-row">
										<span class="sbar-icon">⚡</span>
										<div class="sbar">
											<div class="sbar-fill energy" :style="{ width: sp.energy + '%' }"></div>
										</div>
									</div>
									<div class="sbar-row">
										<span class="sbar-icon">💖</span>
										<div class="sbar">
											<div class="sbar-fill mood" :style="{ width: sp.mood + '%' }"></div>
										</div>
									</div>
								</div>
								<div class="sprite-svg" :class="'stage-' + sp.lifeStage"
									v-html="getPetImgHTML(sp.petType, sp.lifeStage)"></div>
								<div v-if="sp.bubble" class="speech-bubble">{{ sp.bubble }}</div>
							</div>
						</div>
					</div>
				</div>

				<div class="sidebar">
					<div class="sidebar-header">
						<h3>{{ className || '宠物乐园' }}</h3>
						<div class="sidebar-actions">
							<el-button type="success" size="small" @click="openOneClickReplenish" round>✨
								一键喂养</el-button>
							<el-button size="small" circle @click="refreshPets" :loading="loading"><el-icon>
									<Refresh />
								</el-icon></el-button>
						</div>
					</div>

					<div v-if="selectedSprite && selectedSprite.hasPet" class="pet-detail-card">
						<div class="detail-pet-area" @click="onDetailPetClick">
							<div class="detail-svg" :class="'stage-' + selectedSprite.lifeStage"
								v-html="getPetImgHTML(selectedSprite.petType, selectedSprite.lifeStage)"></div>
							<div v-if="detailBubble" class="detail-bubble">{{ detailBubble }}</div>
						</div>
						<div class="detail-name">{{ selectedSprite.petName }}</div>
						<div class="detail-group">{{ selectedSprite.groupName }}</div>
						<div class="detail-stage"><span v-for="i in 4" :key="i" class="sdot"
								:class="{ on: i <= selectedSprite.lifeStage }">●</span><span class="stxt">阶段 {{
									selectedSprite.lifeStage
								}}/4</span></div>
						<div class="detail-bars">
							<div class="dbar-item">
								<span class="dbar-icon">⚡能量</span>
								<div class="dbar-track">
									<div class="dbar-fill"
										:style="{ width: selectedSprite.energy + '%', background: getProgressColor(selectedSprite.energy) }">
									</div>
								</div>
								<span class="dbar-val" :style="{ color: getProgressColor(selectedSprite.energy) }">{{
									Math.round(selectedSprite.energy) }}%</span>
							</div>
							<div class="dbar-item">
								<span class="dbar-icon">💖心情</span>
								<div class="dbar-track">
									<div class="dbar-fill"
										:style="{ width: selectedSprite.mood + '%', background: getProgressColor(selectedSprite.mood) }">
									</div>
								</div>
								<span class="dbar-val" :style="{ color: getProgressColor(selectedSprite.mood) }">{{
									Math.round(selectedSprite.mood) }}%</span>
							</div>
						</div>
						<div class="detail-growth">成长: {{ selectedSprite.growthFeedCount || 0 }}/3 次满能量</div>
						<div class="detail-actions">
							<el-button type="warning" @click="openFeed" round>🍖 喂养</el-button>
							<el-button type="primary" @click="openInteract" round>🎾 互动</el-button>
						</div>
					</div>

					<div v-else-if="selectedSprite && !selectedSprite.hasPet" class="no-pet-card">
						<div class="no-pet-egg" v-html="getEggImgHTML(100)"></div>
						<div class="no-pet-text">{{ selectedSprite.groupName }} 还没有宠物</div>
						<el-button type="primary" @click="openAdoptForGroup(selectedSprite.groupId)"
							round>立即领养</el-button>
					</div>

					<div v-else class="no-pet-card">
						<div class="no-pet-text">点击农场中的宠物或蛋</div>
					</div>

					<div v-if="IS_DEBUG" class="decay-config">
						<div class="config-title">⚙️ 衰减调试</div>
						<div class="config-row"><span>能量(秒/点)</span><el-input-number
								v-model="energyDecaySecsPerPoint" :min="10" :max="3600" :step="10" size="small" />
						</div>
						<div class="config-row"><span>心情(秒/点)</span><el-input-number v-model="moodDecaySecsPerPoint"
								:min="10" :max="3600" :step="10" size="small" /></div>
						<div class="config-row"><span>检测间隔(秒)</span><el-input-number v-model="decayCheckSec"
								:min="5" :max="120" :step="5" size="small" /></div>
						<div class="config-row"><span>同步后台(秒)</span><el-input-number v-model="syncToServerSec"
								:min="10" :max="600" :step="10" size="small" /></div>
					</div>
				</div>
			</div>
		</el-dialog>

		<!-- 最小化后的悬浮球 -->
		<div v-if="isMinimized" class="minimized-ball" @click="restoreGame">
			<div class="ball-icon">🐾</div>
			<div class="ball-label">宠物乐园</div>
		</div>

		<el-dialog v-model="adoptVisible" title="🐣 领养宠物" width="620px" append-to-body>
			<div class="adopt-body">
				<div class="adopt-info">为 <b>{{ adoptGroupName }}</b> 领养宠物</div>
				<div class="adopt-scroll">
					<div class="adopt-grid">
						<div v-for="t in petTypes" :key="t.code" class="adopt-card"
							:class="{ picked: adoptType === t.code }" @click="adoptType = t.code">
							<div class="adopt-svg" v-html="getPetImgHTML(t.code, 1)"></div>
							<div class="adopt-name">{{ t.name }}</div>
						</div>
					</div>
				</div>
				<el-input v-model="adoptName" placeholder="给宠物起个名字（可选）" style="margin-top:15px" />
			</div>
			<template #footer>
				<el-button @click="adoptVisible = false">取消</el-button>
				<el-button type="primary" @click="doAdopt" :loading="adopting" :disabled="!adoptType">确认领养</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="feedVisible" title="🍖 喂养宠物" width="420px" append-to-body>
			<div v-if="selectedSprite" class="feed-body">
				<div class="feed-pet-info"><span class="feed-svg"
						v-html="getPetImgHTML(selectedSprite.petType!, selectedSprite.lifeStage!)"></span><span>{{
							selectedSprite.petName }}</span><el-tag size="small">能量 {{ Math.round(selectedSprite.energy || 0)
						}}%</el-tag></div>
				<div class="feed-list">
					<div v-for="f in availableFoods" :key="f.item_code" class="feed-item"
						:class="{ picked: pickFood === f.item_code }" @click="pickFood = f.item_code">
						<span class="feed-icon">🍖</span>
						<div class="feed-info">
							<div>{{ f.item_name }}</div>
							<div class="feed-effect">+{{ f.energy_add || 0 }} 能量</div>
						</div><el-tag size="small" type="info">x{{ f.quantity }}</el-tag>
					</div>
					<el-empty v-if="availableFoods.length === 0" :description="bagFoods.length === 0 ? '食物背包为空，请通过奖品发放补充' : '没有可用的食物了'" :image-size="60" />
				</div>
			</div>
			<template #footer>
				<el-button @click="feedVisible = false">取消</el-button>
				<el-button type="primary" @click="doFeed" :loading="feeding" :disabled="!pickFood">确认</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="interactVisible" title="🎾 与宠物互动" width="420px" append-to-body>
			<div v-if="selectedSprite" class="feed-body">
				<div class="feed-pet-info"><span class="feed-svg"
						v-html="getPetImgHTML(selectedSprite.petType!, selectedSprite.lifeStage!)"></span><span>{{
							selectedSprite.petName }}</span><el-tag size="small">心情 {{ Math.round(selectedSprite.mood || 0)
						}}%</el-tag></div>
				<div class="feed-list">
					<div v-for="t in availableToys" :key="t.item_code" class="feed-item"
						:class="{ picked: pickToy === t.item_code }" @click="pickToy = t.item_code">
						<span class="feed-icon">🎾</span>
						<div class="feed-info">
							<div>{{ t.item_name }}</div>
							<div class="feed-effect">+{{ t.mood_add || 0 }} 心情</div>
						</div><el-tag size="small" type="info">x{{ t.quantity }}</el-tag>
					</div>
					<el-empty v-if="availableToys.length === 0" :description="bagToys.length === 0 ? '玩具背包为空，请通过奖品发放补充' : '没有可用的玩具了'" :image-size="60" />
				</div>
			</div>
			<template #footer>
				<el-button @click="interactVisible = false">取消</el-button>
				<el-button type="primary" @click="doInteract" :loading="interacting" :disabled="!pickToy">确认</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="oneClickVisible" title="✨ 一键喂养" width="650px" append-to-body class="one-click-dialog">
			<div class="one-click-body">
				<div class="one-click-header">
					<span>共 {{ oneClickPlan?.petPlans.length || 0 }} 只宠物需要补充</span>
					<el-tag type="warning" size="small">总消耗 {{ oneClickPlan?.totalItems || 0 }} 件物品</el-tag>
				</div>
				<div class="one-click-pet-list">
					<div class="one-click-pet-card" v-for="(pet, idx) in oneClickPlan?.petPlans" :key="idx">
						<div class="one-click-pet-header">
							<div class="pet-info">
								<span class="pet-name">{{ pet.petName }}</span>
								<span class="pet-group">{{ pet.groupName }}</span>
							</div>
							<el-tag :type="pet.isEmpty ? 'danger' : pet.needFeed || pet.needInteract ? 'success' : 'info'"
								size="small">
								{{ pet.isEmpty ? (pet.isEmptyFood && pet.isEmptyToy ? '背包为空' : pet.isEmptyFood ? '食物为空' :
									'玩具为空') : pet.needFeed || pet.needInteract ? '可补充' : '已满' }}
							</el-tag>
						</div>
						<div class="one-click-pet-stats">
							<span>能量 {{ Math.round(pet.startEnergy || 0) }}% → {{ Math.round(pet.targetEnergy || pet.startEnergy || 0) }}%</span>
							<span>心情 {{ Math.round(pet.startMood || 0) }}% → {{ Math.round(pet.targetMood || pet.startMood || 0) }}%</span>
						</div>
						<div v-if="pet.isEmpty" class="pet-empty-tip">
							<el-icon><WarningFilled /></el-icon>
							<span v-if="pet.isEmptyFood && pet.isEmptyToy">背包为空，请前往奖品中心领取食物和玩具后再试</span>
							<span v-else-if="pet.isEmptyFood">食物背包为空，请前往奖品中心领取食物后再试</span>
							<span v-else>玩具背包为空，请前往奖品中心领取玩具后再试</span>
						</div>
						<div class="one-click-pet-detail" v-if="pet.needFeed || pet.needInteract">
							<div v-if="pet.needFeed && pet.foodPlan.length > 0" class="pet-detail-row">
								<span class="detail-label">🍖 喂食:</span>
								<span>{{ pet.foodPlan.filter(f => f.name && f.count > 0).map(f => `${f.name}x${f.count}`).join('、') || '无可用食物' }}</span>
							</div>
							<div v-if="pet.needInteract && pet.toyPlan.length > 0" class="pet-detail-row">
								<span class="detail-label">🎾 互动:</span>
								<span>{{ pet.toyPlan.filter(t => t.name && t.count > 0).map(t => `${t.name}x${t.count}`).join('、') || '无可用玩具' }}</span>
							</div>
						</div>
					</div>
				</div>
				<div v-if="oneClickPlan?.petPlans.some(p => p.isEmpty)" class="one-click-warning">
					<el-icon><WarningFilled /></el-icon>
					<span>部分宠物背包为空，将无法补充对应属性，请通过奖品发放补充背包</span>
				</div>
			</div>
			<template #footer>
				<el-button @click="oneClickVisible = false">取消</el-button>
				<el-button type="success" @click="executeOneClickPlan" :loading="oneClickExecuting"
					:disabled="!oneClickPlan || oneClickPlan.totalItems === 0">
					确认执行
				</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="growthVisible" title="🎉 恭喜！" width="320px" center append-to-body>
			<div class="growth-body">
				<div class="growth-svg" v-html="getPetImgHTML(growthData.petType, growthData.to)"></div>
				<div class="growth-text">{{ growthData.petName }} 长大了！</div>
				<div class="growth-stage">阶段 {{ growthData.from }} → 阶段 {{ growthData.to }}</div>
			</div>
			<template #footer><el-button type="primary" @click="growthVisible = false" round>太棒了！</el-button></template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
	import { ref, computed, onUnmounted, watch, onMounted } from 'vue'
	import { ElMessage } from 'element-plus'
	import { Refresh, Minus, WarningFilled, Edit, Close } from '@element-plus/icons-vue'
	import { getPetTypes, getPetList, syncPetDecay } from '@/api/request'
	import { DECAY_CONFIG, IS_DEBUG, getProgressColor, getPetImgHTML, getEggImgHTML, preloadAllPetImages } from './scripts/petResources'
	import { Sprite } from './scripts/types'
	import { useMovement } from './composables/useMovement'
	import { useDecay, useSync } from './composables/useGameLoop'
	import { useGameActions } from './composables/useGameActions'
	import { useOneClickFeed } from './composables/useOneClickFeed'

	const energyDecaySecsPerPoint = ref(DECAY_CONFIG.energyDecaySecsPerPoint)
	const moodDecaySecsPerPoint = ref(DECAY_CONFIG.moodDecaySecsPerPoint)
	const decayCheckSec = ref(DECAY_CONFIG.decayCheckSec)
	const syncToServerSec = ref(DECAY_CONFIG.syncToServerSec)

	const isLoading = ref(false)
	const loadingProgress = ref(0)
	const entering = ref(false)
	const gameVisible = ref(false)
	const isMinimized = ref(false)
	const loading = ref(false)
	const classId = ref(0)
	const className = ref('')
	const pets = ref<any[]>([])
	const petTypes = ref<any[]>([])
	const sprites = ref<Sprite[]>([])
	const selectedSprite = ref<Sprite | null>(null)
	const farmRef = ref<HTMLElement | null>(null)
	const gameInitialized = ref(false)
	const emit = defineEmits(['gameClose', 'minimize'])
	const eggSprites = computed(() => sprites.value.filter(s => !s.hasPet))
	const petSprites = computed(() => sprites.value.filter(s => s.hasPet))
	const availableFoods = computed(() => bagFoods.value.filter(f => (f.quantity || 0) > 0 && f.energy_add))
	const availableToys = computed(() => bagToys.value.filter(t => (t.quantity || 0) > 0 && t.mood_add))

	const { buildSpriteData, startMoveLoop, stopMoveLoop } = useMovement(sprites)
	const { startDecayLoop, stopDecayLoop } = useDecay(sprites, energyDecaySecsPerPoint, moodDecaySecsPerPoint, decayCheckSec)
	const { startSyncLoop, stopSyncLoop } = useSync(sprites, classId, syncToServerSec)

	const buildSprites = () => {
		const prevGroupId = selectedSprite.value?.groupId
		sprites.value = buildSpriteData(pets.value, sprites.value)
		if (prevGroupId) {
			const updated = sprites.value.find(s => s.groupId === prevGroupId)
			if (updated) selectedSprite.value = updated
		} else if (sprites.value.length > 0) {
			const first = sprites.value.find(s => s.hasPet) || sprites.value[0]
			selectedSprite.value = first
		}
	}

	const {
		adoptVisible, adoptType, adoptName, adoptGroupId, adoptGroupName, adopting,
		feedVisible, pickFood, feeding, bagFoods,
		interactVisible, pickToy, interacting, bagToys,
		growthVisible, growthData,
		detailBubble,
		onSpriteClick, onDetailPetClick,
		refreshPets, openAdoptForGroup, doAdopt,
		openFeed, doFeed, openInteract, doInteract
	} = useGameActions(sprites, selectedSprite, classId, pets, petTypes, loading, buildSprites)

	const {
		oneClickVisible,
		oneClickExecuting,
		oneClickPlan,
		openOneClickReplenish,
		executeOneClickPlan
	} = useOneClickFeed(sprites, classId, refreshPets)

	const formatProgress = (percentage: number) => {
		return `${percentage}%`
	}

	const loadGameResources = async () => {
		isLoading.value = true
		loadingProgress.value = 0

		await preloadAllPetImages((progress) => {
			loadingProgress.value = progress
		})
		isLoading.value = false
	}

	const enterGame = async () => {
		if (gameInitialized.value) return
		entering.value = true
		try {
			const cid = uni.getStorageSync('currentClassId')
			if (!cid) { ElMessage.warning('请先选择班级'); return }
			classId.value = cid
			const info = uni.getStorageSync('teacherInfo')
			className.value = info?.classes?.find((c : any) => c.id === cid)?.name || ''

			await loadGameResources()

			const [tRes, pRes] = await Promise.all([getPetTypes(), getPetList(cid)])
			if (tRes.code === 1) petTypes.value = tRes.data
			if (pRes.code === 1) {
			pets.value = pRes.data
			const now = Math.floor(Date.now() / 1000)
			const decayPets: Array<{ pet_id: number; energy: number; mood: number }> = []

			pets.value.forEach((pet: any) => {
				if (!pet.has_pet || !pet.id) return

				let energy = pet.energy ?? 60
				let mood = pet.mood ?? 60

				const lastFeed = pet.last_feed_at || now
				const elapsedEnergy = now - lastFeed
				if (elapsedEnergy > 0) {
					const energyDecay = Math.floor(elapsedEnergy / energyDecaySecsPerPoint.value)
					energy = Math.max(0, energy - energyDecay)
				}

				const lastInteract = pet.last_interact_at || now
				const elapsedMood = now - lastInteract
				if (elapsedMood > 0) {
					const moodDecay = Math.floor(elapsedMood / moodDecaySecsPerPoint.value)
					mood = Math.max(0, mood - moodDecay)
				}

				pet.energy = energy
				pet.mood = mood

				decayPets.push({
					pet_id: pet.id,
					energy: Math.round(energy),
					mood: Math.round(mood)
				})
			})

			if (decayPets.length > 0) {
				try {
					await syncPetDecay(cid, decayPets)
				} catch (e) {
					console.error('进入游戏时同步衰减数据失败', e)
				}
			}

			buildSprites()
		}
		gameVisible.value = true
		} catch (e) {
			console.error(e)
			ElMessage.error('进入游戏失败')
			isLoading.value = false
		}
		finally { entering.value = false }
	}

	const openGame = async () => {
		if (gameInitialized.value) return
		entering.value = true
		try {
			const cid = uni.getStorageSync('currentClassId')
			if (!cid) { ElMessage.warning('请先选择班级'); return }
			classId.value = cid
			const info = uni.getStorageSync('teacherInfo')
			className.value = info?.classes?.find((c : any) => c.id === cid)?.name || ''

			await loadGameResources()

			const [tRes, pRes] = await Promise.all([getPetTypes(), getPetList(cid)])
			if (tRes.code === 1) petTypes.value = tRes.data
			if (pRes.code === 1) {
			pets.value = pRes.data
			const now = Math.floor(Date.now() / 1000)
			const decayPets: Array<{ pet_id: number; energy: number; mood: number }> = []

			pets.value.forEach((pet: any) => {
				if (!pet.has_pet || !pet.id) return

				let energy = pet.energy ?? 60
				let mood = pet.mood ?? 60

				const lastFeed = pet.last_feed_at || now
				const elapsedEnergy = now - lastFeed
				if (elapsedEnergy > 0) {
					const energyDecay = Math.floor(elapsedEnergy / energyDecaySecsPerPoint.value)
					energy = Math.max(0, energy - energyDecay)
				}

				const lastInteract = pet.last_interact_at || now
				const elapsedMood = now - lastInteract
				if (elapsedMood > 0) {
					const moodDecay = Math.floor(elapsedMood / moodDecaySecsPerPoint.value)
					mood = Math.max(0, mood - moodDecay)
				}

				pet.energy = energy
				pet.mood = mood

				decayPets.push({
					pet_id: pet.id,
					energy: Math.round(energy),
					mood: Math.round(mood)
				})
			})

			if (decayPets.length > 0) {
				try {
					await syncPetDecay(cid, decayPets)
				} catch (e) {
					console.error('进入游戏时同步衰减数据失败', e)
				}
			}

			buildSprites()
		}
		gameVisible.value = true
		} catch (e) {
			console.error(e)
			ElMessage.error('进入游戏失败')
			isLoading.value = false
		}
		finally { entering.value = false }
	}

	const onGameOpened = () => { gameInitialized.value = true; startMoveLoop(); startDecayLoop(); startSyncLoop() }
	const onGameClose = () => {
		stopMoveLoop(); stopDecayLoop(); stopSyncLoop();
		if (!isMinimized.value) emit('gameClose', 'pet');
		gameInitialized.value = false
	}

	const minimizeGame = () => {
		isMinimized.value = true
		gameVisible.value = false
		stopMoveLoop()
		stopDecayLoop()
		stopSyncLoop()
		emit('minimize', 'pet', true)
		uni.$emit('petGameMinimized', true)
	}

	const restoreGame = () => {
		isMinimized.value = false
		gameVisible.value = true
		emit('minimize', 'pet', false)
		uni.$emit('petGameMinimized', false)
		setTimeout(() => {
			if (gameVisible.value) {
				startMoveLoop()
				startDecayLoop()
				startSyncLoop()
			}
		}, 100)
	}
	defineExpose({
		restoreGame,
		enterGame,
	})
	watch(decayCheckSec, () => { if (gameVisible.value) startDecayLoop() })
	watch(syncToServerSec, () => { if (gameVisible.value) startSyncLoop() })

	onMounted(() => { openGame() })
	onUnmounted(() => { stopMoveLoop(); stopDecayLoop(); stopSyncLoop() })
</script>

<style scoped src="./styles/PetGame.scss"></style>