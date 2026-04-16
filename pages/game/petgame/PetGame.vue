<template>
	<div class="pet-game-container">
		<!-- 游戏加载进度条 -->
		<div v-if="isLoading" class="loading-wrapper">
			<div class="loading-content">
				<p class="loading-text">宠物乐园 正在加载中...</p>
				<el-progress :percentage="loadingProgress" :stroke-width="15" :format="formatProgress" />
			</div>
		</div>

		<el-dialog v-model="gameVisible" width="92%" top="2vh" :show-close="true" :close-on-click-modal="false" append-to-body class="game-big-dialog" @opened="onGameOpened" @close="onGameClose">
			<div class="game-main">
				<div class="farm-scene" ref="farmRef">
					<div class="farm-area">
						<div class="eggs-bar" v-if="eggSprites.length > 0">
							<div v-for="(sp, idx) in eggSprites" :key="'egg-'+sp.groupId" class="egg-slot" @click.stop="onSpriteClick(sp)">
								<div class="egg-cloud"></div>
								<div class="egg-svg" v-html="getEggImgHTML(50)"></div>
								<div class="egg-label">
									<span class="egg-rank">{{ idx+1 }}</span>
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
							<div class="farm-barn"><div class="barn-roof"></div><div class="barn-body"><div class="barn-door"></div></div></div>
							<div class="farm-fence"></div>
							<div class="farm-tree ft1"><div class="trunk"></div><div class="crown"></div></div>
							<div class="farm-tree ft2"><div class="trunk"></div><div class="crown"></div></div>
							<div class="farm-tree ft3"><div class="trunk"></div><div class="crown"></div></div>
							<div class="farm-pond"></div>
							<div class="farm-path"></div>
							<div class="farm-flowers"><span>🌸</span><span>🌼</span><span>🌺</span></div>
						</div>

						<div class="sprites-layer">
							<div v-for="sp in petSprites" :key="sp.groupId" class="sprite-wrapper" :class="[sp.state, sp.direction, {'energy-critical': sp.energy <= 0, 'mood-critical': sp.mood <= 0}]" :style="{left: sp.x+'%', top: sp.y+'%', zIndex: Math.round(sp.y)}" @click.stop="onSpriteClick(sp)">
								<div class="sprite-info">
									<span class="sname">{{ sp.petName }}</span>
									<span class="sgroup">{{ sp.groupName }}</span>
									<span class="sstage">Lv.{{ sp.lifeStage }}</span>
								</div>
								<div class="sprite-bars">
									<div class="sbar-row">
										<span class="sbar-icon">⚡</span>
										<div class="sbar"><div class="sbar-fill energy" :style="{width: sp.energy+'%'}"></div></div>
									</div>
									<div class="sbar-row">
										<span class="sbar-icon">💖</span>
										<div class="sbar"><div class="sbar-fill mood" :style="{width: sp.mood+'%'}"></div></div>
									</div>
								</div>
								<div class="sprite-svg" :class="'stage-'+sp.lifeStage" v-html="getPetImgHTML(sp.petType, sp.lifeStage)"></div>
								<div v-if="sp.bubble" class="speech-bubble">{{ sp.bubble }}</div>
							</div>
						</div>
					</div>
				</div>

				<div class="sidebar">
					<div class="sidebar-header">
						<h3>{{ className || '宠物乐园' }}</h3>
						<el-button size="small" circle @click="refreshPets" :loading="loading"><el-icon><Refresh /></el-icon></el-button>
					</div>

					<div v-if="selectedSprite && selectedSprite.hasPet" class="pet-detail-card">
						<div class="detail-pet-area" @click="onDetailPetClick">
							<div class="detail-svg" :class="'stage-'+selectedSprite.lifeStage" v-html="getPetImgHTML(selectedSprite.petType, selectedSprite.lifeStage)"></div>
							<div v-if="detailBubble" class="detail-bubble">{{ detailBubble }}</div>
						</div>
						<div class="detail-name">{{ selectedSprite.petName }}</div>
						<div class="detail-group">{{ selectedSprite.groupName }}</div>
						<div class="detail-stage"><span v-for="i in 4" :key="i" class="sdot" :class="{on:i<=selectedSprite.lifeStage}">●</span><span class="stxt">阶段 {{ selectedSprite.lifeStage }}/4</span></div>
						<div class="detail-bars">
							<div class="dbar-item">
								<span class="dbar-icon">⚡能量</span>
								<div class="dbar-track"><div class="dbar-fill" :style="{width: selectedSprite.energy+'%', background: getProgressColor(selectedSprite.energy)}"></div></div>
								<span class="dbar-val" :style="{color: getProgressColor(selectedSprite.energy)}">{{ Math.round(selectedSprite.energy) }}%</span>
							</div>
							<div class="dbar-item">
								<span class="dbar-icon">💖心情</span>
								<div class="dbar-track"><div class="dbar-fill" :style="{width: selectedSprite.mood+'%', background: getProgressColor(selectedSprite.mood)}"></div></div>
								<span class="dbar-val" :style="{color: getProgressColor(selectedSprite.mood)}">{{ Math.round(selectedSprite.mood) }}%</span>
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
						<el-button type="primary" @click="openAdoptForGroup(selectedSprite.groupId)" round>立即领养</el-button>
					</div>

					<div v-else class="no-pet-card">
						<div class="no-pet-text">点击农场中的宠物或蛋</div>
					</div>

					<div v-if="IS_DEBUG" class="decay-config">
						<div class="config-title">⚙️ 衰减调试</div>
						<div class="config-row"><span>能量(秒/点)</span><el-input-number v-model="energyDecaySecsPerPoint" :min="10" :max="3600" :step="10" size="small" /></div>
						<div class="config-row"><span>心情(秒/点)</span><el-input-number v-model="moodDecaySecsPerPoint" :min="10" :max="3600" :step="10" size="small" /></div>
						<div class="config-row"><span>检测间隔(秒)</span><el-input-number v-model="decayCheckSec" :min="5" :max="120" :step="5" size="small" /></div>
						<div class="config-row"><span>同步后台(秒)</span><el-input-number v-model="syncToServerSec" :min="10" :max="600" :step="10" size="small" /></div>
					</div>
				</div>
			</div>
		</el-dialog>

		<el-dialog v-model="adoptVisible" title="🐣 领养宠物" width="620px" append-to-body>
			<div class="adopt-body">
				<div class="adopt-info">为 <b>{{ adoptGroupName }}</b> 领养宠物</div>
				<div class="adopt-scroll">
					<div class="adopt-grid">
						<div v-for="t in petTypes" :key="t.code" class="adopt-card" :class="{picked: adoptType===t.code}" @click="adoptType=t.code">
							<div class="adopt-svg" v-html="getPetImgHTML(t.code, 1)"></div>
							<div class="adopt-name">{{ t.name }}</div>
						</div>
					</div>
				</div>
				<el-input v-model="adoptName" placeholder="给宠物起个名字（可选）" style="margin-top:15px" />
			</div>
			<template #footer>
				<el-button @click="adoptVisible=false">取消</el-button>
				<el-button type="primary" @click="doAdopt" :loading="adopting" :disabled="!adoptType">确认领养</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="feedVisible" title="🍖 喂养宠物" width="420px" append-to-body>
			<div v-if="selectedSprite" class="feed-body">
				<div class="feed-pet-info"><span class="feed-svg" v-html="getPetImgHTML(selectedSprite.petType!, selectedSprite.lifeStage!)"></span><span>{{ selectedSprite.petName }}</span><el-tag size="small">能量 {{ Math.round(selectedSprite.energy) }}%</el-tag></div>
				<div class="feed-list">
					<div v-for="f in bagFoods" :key="f.item_code" class="feed-item" :class="{picked:pickFood===f.item_code}" @click="pickFood=f.item_code">
						<span class="feed-icon">🍖</span><div class="feed-info"><div>{{ f.item_name }}</div><div class="feed-effect">+{{ f.energy_add }} 能量</div></div><el-tag size="small" type="info">x{{ f.quantity }}</el-tag>
					</div>
					<el-empty v-if="bagFoods.length===0" description="没有食物了" :image-size="60" />
				</div>
			</div>
			<template #footer>
				<el-button @click="feedVisible=false">取消</el-button>
				<el-button type="primary" @click="doFeed" :loading="feeding" :disabled="!pickFood">确认</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="interactVisible" title="🎾 与宠物互动" width="420px" append-to-body>
			<div v-if="selectedSprite" class="feed-body">
				<div class="feed-pet-info"><span class="feed-svg" v-html="getPetImgHTML(selectedSprite.petType!, selectedSprite.lifeStage!)"></span><span>{{ selectedSprite.petName }}</span><el-tag size="small">心情 {{ Math.round(selectedSprite.mood) }}%</el-tag></div>
				<div class="feed-list">
					<div v-for="t in bagToys" :key="t.item_code" class="feed-item" :class="{picked:pickToy===t.item_code}" @click="pickToy=t.item_code">
						<span class="feed-icon">🎾</span><div class="feed-info"><div>{{ t.item_name }}</div><div class="feed-effect">+{{ t.mood_add }} 心情</div></div><el-tag size="small" type="info">x{{ t.quantity }}</el-tag>
					</div>
					<el-empty v-if="bagToys.length===0" description="没有玩具了" :image-size="60" />
				</div>
			</div>
			<template #footer>
				<el-button @click="interactVisible=false">取消</el-button>
				<el-button type="primary" @click="doInteract" :loading="interacting" :disabled="!pickToy">确认</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="growthVisible" title="🎉 恭喜！" width="320px" center append-to-body>
			<div class="growth-body">
				<div class="growth-svg" v-html="getPetImgHTML(growthData.petType, growthData.to)"></div>
				<div class="growth-text">{{ growthData.petName }} 长大了！</div>
				<div class="growth-stage">阶段 {{ growthData.from }} → 阶段 {{ growthData.to }}</div>
			</div>
			<template #footer><el-button type="primary" @click="growthVisible=false" round>太棒了！</el-button></template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getPetTypes, getPetList } from '@/api/request'
