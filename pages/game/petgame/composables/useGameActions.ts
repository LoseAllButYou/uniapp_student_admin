import { ref, Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Sprite, BagItem } from '../scripts/types'
import { BUBBLE_EMOJIS } from '../scripts/petResources'
import { getPetList, adoptPet, feedPet, interactPet, getPetBag } from '@/api/request'

export function useGameActions(
	sprites: Ref<Sprite[]>,
	selectedSprite: Ref<Sprite | null>,
	classId: Ref<number>,
	pets: Ref<any[]>,
	petTypes: Ref<any[]>,
	loading: Ref<boolean>,
	buildSprites: () => void
) {
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
	const growthData = ref({ petType: '', petName: '', from: 1, to: 2 })

	const detailBubble = ref<string | null>(null)
	let detailBubbleTimer: number | null = null

	const onSpriteClick = (sp: Sprite) => {
		selectedSprite.value = sp
		if (sp.hasPet) {
			showBubble(sp)
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

	const refreshPets = async () => {
		loading.value = true
		try {
			const res = await getPetList(classId.value)
			if (res.code === 1) {
				console.log('refreshPets - 后端返回的pets数据:', res.data)
				pets.value = res.data; buildSprites()
			}
		} catch (e) { ElMessage.error('刷新失败') }
		finally { loading.value = false }
	}

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

	const openFeed = async () => {
		if (!selectedSprite.value?.hasPet) return
		pickFood.value = ''
		try {
			const res = await getPetBag(classId.value, selectedSprite.value.groupId)
			if (res.code === 1) { bagFoods.value = res.data.foods || []; bagToys.value = res.data.toys || [] }
		} catch (e) { ElMessage.error('获取背包失败') }
		feedVisible.value = true
	}

	const doFeed = async (sp?: Sprite, foodCode?: string) => {
		const sprite = sp || selectedSprite.value
		const code = foodCode || pickFood.value
		if (!sprite || !code) return
		if (!sprite.hasPet) { ElMessage.error('该组没有宠物'); return }
		if (!sprite.petId) {
			console.error('doFeed - 宠物数据:', JSON.stringify({
				groupId: sprite.groupId,
				hasPet: sprite.hasPet,
				petId: sprite.petId,
				petType: sprite.petType,
				petName: sprite.petName
			}))
			ElMessage.error('宠物数据不完整(id缺失)'); return
		}
		if (!sprite.groupId) { ElMessage.error('宠物数据不完整(groupId缺失)'); return }
		if (!classId.value) { ElMessage.error('请先选择班级'); return }
		feeding.value = true
		try {
			const res = await feedPet({ pet_id: sprite.petId, food_code: code, class_id: classId.value, group_id: sprite.groupId })
			if (res.code === 1) {
				ElMessage.success(`喂养成功！能量 +${res.data.energy_add}`)
				feedVisible.value = false
				if (res.data.is_growth_trigger === 1) {
					growthData.value = { petType: sprite.petType!, petName: sprite.petName!, from: res.data.life_stage_before, to: res.data.life_stage_after }
					growthVisible.value = true
				}
				await refreshPets()
			} else { ElMessage.error(res.msg || '喂养失败') }
		} catch (e) { ElMessage.error('喂养失败') }
		finally { feeding.value = false }
	}

	const openInteract = async () => {
		if (!selectedSprite.value?.hasPet) return
		pickToy.value = ''
		try {
			const res = await getPetBag(classId.value, selectedSprite.value.groupId)
			if (res.code === 1) { bagFoods.value = res.data.foods || []; bagToys.value = res.data.toys || [] }
		} catch (e) { ElMessage.error('获取背包失败') }
		interactVisible.value = true
	}

	const doInteract = async (sp?: Sprite, toyCode?: string) => {
		const sprite = sp || selectedSprite.value
		const code = toyCode || pickToy.value
		if (!sprite || !code) return
		if (!sprite.hasPet) { ElMessage.error('该组没有宠物'); return }
		if (!sprite.petId) { ElMessage.error('宠物数据不完整(id缺失)'); return }
		if (!sprite.groupId) { ElMessage.error('宠物数据不完整(groupId缺失)'); return }
		if (!classId.value) { ElMessage.error('请先选择班级'); return }
		interacting.value = true
		try {
			const res = await interactPet({ pet_id: sprite.petId, toy_code: code, class_id: classId.value, group_id: sprite.groupId })
			if (res.code === 1) { ElMessage.success(`互动成功！心情 +${res.data.mood_add}`); interactVisible.value = false; await refreshPets() }
			else { ElMessage.error(res.msg || '互动失败') }
		} catch (e) { ElMessage.error('互动失败') }
		finally { interacting.value = false }
	}

	return {
		adoptVisible, adoptType, adoptName, adoptGroupId, adoptGroupName, adopting,
		feedVisible, pickFood, feeding, bagFoods,
		interactVisible, pickToy, interacting, bagToys,
		growthVisible, growthData,
		detailBubble,
		onSpriteClick, showBubble, onDetailPetClick,
		refreshPets, openAdoptForGroup, doAdopt,
		openFeed, doFeed, openInteract, doInteract
	}
}
