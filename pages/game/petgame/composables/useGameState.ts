import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getPetTypes, getPetList, syncPetDecay } from '@/api/request'
import { DECAY_CONFIG } from '../scripts/petResources'
import { Sprite } from '../scripts/types'

export function useGameState() {
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

	const energyDecaySecsPerPoint = ref(DECAY_CONFIG.energyDecaySecsPerPoint)
	const moodDecaySecsPerPoint = ref(DECAY_CONFIG.moodDecaySecsPerPoint)
	const decayCheckSec = ref(DECAY_CONFIG.decayCheckSec)
	const syncToServerSec = ref(DECAY_CONFIG.syncToServerSec)

	const eggSprites = computed(() => sprites.value.filter(s => !s.hasPet))
	const petSprites = computed(() => sprites.value.filter(s => s.hasPet))

	const buildSpriteData = (pets: any[], prevSprites: Sprite[]): Sprite[] => {
		const groups = pets.filter((p: any) => p.has_group)
		return groups.map((p: any) => {
			const prev = prevSprites.find(s => s.groupId === p.group_id)
			return {
				groupId: p.group_id,
				hasPet: p.has_pet || false,
				petId: p.pet_id || null,
				petName: p.pet_name || '',
				petType: p.pet_type || '',
				groupName: p.group_name || '',
				lifeStage: p.life_stage || 1,
				energy: p.energy ?? 60,
				mood: p.mood ?? 60,
				growthFeedCount: p.growth_feed_count || 0,
				x: prev?.x ?? Math.random() * 80 + 10,
				y: prev?.y ?? Math.random() * 60 + 20,
				state: 'idle',
				direction: prev?.direction || 'right',
				bubble: null,
				bubbleTimer: null
			} as Sprite
		})
	}

	const buildSprites = (buildSpriteFn: (pets: any[], prevSprites: Sprite[]) => Sprite[]) => {
		const prevGroupId = selectedSprite.value?.groupId
		sprites.value = buildSpriteFn(pets.value, sprites.value)
		if (prevGroupId) {
			const updated = sprites.value.find(s => s.groupId === prevGroupId)
			if (updated) selectedSprite.value = updated
		} else if (sprites.value.length > 0) {
			const first = sprites.value.find(s => s.hasPet) || sprites.value[0]
			selectedSprite.value = first
		}
	}

	const loadGameResources = async () => {
		isLoading.value = true
		loadingProgress.value = 0
		const startTime = Date.now()
		const minLoadingTime = 1000
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
		const elapsedTime = Date.now() - startTime
		if (elapsedTime < minLoadingTime) {
			await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime))
		}
		loadingProgress.value = 100
		await new Promise(resolve => setTimeout(resolve, 300))
		isLoading.value = false
	}

	const openGame = async (
		buildSpriteFn: (pets: any[], prevSprites: Sprite[]) => Sprite[],
		startMoveLoop: () => void,
		startDecayLoop: () => void,
		startSyncLoop: () => void
	) => {
		if (gameInitialized.value) return
		entering.value = true
		try {
			const cid = uni.getStorageSync('currentClassId')
			if (!cid) { ElMessage.warning('请先选择班级'); return }
			classId.value = cid
			const info = uni.getStorageSync('teacherInfo')
			className.value = info?.classes?.find((c: any) => c.id === cid)?.name || ''

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

				buildSprites(buildSpriteFn)
			}
			gameVisible.value = true
		} catch (e) {
			console.error(e)
			ElMessage.error('进入游戏失败')
			isLoading.value = false
		} finally {
			entering.value = false
		}
	}

	const onGameOpened = (startMoveLoop: () => void, startDecayLoop: () => void, startSyncLoop: () => void) => {
		gameInitialized.value = true
		startMoveLoop()
		startDecayLoop()
		startSyncLoop()
	}

	const onGameClose = (
		stopMoveLoop: () => void,
		stopDecayLoop: () => void,
		stopSyncLoop: () => void,
		emit: (event: string, data: any) => void,
		isMinimizedVal: boolean
	) => {
		stopMoveLoop()
		stopDecayLoop()
		stopSyncLoop()
		if (!isMinimizedVal) emit('gameClose', '')
		gameInitialized.value = false
	}

	const minimizeGame = (
		stopMoveLoop: () => void,
		stopDecayLoop: () => void,
		stopSyncLoop: () => void
	) => {
		isMinimized.value = true
		gameVisible.value = false
		stopMoveLoop()
		stopDecayLoop()
		stopSyncLoop()
		uni.$emit('petGameMinimized', true)
	}

	const restoreGame = (
		startMoveLoop: () => void,
		startDecayLoop: () => void,
		startSyncLoop: () => void
	) => {
		isMinimized.value = false
		gameVisible.value = true
		uni.$emit('petGameMinimized', false)
		setTimeout(() => {
			if (gameVisible.value) {
				startMoveLoop()
				startDecayLoop()
				startSyncLoop()
			}
		}, 100)
	}

	const formatProgress = (percentage: number) => `${percentage}%`

	return {
		isLoading,
		loadingProgress,
		entering,
		gameVisible,
		isMinimized,
		loading,
		classId,
		className,
		pets,
		petTypes,
		sprites,
		selectedSprite,
		farmRef,
		gameInitialized,
		energyDecaySecsPerPoint,
		moodDecaySecsPerPoint,
		decayCheckSec,
		syncToServerSec,
		eggSprites,
		petSprites,
		buildSprites,
		loadGameResources,
		openGame,
		onGameOpened,
		onGameClose,
		minimizeGame,
		restoreGame,
		formatProgress
	}
}