import { DECAY_CONFIG, IS_DEBUG, getProgressColor, getPetImgHTML, getEggImgHTML } from './petResources'
import { Sprite } from './types'
import { useMovement } from './useMovement'
import { useDecay, useSync } from './useGameLoop'
import { useGameActions } from './useGameActions'

const energyDecaySecsPerPoint = ref(DECAY_CONFIG.energyDecaySecsPerPoint)
const moodDecaySecsPerPoint = ref(DECAY_CONFIG.moodDecaySecsPerPoint)
const decayCheckSec = ref(DECAY_CONFIG.decayCheckSec)
const syncToServerSec = ref(DECAY_CONFIG.syncToServerSec)

const isLoading = ref(false)
const loadingProgress = ref(0)
const entering = ref(false)
const gameVisible = ref(false)
const loading = ref(false)
const classId = ref(0)
const className = ref('')
const pets = ref<any[]>([])
const petTypes = ref<any[]>([])
const sprites = ref<Sprite[]>([])
const selectedSprite = ref<Sprite | null>(null)
const farmRef = ref<HTMLElement | null>(null)
const emit = defineEmits(['gameClose'])
const eggSprites = computed(() => sprites.value.filter(s => !s.hasPet))
const petSprites = computed(() => sprites.value.filter(s => s.hasPet))

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

