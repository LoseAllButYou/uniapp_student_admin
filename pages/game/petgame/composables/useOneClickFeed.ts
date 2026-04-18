import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getPetBag, batchFeedInteract } from '@/api/request'

export interface FoodPlanItem {
	name: string
	code: string
	count: number
	effect: number
}

export interface ToyPlanItem {
	name: string
	code: string
	count: number
	effect: number
}

export interface PetPlan {
	petId: number
	petName: string
	groupName: string
	sprite: any
	startEnergy: number
	startMood: number
	targetEnergy: number
	targetMood: number
	needFeed: boolean
	needInteract: boolean
	isEmpty: boolean
	isEmptyFood: boolean
	isEmptyToy: boolean
	foodPlan: FoodPlanItem[]
	toyPlan: ToyPlanItem[]
	bagFoods: any[]
	bagToys: any[]
}

export interface OneClickPlan {
	petPlans: PetPlan[]
	totalItems: number
}

export function useOneClickFeed(
	sprites: any,
	classId: any,
	refreshPets: () => Promise<void>
) {
	const oneClickVisible = ref(false)
	const oneClickExecuting = ref(false)
	const oneClickPlan = ref<OneClickPlan | null>(null)

	const loadAllBagData = async () => {
		const petBagData: Record<number, { foods: any[], toys: any[] }> = {}

		const loadPromises = sprites.value
			.filter((sp: any) => sp.hasPet)
			.map(async (sp: any) => {
				try {
					const bagRes = await getPetBag(classId.value, sp.groupId)
					petBagData[sp.groupId] = {
						foods: bagRes.data?.foods || [],
						toys: bagRes.data?.toys || []
					}
				} catch {
					petBagData[sp.groupId] = { foods: [], toys: [] }
				}
			})

		await Promise.all(loadPromises)
		return petBagData
	}

	const calculateAllPetsPlan = (petBagData: Record<number, { foods: any[], toys: any[] }>) => {
		const plan: OneClickPlan = {
			petPlans: [],
			totalItems: 0
		}

		for (const sp of sprites.value) {
			if (!sp.hasPet || !sp.petId) continue

			const bagFoods = petBagData[sp.groupId]?.foods || []
			const bagToys = petBagData[sp.groupId]?.toys || []
			const hasFood = bagFoods.length > 0
			const hasToy = bagToys.length > 0
			const energyNeed = 100 - (sp.energy || 0)
			const moodNeed = 100 - (sp.mood || 0)

			const petPlan: PetPlan = {
				petId: sp.petId,
				petName: sp.petName || '',
				groupName: sp.groupName || '',
				sprite: sp,
				startEnergy: sp.energy || 0,
				startMood: sp.mood || 0,
				targetEnergy: sp.energy || 0,
				targetMood: sp.mood || 0,
				needFeed: false,
				needInteract: false,
				isEmpty: false,
				isEmptyFood: false,
				isEmptyToy: false,
				foodPlan: [],
				toyPlan: [],
				bagFoods: bagFoods,
				bagToys: bagToys
			}

			if (energyNeed > 0) {
				if (hasFood) {
					petPlan.needFeed = true
					let remaining = energyNeed
					const foodBag = [...bagFoods].sort((a, b) => (b.energy_add || 0) - (a.energy_add || 0))
					for (const f of foodBag) {
						if (remaining <= 0) break
						if ((f.quantity || 0) <= 0) continue
						const energyAdd = f.energy_add || 1
						const needCount = Math.ceil(remaining / energyAdd)
						const useCount = Math.min(needCount, f.quantity)
						const totalEffect = useCount * energyAdd
						remaining -= totalEffect
						if (remaining < 0) {
							const waste = -remaining
							const adjust = Math.ceil(waste / energyAdd)
							const adjustedCount = Math.max(1, useCount - adjust)
							petPlan.foodPlan.push({
								name: f.item_name || '',
								code: f.item_code || '',
								count: adjustedCount,
								effect: adjustedCount * energyAdd
							})
						} else {
							petPlan.foodPlan.push({
								name: f.item_name || '',
								code: f.item_code || '',
								count: useCount,
								effect: totalEffect
							})
						}
					}
					let actualE = petPlan.startEnergy
					petPlan.foodPlan.forEach(f => { actualE += f.effect })
					petPlan.targetEnergy = Math.min(100, actualE)
				} else {
					petPlan.isEmptyFood = true
				}
			}

			if (moodNeed > 0) {
				if (hasToy) {
					petPlan.needInteract = true
					let remaining = moodNeed
					const toyBag = [...bagToys].sort((a, b) => (b.mood_add || 0) - (a.mood_add || 0))
					for (const t of toyBag) {
						if (remaining <= 0) break
						if ((t.quantity || 0) <= 0) continue
						const moodAdd = t.mood_add || 1
						const needCount = Math.ceil(remaining / moodAdd)
						const useCount = Math.min(needCount, t.quantity)
						const totalEffect = useCount * moodAdd
						remaining -= totalEffect
						if (remaining < 0) {
							const waste = -remaining
							const adjust = Math.ceil(waste / moodAdd)
							const adjustedCount = Math.max(1, useCount - adjust)
							petPlan.toyPlan.push({
								name: t.item_name || '',
								code: t.item_code || '',
								count: adjustedCount,
								effect: adjustedCount * moodAdd
							})
						} else {
							petPlan.toyPlan.push({
								name: t.item_name || '',
								code: t.item_code || '',
								count: useCount,
								effect: totalEffect
							})
						}
					}
					let actualM = petPlan.startMood
					petPlan.toyPlan.forEach(t => { actualM += t.effect })
					petPlan.targetMood = Math.min(100, actualM)
				} else {
					petPlan.isEmptyToy = true
				}
			}

			petPlan.isEmpty = petPlan.isEmptyFood || petPlan.isEmptyToy
			const petItems = petPlan.foodPlan.reduce((s, f) => s + f.count, 0) + petPlan.toyPlan.reduce((s, t) => s + t.count, 0)
			if (petItems > 0 || petPlan.needFeed || petPlan.needInteract) {
				plan.petPlans.push(petPlan)
				plan.totalItems += petItems
			}
		}

		return plan
	}

	const openOneClickReplenish = async () => {
		try {
			const petBagData = await loadAllBagData()
			oneClickPlan.value = calculateAllPetsPlan(petBagData)
		} catch (e: any) {
			console.error('加载背包数据失败:', e)
			ElMessage.error('加载背包数据失败: ' + (e.message || '未知错误'))
			return
		}

		if (!oneClickPlan.value || oneClickPlan.value.petPlans.length === 0) {
			ElMessage.info('当前没有宠物')
			return
		}

		const needAction = oneClickPlan.value.petPlans.some(p => p.needFeed || p.needInteract)
		if (!needAction) {
			ElMessage.info('所有宠物能量和心情已满，无需补充')
			return
		}

		const emptyPets = oneClickPlan.value.petPlans.filter(p => p.isEmpty)
		if (emptyPets.length > 0) {
			const petNames = emptyPets.map(p => {
				const reasons = []
				if (p.isEmptyFood && p.isEmptyToy) reasons.push('背包为空')
				else if (p.isEmptyFood) reasons.push('食物为空')
				else if (p.isEmptyToy) reasons.push('玩具为空')
				return `${p.petName}(${reasons.join(',')})`
			}).join('、')
			ElMessage.warning(`${petNames}，将无法补充对应属性`)
		}

		oneClickVisible.value = true
	}

	const executeOneClickPlan = async () => {
		if (!oneClickPlan.value) return
		oneClickExecuting.value = true

		try {
			const actions: Array<{ pet_id: number; type: string; item_code: string; group_id: number }> = []

			for (const petPlan of oneClickPlan.value.petPlans) {
				for (const food of petPlan.foodPlan) {
					for (let i = 0; i < food.count; i++) {
						actions.push({
							pet_id: petPlan.petId,
							type: 'feed',
							item_code: food.code,
							group_id: petPlan.sprite.groupId
						})
					}
				}

				for (const toy of petPlan.toyPlan) {
					for (let i = 0; i < toy.count; i++) {
						actions.push({
							pet_id: petPlan.petId,
							type: 'interact',
							item_code: toy.code,
							group_id: petPlan.sprite.groupId
						})
					}
				}
			}

			if (actions.length === 0) {
				ElMessage.info('没有可执行的操作')
				oneClickVisible.value = false
				return
			}

			const res = await batchFeedInteract({
				class_id: classId.value,
				actions: actions
			})

			oneClickVisible.value = false
			if (res.code === 1) {
				const { success_count, fail_count } = res.data || { success_count: 0, fail_count: 0 }
				if (fail_count > 0) {
					ElMessage.warning(`一键喂养完成，${success_count} 个成功，${fail_count} 个失败`)
				} else {
					ElMessage.success(`一键喂养完成！${success_count} 个操作成功`)
				}
			} else {
				ElMessage.error(res.msg || '喂养失败')
			}

			await refreshPets()
		} catch (e: any) {
			console.error(e)
			ElMessage.error(e.message || '喂养失败')
		} finally {
			oneClickExecuting.value = false
		}
	}

	return {
		oneClickVisible,
		oneClickExecuting,
		oneClickPlan,
		openOneClickReplenish,
		executeOneClickPlan
	}
}
