<template>
	<div class="pet-game-container">
		<div class="game-entry" @click="openGame">
			<div class="entry-bg"></div>
			<div class="entry-content">
				<div class="entry-pets">
					<span class="float-pet" style="animation-delay:0s">🐷</span>
					<span class="float-pet" style="animation-delay:0.5s">🐶</span>
					<span class="float-pet" style="animation-delay:1s">🐱</span>
					<span class="float-pet" style="animation-delay:1.5s">🐰</span>
					<span class="float-pet" style="animation-delay:2s">🐼</span>
				</div>
				<h1 class="entry-title">小组宠物乐园</h1>
				<p class="entry-desc">和小组同学一起养育专属宠物吧！</p>
				<el-button type="primary" size="large" round class="entry-btn" :loading="entering">进入游戏</el-button>
			</div>
		</div>

		<el-dialog v-model="gameVisible" width="92%" top="2vh" :show-close="true" :close-on-click-modal="false" append-to-body class="game-big-dialog" @opened="onGameOpened" @close="onGameClose">
			<div class="game-main">
				<div class="farm-scene" ref="farmRef">
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

					<div class="eggs-bar">
						<div v-for="(sp, idx) in eggSprites" :key="'egg-'+sp.groupId" class="egg-slot" @click.stop="onSpriteClick(sp)">
							<div class="egg-cloud"></div>
							<div class="egg-svg" v-html="getEggImgHTML(70)"></div>
							<div class="egg-label">
								<span class="egg-rank">{{ idx+1 }}</span>
								<span class="egg-group">{{ sp.groupName }}</span>
							</div>
						</div>
					</div>

					<div class="sprites-layer">
						<div v-for="sp in petSprites" :key="sp.groupId" class="sprite-wrapper" :class="[sp.state, sp.direction]" :style="{left: sp.x+'%', top: sp.y+'%'}" @click.stop="onSpriteClick(sp)">
							<div class="sprite-bars">
								<div class="sbar"><div class="sbar-fill energy" :style="{width: sp.energy+'%'}"></div></div>
								<div class="sbar"><div class="sbar-fill mood" :style="{width: sp.mood+'%'}"></div></div>
							</div>
							<div class="sprite-svg" :class="'stage-'+sp.lifeStage" v-html="getPetImgHTML(sp.petType, sp.lifeStage)"></div>
							<div class="sprite-label">
								<span class="sname">{{ sp.petName }}</span>
								<span class="sgroup">{{ sp.groupName }}</span>
								<span class="sstage">Lv.{{ sp.lifeStage }}</span>
							</div>
							<div v-if="sp.bubble" class="speech-bubble">{{ sp.bubble }}</div>
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
							<div class="dbar-item"><span class="dbar-icon">⚡</span><el-progress :percentage="Math.round(selectedSprite.energy)" :color="getProgressColor(selectedSprite.energy)" :stroke-width="14" :text-inside="true" :format="(p:number)=>'能量 '+p+'%'" /></div>
							<div class="dbar-item"><span class="dbar-icon">💖</span><el-progress :percentage="Math.round(selectedSprite.mood)" :color="getProgressColor(selectedSprite.mood)" :stroke-width="14" :text-inside="true" :format="(p:number)=>'心情 '+p+'%'" /></div>
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

					<div class="decay-config">
						<div class="config-title">⚙️ 衰减调试</div>
						<div class="config-row"><span>能量衰减/秒</span><el-input-number v-model="energyDecayPerSec" :min="0" :max="10" :step="0.1" size="small" /></div>
						<div class="config-row"><span>心情衰减/秒</span><el-input-number v-model="moodDecayPerSec" :min="0" :max="10" :step="0.1" size="small" /></div>
						<div class="config-row"><span>检测间隔(秒)</span><el-input-number v-model="decayCheckSec" :min="1" :max="60" :step="1" size="small" /></div>
						<div class="config-row"><span>同步后台(秒)</span><el-input-number v-model="syncToServerSec" :min="5" :max="300" :step="5" size="small" /></div>
					</div>
				</div>
			</div>
		</el-dialog>

		<el-dialog v-model="adoptVisible" title="🐣 领养宠物" width="620px" append-to-body>
			<div class="adopt-body">
				<div class="adopt-info">为 <b>{{ adoptGroupName }}</b> 领养宠物</div>
				<div class="adopt-scroll">
					<div class="adopt-flex">
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
import { ref, computed, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getPetTypes, getPetList, adoptPet, feedPet, interactPet, getPetBag, syncPetDecay } from '@/api/request'
import { BUBBLE_EMOJIS, DECAY_CONFIG, PET_TYPES, getProgressColor, getPetImgHTML, getEggImgHTML } from './petResources'