const formatProgress = (percentage: number) => {
	return `${percentage}%`
}

const loadGameResources = async () => {
	isLoading.value = true
	loadingProgress.value = 0

	const startTime = Date.now()
	const minLoadingTime = 1000 // 最小加载时间 1 秒

	// 模拟加载资源
	const resources = ['宠物数据', '游戏资源', '场景加载']
	for (let i = 0; i < resources.length; i++) {
		const progress = (i + 1) / resources.length * 100
		await new Promise(resolve => {
			setTimeout(() => {
				loadingProgress.value = Math.round(progress)
				resolve(undefined)
			}, 300)
		})
	}

	// 确保最小加载时间
	const elapsedTime = Date.now() - startTime
	if (elapsedTime < minLoadingTime) {
		await new Promise(resolve => {
			setTimeout(resolve, minLoadingTime - elapsedTime)
		})
	}

	// 完成加载
	loadingProgress.value = 100
	await new Promise(resolve => setTimeout(resolve, 300))
	
	isLoading.value = false
}

const openGame = async () => {
	console.log('xxxxxxxx')
	entering.value = true
	try {
		const cid = uni.getStorageSync('currentClassId')
		if (!cid) { ElMessage.warning('请先选择班级'); return }
		classId.value = cid
		const info = uni.getStorageSync('teacherInfo')
		className.value = info?.classes?.find((c: any) => c.id === cid)?.name || ''
		
		// 先加载游戏资源
		await loadGameResources()
		
		// 加载完成后获取数据
		const [tRes, pRes] = await Promise.all([getPetTypes(), getPetList(cid)])
		if (tRes.code === 1) petTypes.value = tRes.data
		if (pRes.code === 1) { pets.value = pRes.data; buildSprites() }
		gameVisible.value = true
	} catch (e) { 
		console.error(e)
		ElMessage.error('进入游戏失败')
		isLoading.value = false
	}
	finally { entering.value = false }
}

