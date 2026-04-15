import { Ref } from 'vue'
import { Sprite } from './types'
import { syncPetDecay } from '@/api/request'

export function useDecay(
	sprites: Ref<Sprite[]>,
	energyDecaySecsPerPoint: Ref<number>,
	moodDecaySecsPerPoint: Ref<number>,
	decayCheckSec: Ref<number>
) {
	let decayInterval: number | null = null
	let lastDecayTime = 0

	const startDecayLoop = () => {
		lastDecayTime = Date.now()
		stopDecayLoop()
		decayInterval = window.setInterval(() => {
			const now = Date.now()
			const elapsed = (now - lastDecayTime) / 1000
			lastDecayTime = now
			sprites.value.forEach(sp => {
				if (!sp.hasPet) return
				const energyDecay = elapsed / energyDecaySecsPerPoint.value
				const moodDecay = elapsed / moodDecaySecsPerPoint.value
				sp.energy = Math.max(0, sp.energy - energyDecay)
				sp.mood = Math.max(0, sp.mood - moodDecay)
			})
		}, decayCheckSec.value * 1000)
	}

	const stopDecayLoop = () => {
		if (decayInterval) { clearInterval(decayInterval); decayInterval = null }
	}

	return { startDecayLoop, stopDecayLoop }
}

export function useSync(
	sprites: Ref<Sprite[]>,
	classId: Ref<number>,
	syncToServerSec: Ref<number>
) {
	let syncInterval: number | null = null

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

	const stopSyncLoop = () => {
		if (syncInterval) { clearInterval(syncInterval); syncInterval = null }
	}

	return { startSyncLoop, stopSyncLoop }
}