// ============ 可配置衰减参数 - 修改这里调整游戏速度 ============
const energyDecayPerSec = ref(DECAY_CONFIG.energyDecayPerSec)
const moodDecayPerSec = ref(DECAY_CONFIG.moodDecayPerSec)
const decayCheckSec = ref(DECAY_CONFIG.decayCheckSec)
const syncToServerSec = ref(DECAY_CONFIG.syncToServerSec)
// ============================================================

interface Sprite {
	groupId: number
	groupName: string
	hasPet: boolean
	petId?: number
	petType?: string
	petName?: string
	lifeStage?: number
	energy: number
	mood: number
	growthFeedCount?: number
	x: number
	y: number
	targetX: number
	targetY: number
	direction: 'left' | 'right'
	state: 'idle' | 'walking'
	bubble: string | null
	bubbleTimer: number | null
	moveTimer: number
}

interface BagItem { id:number; item_code:string; item_name:string; quantity:number; energy_add?:number; mood_add?:number }

const entering = ref(false)
const gameVisible = ref(false)
const loading = ref(false)
const classId = ref(0)
const className = ref('')
const pets = ref<any[]>([])
const petTypes = ref<any[]>([])
const sprites = ref<Sprite[]>([])
const selectedSprite = ref<Sprite | null>(null)
const hoveredSprite = ref<Sprite | null>(null)
const farmRef = ref<HTMLElement | null>(null)

const adoptVisible = ref(false)
const adoptType = ref('')
const adoptName = ref('')
const adoptGroupId = ref<number>(0)
const adoptGroupName = ref('')
const adopting = ref(false)

const feedVisible = ref(false)
const pickFood = ref('')
const feeding = ref(false)
const bagFoods = ref<BagItem[]>([])

const interactVisible = ref(false)
const pickToy = ref('')
const interacting = ref(false)
const bagToys = ref<BagItem[]>([])

const growthVisible = ref(false)
const growthData = ref({ petType:'', petName:'', from:1, to:2 })

const detailBubble = ref<string | null>(null)
let detailBubbleTimer: number | null = null

let moveInterval: number | null = null
let decayInterval: number | null = null
let syncInterval: number | null = null
let lastDecayTime = 0

const eggSprites = computed(() => sprites.value.filter(s => !s.hasPet))
const petSprites = computed(() => sprites.value.filter(s => s.hasPet))

// ============ 游戏逻辑 ============
const openGame = async () => {
	entering.value = true
	try {
		const cid = uni.getStorageSync('currentClassId')
		if (!cid) { ElMessage.warning('请先选择班级'); return }
		classId.value = cid
		const info = uni.getStorageSync('teacherInfo')
		className.value = info?.classes?.find((c: any) => c.id === cid)?.name || ''
		const [tRes, pRes] = await Promise.all([getPetTypes(), getPetList(cid)])
		if (tRes.code === 1) petTypes.value = tRes.data
		if (pRes.code === 1) {
			pets.value = pRes.data
			buildSprites()
		}
		gameVisible.value = true
	} catch (e) { console.error(e); ElMessage.error('进入游戏失败') }
	finally { entering.value = false }
}