const onGameOpened = () => { startMoveLoop(); startDecayLoop(); startSyncLoop() }
const onGameClose = () => { stopMoveLoop(); stopDecayLoop(); stopSyncLoop();emit('gameClose', '')  }

watch(decayCheckSec, () => { if (gameVisible.value) startDecayLoop() })
watch(syncToServerSec, () => { if (gameVisible.value) startSyncLoop() })

onMounted (()=>{openGame()})
onUnmounted(() => { stopMoveLoop(); stopDecayLoop(); stopSyncLoop() })
</script>

<style scoped>
.pet-game-container { width:100%; height:100%; }

.loading-wrapper {
	width:100%; height:100%;
	display:flex; align-items:center; justify-content:center;
	background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
	border-radius:8px;
}

.loading-content {
	width:100%; max-width:400px; padding:40px;
}

.loading-text {
	text-align:center; color:#fff; font-size:16px; margin-bottom:20px;
}

.game-entry { width:100%; height:100%; position:relative; overflow:hidden; border-radius:8px; cursor:pointer; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); }
.entry-bg { position:absolute; inset:0; background:radial-gradient(circle at 30% 70%,rgba(255,255,255,0.1) 0%,transparent 50%); }
.entry-content { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; padding:20px; }
.entry-pets { margin-bottom:20px; display:flex; gap:15px; }
.float-pet { font-size:40px; display:inline-block; animation:floatPet 2s ease-in-out infinite; }
@keyframes floatPet { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-15px) scale(1.1)} }
.entry-title { font-size:32px; font-weight:700; margin:0 0 8px; text-shadow:2px 2px 4px rgba(0,0,0,0.2); }
.entry-desc { font-size:16px; opacity:0.85; margin:0 0 25px; }
.entry-btn { padding:14px 50px; font-size:18px; }

.game-big-dialog :deep(.el-dialog__body) { padding:0!important; overflow:hidden; }
.game-big-dialog :deep(.el-dialog__header) { padding:8px 16px; }
.game-main { width:100%; height:82vh; display:flex; }

.farm-scene { flex:1; position:relative; overflow:hidden; }

.farm-area { width:100%; height:100%; position:relative; overflow:hidden; background:url('/web/static/game/pet/bg_farm.svg') no-repeat center center; background-size:cover; }

.sprites-layer { position:absolute; inset:0; z-index:10; overflow:hidden; }