const buildSprites = () => {
	const prevGroupId = selectedSprite.value?.groupId
	sprites.value = pets.value.map((p: any, i: number) => {
		const existing = sprites.value.find(s => s.groupId === p.group_id)
		return {
			groupId: p.group_id,
			groupName: p.group_name,
			hasPet: p.has_pet,
			petId: p.id,
			petType: p.pet_type,
			petName: p.pet_name,
			lifeStage: p.life_stage || 1,
			energy: p.energy ?? 60,
			mood: p.mood ?? 60,
			growthFeedCount: p.growth_feed_count || 0,
			x: existing?.x ?? (10 + Math.random() * 70),
			y: existing?.y ?? (45 + Math.random() * 35),
			targetX: existing?.targetX ?? (10 + Math.random() * 70),
			targetY: existing?.targetY ?? (45 + Math.random() * 35),
			direction: existing?.direction ?? 'right',
			state: existing?.state ?? 'idle',
			bubble: null,
			bubbleTimer: null,
			moveTimer: Math.floor(Math.random() * 100)
		}
	})
	if (prevGroupId) {
		const updated = sprites.value.find(s => s.groupId === prevGroupId)
		if (updated) selectedSprite.value = updated
	} else if (sprites.value.length > 0) {
		const first = sprites.value.find(s => s.hasPet) || sprites.value[0]
		selectedSprite.value = first
	}
}

const refreshPets = async () => {
	loading.value = true
	try {
		const res = await getPetList(classId.value)
		if (res.code === 1) { pets.value = res.data; buildSprites(); ElMessage.success('刷新成功') }
	} catch (e) { ElMessage.error('刷新失败') }
	finally { loading.value = false }
}

const onGameOpened = () => { startMoveLoop(); startDecayLoop(); startSyncLoop() }
const onGameClose = () => { stopMoveLoop(); stopDecayLoop(); stopSyncLoop() }

// ============ 移动系统 ============
const startMoveLoop = () => {
	if (moveInterval) return
	moveInterval = window.setInterval(() => {
		sprites.value.forEach(sp => {
			if (!sp.hasPet) return
			sp.moveTimer++
			if (sp.state === 'idle' && sp.moveTimer > 60 + Math.random() * 120) {
				sp.targetX = 8 + Math.random() * 72
				sp.targetY = 45 + Math.random() * 35
				sp.state = 'walking'
				sp.direction = sp.targetX > sp.x ? 'right' : 'left'
				sp.moveTimer = 0
			}
			if (sp.state === 'walking') {
				const dx = sp.targetX - sp.x
				const dy = sp.targetY - sp.y
				const dist = Math.sqrt(dx * dx + dy * dy)
				if (dist < 2) {
					sp.state = 'idle'
				} else {
					sp.x += dx / dist * 0.4
					sp.y += dy / dist * 0.3
				}
			}
		})
	}, 50)
}
const stopMoveLoop = () => { if (moveInterval) { clearInterval(moveInterval); moveInterval = null } }

// ============ 衰减系统 ============
const startDecayLoop = () => {
	lastDecayTime = Date.now()
	stopDecayLoop()
	decayInterval = window.setInterval(() => {
		const now = Date.now()
		const elapsed = (now - lastDecayTime) / 1000
		lastDecayTime = now
		sprites.value.forEach(sp => {
			if (!sp.hasPet) return
			sp.energy = Math.max(0, sp.energy - elapsed * energyDecayPerSec.value)
			sp.mood = Math.max(0, sp.mood - elapsed * moodDecayPerSec.value)
		})
	}, decayCheckSec.value * 1000)
}

const stopDecayLoop = () => { if (decayInterval) { clearInterval(decayInterval); decayInterval = null } }

// ============ 同步系统 ============
const startSyncLoop = () => {
	stopSyncLoop()
	syncInterval = window.setInterval(async () => {
		const petSprites = sprites.value.filter(s => s.hasPet && s.petId)
		if (petSprites.length === 0 || !classId.value) return

		const petsData = petSprites.map(sp => ({
			pet_id: sp.petId!,
			energy: Math.round(sp.energy),
			mood: Math.round(sp.mood)
		}))

		try {
			await syncPetDecay(classId.value, petsData)
		} catch (e) {
			console.error('同步衰减数据失败', e)
		}
	}, syncToServerSec.value * 1000)
}
const stopSyncLoop = () => { if (syncInterval) { clearInterval(syncInterval); syncInterval = null } }

watch(decayCheckSec, () => { if (gameVisible.value) startDecayLoop() })
watch(syncToServerSec, () => { if (gameVisible.value) startSyncLoop() })

// ============ 交互 ============
const onSpriteClick = (sp: Sprite) => {
	selectedSprite.value = sp
	if (sp.hasPet) {
		showBubble(sp)
	} else {
		openAdoptForGroup(sp.groupId)
	}
}

const showBubble = (sp: Sprite) => {
	sp.bubble = BUBBLE_EMOJIS[Math.floor(Math.random() * BUBBLE_EMOJIS.length)]
	if (sp.bubbleTimer) clearTimeout(sp.bubbleTimer)
	sp.bubbleTimer = window.setTimeout(() => { sp.bubble = null }, 2000)
}

const onDetailPetClick = () => {
	if (!selectedSprite.value?.hasPet) return
	const emoji = BUBBLE_EMOJIS[Math.floor(Math.random() * BUBBLE_EMOJIS.length)]
	detailBubble.value = emoji
	if (detailBubbleTimer) clearTimeout(detailBubbleTimer)
	detailBubbleTimer = window.setTimeout(() => { detailBubble.value = null }, 2000)
}

// ============ 领养 ============
const openAdoptForGroup = (groupId: number) => {
	const sp = sprites.value.find(s => s.groupId === groupId)
	if (!sp || sp.hasPet) return
	adoptGroupId.value = groupId
	adoptGroupName.value = sp.groupName
	adoptType.value = ''
	adoptName.value = ''
	adoptVisible.value = true
}

const doAdopt = async () => {
	if (!adoptType.value) { ElMessage.warning('请选择宠物'); return }
	adopting.value = true
	try {
		const res = await adoptPet({ class_id: classId.value, group_id: adoptGroupId.value, pet_type: adoptType.value, pet_name: adoptName.value || undefined })
		if (res.code === 1) { ElMessage.success('领养成功！'); adoptVisible.value = false; await refreshPets() }
		else { ElMessage.error(res.msg || '领养失败') }
	} catch (e) { ElMessage.error('领养失败') }
	finally { adopting.value = false }
}

// ============ 喂养 ============
const openFeed = async () => {
	if (!selectedSprite.value?.hasPet) return
	pickFood.value = ''
	try {
		const res = await getPetBag(classId.value, selectedSprite.value.groupId)
		if (res.code === 1) { bagFoods.value = res.data.foods || []; bagToys.value = res.data.toys || [] }
	} catch (e) { ElMessage.error('获取背包失败') }
	feedVisible.value = true
}

const doFeed = async () => {
	if (!selectedSprite.value || !pickFood.value) return
	feeding.value = true
	try {
		const res = await feedPet({ pet_id: selectedSprite.value.petId!, food_code: pickFood.value, class_id: classId.value, group_id: selectedSprite.value.groupId })
		if (res.code === 1) {
			ElMessage.success(`喂养成功！能量 +${res.data.energy_add}`)
			feedVisible.value = false
			if (res.data.is_growth_trigger === 1) {
				growthData.value = { petType: selectedSprite.value.petType!, petName: selectedSprite.value.petName!, from: res.data.life_stage_before, to: res.data.life_stage_after }
				growthVisible.value = true
			}
			await refreshPets()
		} else { ElMessage.error(res.msg || '喂养失败') }
	} catch (e) { ElMessage.error('喂养失败') }
	finally { feeding.value = false }
}

// ============ 互动 ============
const openInteract = async () => {
	if (!selectedSprite.value?.hasPet) return
	pickToy.value = ''
	try {
		const res = await getPetBag(classId.value, selectedSprite.value.groupId)
		if (res.code === 1) { bagFoods.value = res.data.foods || []; bagToys.value = res.data.toys || [] }
	} catch (e) { ElMessage.error('获取背包失败') }
	interactVisible.value = true
}