.eggs-bar {
	position:absolute;  left:50%; transform:translateX(-50%);
	display:flex; gap:12px; z-index:15; padding:6px 10px;
	justify-content:center; flex-wrap:wrap;
}
.egg-slot {
	display:flex; flex-direction:column; align-items:center; cursor:pointer;
	transition:transform 0.3s; position:relative;
}
.egg-slot:hover { transform:scale(1.15) translateY(-5px); }
.egg-cloud {
	position:absolute; bottom:40px; width:50px; height:16px;
	background:rgba(255,255,255,0.7); border-radius:50%;
	filter:blur(2px);
}
.egg-svg { position:relative; z-index:1; animation:eggFloat 3s ease-in-out infinite; }
@keyframes eggFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
.egg-label { display:flex; flex-direction:column; align-items:center; margin-top:2px; position:relative; z-index:1; }
.egg-rank {
	width:24px; height:24px; background:#FF9800; color:#fff; border-radius:50%;
	display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700;
	margin-bottom:2px; box-shadow:0 2px 4px rgba(255,152,0,0.4);
}
.egg-group { font-size:13px; color:#fff; background:rgba(64,158,255,0.8); padding:2px 10px; border-radius:8px; font-weight:500; }

.sprite-wrapper { position:absolute; display:flex; flex-direction:column; align-items:center; cursor:pointer; transition:top 0.1s linear, left 0.1s linear; perspective:300px; }
.sprite-wrapper:hover { z-index:100!important; filter:brightness(1.1); }

.sprite-wrapper.walking .sprite-svg { animation:petWalk 0.35s ease-in-out infinite; }
.sprite-wrapper.idle .sprite-svg { animation:petIdle 2s ease-in-out infinite; }

@keyframes petWalk { 0%,100%{transform:rotateY(0deg) translateY(0)} 50%{transform:rotateY(0deg) translateY(-6px)} }
@keyframes petIdle { 0%,100%{transform:rotateY(0deg) scale(1) translateY(0)} 50%{transform:rotateY(0deg) scale(1.03) translateY(-2px)} }

.sprite-wrapper.right .sprite-svg { transform:rotateY(0deg); transition:transform 0.3s ease; }
.sprite-wrapper.left .sprite-svg { transform:rotateY(180deg); transition:transform 0.3s ease; }
.sprite-wrapper.walking.right .sprite-svg { animation:petWalkRight 0.35s ease-in-out infinite; }
.sprite-wrapper.walking.left .sprite-svg { animation:petWalkLeft 0.35s ease-in-out infinite; }
@keyframes petWalkRight { 0%,100%{transform:rotateY(0deg) translateY(0)} 50%{transform:rotateY(0deg) translateY(-6px)} }
@keyframes petWalkLeft { 0%,100%{transform:rotateY(180deg) translateY(0)} 50%{transform:rotateY(180deg) translateY(-6px)} }

.sprite-svg.stage-1 { transform-origin:center bottom; }
.sprite-svg.stage-2 { transform-origin:center bottom; }
.sprite-svg.stage-3 { transform-origin:center bottom; }
.sprite-svg.stage-4 { transform-origin:center bottom; }

.sprite-info { display:flex; align-items:center; gap:4px; margin-bottom:3px; flex-wrap:nowrap; }
.sname { font-size:13px; font-weight:700; color:#fff; background:rgba(0,0,0,0.55); padding:2px 8px; border-radius:8px; white-space:nowrap; }
.sgroup { font-size:11px; color:#fff; background:rgba(64,158,255,0.75); padding:1px 6px; border-radius:6px; white-space:nowrap; }
.sstage { font-size:11px; color:#fff; background:rgba(231,76,60,0.8); padding:1px 6px; border-radius:6px; font-weight:600; white-space:nowrap; }

.sprite-bars { display:flex; flex-direction:column; gap:2px; margin-bottom:4px; width:100%; max-width:110px; }
.sbar-row { display:flex; align-items:center; gap:3px; }
.sbar-icon { font-size:10px; flex-shrink:0; line-height:1; }
.sbar { flex:1; height:7px; background:rgba(0,0,0,0.15); border-radius:4px; overflow:hidden; }
.sbar-fill { height:100%; border-radius:4px; transition:width 0.5s; }
.sbar-fill.energy { background:linear-gradient(90deg,#f56c6c,#e6a23c,#67c23a); }
.sbar-fill.mood { background:linear-gradient(90deg,#f56c6c,#409eff,#67c23a); }

.sprite-wrapper.energy-critical .sbar-row:first-child .sbar {
	animation:barFlash 1s ease-in-out infinite;
}
.sprite-wrapper.mood-critical .sbar-row:last-child .sbar {
	animation:barFlash 1s ease-in-out infinite;
}
@keyframes barFlash {
	0%,100% { box-shadow:0 0 0 2px rgba(245,108,108,0); }
	50% { box-shadow:0 0 0 2px rgba(245,108,108,0.9); }
}

.speech-bubble { position:absolute; top:-30px; left:50%; transform:translateX(-50%); background:#fff; border-radius:12px; padding:4px 8px; font-size:20px; box-shadow:0 2px 8px rgba(0,0,0,0.15); animation:bubblePop 0.3s ease-out; z-index:30; }
.speech-bubble::after { content:''; position:absolute; bottom:-6px; left:50%; transform:translateX(-50%); border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #fff; }
@keyframes bubblePop { 0%{transform:translateX(-50%) scale(0)} 100%{transform:translateX(-50%) scale(1)} }

.sidebar { width:300px; background:#fff; border-left:1px solid #eee; display:flex; flex-direction:column; padding:15px; overflow-y:auto; }
.sidebar-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; }
.sidebar-header h3 { margin:0; font-size:16px; }

.pet-detail-card { background:#f8f9fa; border-radius:12px; padding:20px; text-align:center; margin-bottom:15px; }
.detail-pet-area { position:relative; display:inline-block; cursor:pointer; margin-bottom:10px; }
.detail-svg { animation:petIdle 2s ease-in-out infinite; }
.detail-svg.stage-1 img { max-width:140px; height:auto; }
.detail-svg.stage-2 img { max-width:175px; height:auto; }
.detail-svg.stage-3 img { max-width:220px; height:auto; }
.detail-svg.stage-4 img { max-width:280px; height:auto; }

.detail-bubble { position:absolute; top:-10px; right:-20px; background:#fff; border-radius:14px; padding:6px 10px; font-size:24px; box-shadow:0 2px 10px rgba(0,0,0,0.15); animation:bubblePop 0.3s ease-out; z-index:30; }

.detail-name { font-size:20px; font-weight:600; color:#333; }
.detail-group { font-size:13px; color:#999; margin-bottom:10px; }
.detail-stage { margin-bottom:12px; }
.sdot { font-size:16px; color:#ddd; margin:0 2px; transition:color 0.3s; }
.sdot.on { color:#409eff; }
.stxt { font-size:12px; color:#999; margin-left:5px; }
.detail-bars { text-align:left; }
.dbar-item { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
.dbar-icon { font-size:18px; flex-shrink:0; }
.dbar-track { flex:1; height:18px; background:#e8e8e8; border-radius:9px; overflow:hidden; position:relative; }
.dbar-fill { height:100%; border-radius:9px; transition:width 0.5s; }
.dbar-val { font-size:18px; font-weight:800; min-width:48px; text-align:right; text-shadow:0 0 4px rgba(255,255,255,0.8), 0 1px 2px rgba(0,0,0,0.2); }
.detail-growth { font-size:12px; color:#e6a23c; margin:8px 0; }
.detail-actions { display:flex; gap:10px; justify-content:center; }

.no-pet-card { background:#f8f9fa; border-radius:12px; padding:30px; text-align:center; margin-bottom:15px; }
.no-pet-egg { margin-bottom:10px; }
.no-pet-text { font-size:14px; color:#999; margin-bottom:15px; }

.decay-config { margin-top:auto; background:#f0f0f0; border-radius:8px; padding:12px; }
.config-title { font-size:13px; font-weight:600; color:#666; margin-bottom:8px; }
.config-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-size:12px; color:#666; }
.config-row :deep(.el-input-number) { width:100px; }

.adopt-body { padding:5px 0; }
.adopt-info { margin-bottom:15px; font-size:14px; color:#666; }
.adopt-scroll { max-height:320px; overflow-y:auto; }
.adopt-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(90px, 1fr)); gap:12px; }
.adopt-card { display:flex; flex-direction:column; align-items:center; padding:12px 8px; border:2px solid #eee; border-radius:12px; cursor:pointer; transition:all 0.2s; }
.adopt-card:hover { border-color:#409eff; background:#f0f7ff; }
.adopt-card.picked { border-color:#409eff; background:#e1f0ff; box-shadow:0 0 8px rgba(64,158,255,0.3); }
.adopt-svg img { max-width:80px; height:auto; }
.adopt-name { font-size:14px; color:#333; margin-top:6px; font-weight:500; }

.feed-body { padding:5px 0; }
.feed-pet-info { display:flex; align-items:center; gap:8px; padding:10px; background:#f5f5f5; border-radius:8px; margin-bottom:12px; }
.feed-svg img { max-width:56px; height:auto; }
.feed-list { max-height:280px; overflow-y:auto; }
.feed-item { display:flex; align-items:center; gap:10px; padding:10px; border:2px solid #eee; border-radius:8px; margin-bottom:8px; cursor:pointer; transition:all 0.2s; }
.feed-item:hover { border-color:#409eff; }
.feed-item.picked { border-color:#409eff; background:#f0f7ff; }
.feed-icon { font-size:22px; }
.feed-info { flex:1; }
.feed-info div:first-child { font-size:14px; font-weight:500; }
.feed-effect { font-size:12px; color:#67c23a; }

.growth-body { text-align:center; padding:15px; }
.growth-svg img { max-width:160px; height:auto; animation:floatPet 1s ease-in-out infinite; }
.growth-text { font-size:18px; font-weight:600; color:#333; margin:10px 0 8px; }
.growth-stage { font-size:14px; color:#409eff; }
</style>