const doInteract = async () => {
	if (!selectedSprite.value || !pickToy.value) return
	interacting.value = true
	try {
		const res = await interactPet({ pet_id: selectedSprite.value.petId!, toy_code: pickToy.value, class_id: classId.value, group_id: selectedSprite.value.groupId })
		if (res.code === 1) { ElMessage.success(`互动成功！心情 +${res.data.mood_add}`); interactVisible.value = false; await refreshPets() }
		else { ElMessage.error(res.msg || '互动失败') }
	} catch (e) { ElMessage.error('互动失败') }
	finally { interacting.value = false }
}

onUnmounted(() => { stopMoveLoop(); stopDecayLoop(); stopSyncLoop() })
</script>

<style scoped>
.pet-game-container { width:100%; height:100%; }

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

/* ===== 农场场景 ===== */
.farm-scene { flex:1; position:relative; overflow:hidden; background:linear-gradient(180deg,#87CEEB 0%,#B2EBF2 50%,#7CB342 50%,#558B2F 100%); }

.farm-sky { position:absolute; top:0; left:0; right:0; height:50%; pointer-events:none; }
.farm-sun { position:absolute; top:15px; right:50px; width:45px; height:45px; background:radial-gradient(circle,#FFF176 30%,#FFD54F 70%,transparent 100%); border-radius:50%; box-shadow:0 0 40px #FFD54F,0 0 80px rgba(255,213,79,0.3); animation:sunPulse 3s ease-in-out infinite; }
@keyframes sunPulse { 0%,100%{transform:scale(1);box-shadow:0 0 40px #FFD54F} 50%{transform:scale(1.06);box-shadow:0 0 60px #FFD54F} }

.farm-cloud { position:absolute; background:#fff; border-radius:50px; opacity:0.9; animation:cloudDrift linear infinite; }
.farm-cloud::before,.farm-cloud::after { content:''; position:absolute; background:#fff; border-radius:50%; }
.fc1 { width:80px; height:30px; top:40px; left:5%; animation-duration:35s; }
.fc1::before { width:40px; height:40px; top:-20px; left:10px; }
.fc1::after { width:30px; height:30px; top:-15px; left:40px; }
.fc2 { width:60px; height:24px; top:80px; left:45%; animation-duration:45s; }
.fc2::before { width:30px; height:30px; top:-15px; left:8px; }
.fc2::after { width:24px; height:24px; top:-12px; left:30px; }
.fc3 { width:90px; height:28px; top:30px; left:75%; animation-duration:40s; }
.fc3::before { width:45px; height:45px; top:-22px; left:12px; }
.fc3::after { width:35px; height:35px; top:-18px; left:45px; }
@keyframes cloudDrift { 0%{transform:translateX(-100px)} 100%{transform:translateX(calc(100vw + 100px))} }

.farm-ground { position:absolute; bottom:0; left:0; right:0; height:50%; pointer-events:none; }

.farm-barn { position:absolute; left:6%; bottom:55%; z-index:2; }
.barn-roof { width:70px; height:0; border-left:40px solid transparent; border-right:40px solid transparent; border-bottom:25px solid #B71C1C; }
.barn-body { width:70px; height:40px; background:#D32F2F; border-radius:0 0 3px 3px; position:relative; }
.barn-door { position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:20px; height:25px; background:#5D4037; border-radius:3px 3px 0 0; }

.farm-fence { position:absolute; left:0; right:0; bottom:48%; height:8px; background:repeating-linear-gradient(90deg,#8D6E63 0px,#8D6E63 4px,#A1887F 4px,#A1887F 20px); border-top:2px solid #6D4C41; border-bottom:2px solid #6D4C41; }

.farm-tree { position:absolute; z-index:1; }
.farm-tree .trunk { width:10px; height:30px; background:#795548; margin:0 auto; border-radius:2px; }
.farm-tree .crown { width:40px; height:40px; background:#4CAF50; border-radius:50%; margin-top:-10px; margin-left:-5px; box-shadow:inset -5px -5px 0 #388E3C; }
.ft1 { left:25%; bottom:50%; }
.ft2 { right:20%; bottom:52%; }
.ft2 .crown { width:35px; height:35px; }
.ft3 { right:6%; bottom:58%; }
.ft3 .crown { width:30px; height:30px; }

.farm-pond { position:absolute; right:12%; bottom:20%; width:70px; height:35px; background:linear-gradient(135deg,#4FC3F7,#29B6F6); border-radius:50%; border:2px solid #81D4FA; animation:pondRipple 3s ease-in-out infinite; }
@keyframes pondRipple { 0%,100%{transform:scale(1)} 50%{transform:scale(0.97)} }

.farm-path { position:absolute; left:30%; bottom:10%; width:40%; height:15px; background:#D7CCC8; border-radius:10px; opacity:0.6; }

.farm-flowers { position:absolute; left:55%; bottom:35%; font-size:16px; display:flex; gap:8px; }

/* ===== 精灵层 ===== */
.sprites-layer { position:absolute; inset:0; z-index:10; }

.eggs-bar {
	position:absolute; top:8px; left:50%; transform:translateX(-50%);
	display:flex; gap:20px; z-index:15; padding:8px 16px;
}
.egg-slot {
	display:flex; flex-direction:column; align-items:center; cursor:pointer;
	transition:transform 0.3s; position:relative;
}
.egg-slot:hover { transform:scale(1.15) translateY(-5px); }
.egg-cloud {
	position:absolute; bottom:55px; width:80px; height:25px;
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

.sprite-wrapper { position:absolute; display:flex; flex-direction:column; align-items:center; cursor:pointer; transition:top 0.1s linear, left 0.1s linear; z-index:10; }
.sprite-wrapper:hover { z-index:20; filter:brightness(1.1); }

.sprite-wrapper.walking .sprite-svg { animation:petWalk 0.35s ease-in-out infinite; }
.sprite-wrapper.idle .sprite-svg { animation:petIdle 2s ease-in-out infinite; }
.sprite-wrapper.walking .egg-svg { animation:eggWobble 0.4s ease-in-out infinite; }

@keyframes petWalk { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes petIdle { 0%,100%{transform:scale(1) translateY(0)} 50%{transform:scale(1.03) translateY(-2px)} }
@keyframes eggWobble { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-5deg)} 75%{transform:rotate(5deg)} }

.sprite-wrapper.left .sprite-svg { transform:scaleX(-1); }
.sprite-wrapper.walking.left .sprite-svg { animation:petWalkFlip 0.35s ease-in-out infinite; }
@keyframes petWalkFlip { 0%,100%{transform:scaleX(-1) translateY(0)} 50%{transform:scaleX(-1) translateY(-6px)} }

.sprite-svg.stage-1 { transform-origin:center bottom; }
.sprite-svg.stage-2 { transform-origin:center bottom; }
.sprite-svg.stage-3 { transform-origin:center bottom; }
.sprite-svg.stage-4 { transform-origin:center bottom; }

.sprite-bars { display:flex; flex-direction:column; gap:3px; margin-bottom:4px; width:100px; }
.sbar { height:8px; background:rgba(0,0,0,0.15); border-radius:4px; overflow:hidden; }
.sbar-fill { height:100%; border-radius:4px; transition:width 0.5s; }
.sbar-fill.energy { background:linear-gradient(90deg,#f56c6c,#e6a23c,#67c23a); }
.sbar-fill.mood { background:linear-gradient(90deg,#f56c6c,#409eff,#67c23a); }

.sprite-label { text-align:center; margin-top:4px; display:flex; flex-direction:column; align-items:center; gap:2px; }
.sname { font-size:16px; font-weight:700; color:#fff; background:rgba(0,0,0,0.55); padding:3px 12px; border-radius:10px; text-shadow:0 1px 2px rgba(0,0,0,0.3); }
.sgroup { font-size:13px; color:#fff; background:rgba(64,158,255,0.75); padding:2px 10px; border-radius:8px; }
.sstage { font-size:12px; color:#fff; background:rgba(231,76,60,0.8); padding:1px 8px; border-radius:6px; font-weight:600; }
.adopt-hint { font-size:10px; color:#e6a23c; background:rgba(255,255,255,0.8); padding:1px 6px; border-radius:6px; margin-top:2px; }

.speech-bubble { position:absolute; top:-30px; left:50%; transform:translateX(-50%); background:#fff; border-radius:12px; padding:4px 8px; font-size:20px; box-shadow:0 2px 8px rgba(0,0,0,0.15); animation:bubblePop 0.3s ease-out; z-index:30; }
.speech-bubble::after { content:''; position:absolute; bottom:-6px; left:50%; transform:translateX(-50%); border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #fff; }
@keyframes bubblePop { 0%{transform:translateX(-50%) scale(0)} 100%{transform:translateX(-50%) scale(1)} }

.egg-svg { cursor:pointer; transition:transform 0.2s; }
.egg-svg.wiggle { animation:eggWobble 0.5s ease-in-out infinite; }

/* ===== 侧边栏 ===== */
.sidebar { width:300px; background:#fff; border-left:1px solid #eee; display:flex; flex-direction:column; padding:15px; overflow-y:auto; }
.sidebar-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; }
.sidebar-header h3 { margin:0; font-size:16px; }

.pet-detail-card { background:#f8f9fa; border-radius:12px; padding:20px; text-align:center; margin-bottom:15px; }
.detail-pet-area { position:relative; display:inline-block; cursor:pointer; margin-bottom:10px; }
.detail-svg { animation:petIdle 2s ease-in-out infinite; }
.detail-svg.stage-1 img { width:160px; height:160px; }
.detail-svg.stage-2 img { width:200px; height:200px; }
.detail-svg.stage-3 img { width:240px; height:240px; }
.detail-svg.stage-4 img { width:280px; height:280px; }

.detail-bubble { position:absolute; top:-10px; right:-20px; background:#fff; border-radius:14px; padding:6px 10px; font-size:24px; box-shadow:0 2px 10px rgba(0,0,0,0.15); animation:bubblePop 0.3s ease-out; z-index:30; }

.detail-name { font-size:20px; font-weight:600; color:#333; }
.detail-group { font-size:13px; color:#999; margin-bottom:10px; }
.detail-stage { margin-bottom:12px; }
.sdot { font-size:16px; color:#ddd; margin:0 2px; transition:color 0.3s; }
.sdot.on { color:#409eff; }
.stxt { font-size:12px; color:#999; margin-left:5px; }
.detail-bars { text-align:left; }
.dbar-item { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.dbar-icon { font-size:16px; }
.dbar-item :deep(.el-progress) { flex:1; }
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
.adopt-flex { display:flex; flex-wrap:wrap; gap:12px; }
.adopt-card { display:flex; flex-direction:column; align-items:center; padding:12px 8px; border:2px solid #eee; border-radius:12px; cursor:pointer; transition:all 0.2s; width:calc(20% - 10px); min-width:90px; }
.adopt-card:hover { border-color:#409eff; background:#f0f7ff; }
.adopt-card.picked { border-color:#409eff; background:#e1f0ff; box-shadow:0 0 8px rgba(64,158,255,0.3); }
.adopt-svg img { width:80px; height:80px; }
.adopt-name { font-size:14px; color:#333; margin-top:6px; font-weight:500; }

.feed-body { padding:5px 0; }
.feed-pet-info { display:flex; align-items:center; gap:8px; padding:10px; background:#f5f5f5; border-radius:8px; margin-bottom:12px; }
.feed-svg img { width:56px; height:56px; }
.feed-list { max-height:280px; overflow-y:auto; }
.feed-item { display:flex; align-items:center; gap:10px; padding:10px; border:2px solid #eee; border-radius:8px; margin-bottom:8px; cursor:pointer; transition:all 0.2s; }
.feed-item:hover { border-color:#409eff; }
.feed-item.picked { border-color:#409eff; background:#f0f7ff; }
.feed-icon { font-size:22px; }
.feed-info { flex:1; }
.feed-info div:first-child { font-size:14px; font-weight:500; }
.feed-effect { font-size:12px; color:#67c23a; }

.growth-body { text-align:center; padding:15px; }
.growth-svg img { width:160px; height:160px; animation:floatPet 1s ease-in-out infinite; }
.growth-text { font-size:18px; font-weight:600; color:#333; margin:10px 0 8px; }
.growth-stage { font-size:14px; color:#409eff; }
</style>
