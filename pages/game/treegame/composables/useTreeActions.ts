import { ref, Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { TreeData, FertilizerItem, TreeConfig, BannerData } from '../scripts/types'
import { getTreeList, plantTree, waterTree, fertilizeTree, batchFertilize, getTreeBag, getBannerTemplates, addBanner } from '@/api/request'

export function useTreeActions(
	treesData: Ref<TreeData[]>,
	selectedTreeId: Ref<number | null>,
	classId: Ref<number>,
	refreshTrees: () => Promise<void>
) {
	const loading = ref(false)
	const plantVisible = ref(false)
	const plantType = ref('')
	const plantX = ref(0)
	const plantY = ref(0)
	const planting = ref(false)

	const waterVisible = ref(false)
	const watering = ref(false)

	const fertilizeVisible = ref(false)
	const pickFertilizer = ref('')
	const fertilizing = ref(false)
	const bagFertilizers = ref<FertilizerItem[]>([])

	const bannerVisible = ref(false)
	const bannerContent = ref('')
	const bannerColor = ref('red')
	const bannerAdding = ref(false)
	const bannerTemplates = ref<any[]>([])

	const selectedTree = () => {
		if (!selectedTreeId.value) return null
		return treesData.value.find(t => t.id === selectedTreeId.value) || null
	}

	const openPlant = (x: number, y: number) => {
		plantX.value = x
		plantY.value = y
		plantType.value = ''
		plantVisible.value = true
	}

	const doPlant = async () => {
		if (!plantType.value) { ElMessage.warning('请选择树种'); return }
		planting.value = true
		try {
			const res = await plantTree({
				class_id: classId.value,
				tree_type: plantType.value,
				pos_x: plantX.value,
				pos_y: plantY.value
			})
			if (res.code === 1) {
				ElMessage.success('种植成功！')
				plantVisible.value = false
				await refreshTrees()
			} else {
				ElMessage.error(res.msg || '种植失败')
			}
		} catch (e) { ElMessage.error('种植失败') }
		finally { planting.value = false }
	}

	const openWater = async () => {
		const tree = selectedTree()
		if (!tree) return
		waterVisible.value = true
	}

	const doWater = async () => {
		const tree = selectedTree()
		if (!tree) return
		watering.value = true
		try {
			const res = await waterTree({ tree_id: tree.id, class_id: classId.value })
			if (res.code === 1) {
				ElMessage.success(`浇水成功！经验 +${res.data.exp_add}`)
				if (res.data.is_level_up === 1) ElMessage.success(`恭喜！树木升到 ${res.data.level_after} 级`)
				waterVisible.value = false
				await refreshTrees()
			} else { ElMessage.error(res.msg || '浇水失败') }
		} catch (e) { ElMessage.error('浇水失败') }
		finally { watering.value = false }
	}

	const openFertilize = async () => {
		const tree = selectedTree()
		if (!tree) return
		pickFertilizer.value = ''
		try {
			const res = await getTreeBag(classId.value, 0)
			if (res.code === 1) bagFertilizers.value = res.data.fertilizers || []
		} catch (e) { ElMessage.error('获取背包失败') }
		fertilizeVisible.value = true
	}

	const doFertilize = async () => {
		const tree = selectedTree()
		if (!tree || !pickFertilizer.value) return
		fertilizing.value = true
		try {
			const res = await fertilizeTree({
				tree_id: tree.id, fertilizer_code: pickFertilizer.value,
				class_id: classId.value, group_id: 0
			})
			if (res.code === 1) {
				ElMessage.success(`施肥成功！经验 +${res.data.exp_add}`)
				if (res.data.is_level_up === 1) ElMessage.success(`恭喜！树木升到 ${res.data.level_after} 级`)
				fertilizeVisible.value = false
				await refreshTrees()
			} else { ElMessage.error(res.msg || '施肥失败') }
		} catch (e) { ElMessage.error('施肥失败') }
		finally { fertilizing.value = false }
	}

	const doBatchFertilize = async () => {
		const tree = selectedTree()
		if (!tree) return
		fertilizing.value = true
		try {
			const res = await batchFertilize({ tree_id: tree.id, class_id: classId.value, group_id: 0 })
			if (res.code === 1) {
				ElMessage.success(`一键施肥成功！总经验 +${res.data.total_exp_add}`)
				if (res.data.is_level_up === 1) ElMessage.success(`恭喜！树木升到 ${res.data.level_after} 级`)
				fertilizeVisible.value = false
				await refreshTrees()
			} else { ElMessage.error(res.msg || '施肥失败') }
		} catch (e) { ElMessage.error('施肥失败') }
		finally { fertilizing.value = false }
	}

	const openBanner = async () => {
		const tree = selectedTree()
		if (!tree || tree.level < 3) { ElMessage.warning('树木等级不足3级'); return }
		bannerContent.value = ''
		bannerColor.value = 'red'
		try {
			const res = await getBannerTemplates()
			if (res.code === 1) bannerTemplates.value = res.data || []
		} catch (e) { console.error(e) }
		bannerVisible.value = true
	}

	const doAddBanner = async () => {
		const tree = selectedTree()
		if (!tree || !bannerContent.value) return
		bannerAdding.value = true
		try {
			const res = await addBanner({
				tree_id: tree.id, class_id: classId.value, group_id: 0,
				content: bannerContent.value, color: bannerColor.value, banner_type: 'custom'
			})
			if (res.code === 1) {
				ElMessage.success('条幅添加成功！')
				bannerVisible.value = false
				await refreshTrees()
			} else { ElMessage.error(res.msg || '添加失败') }
		} catch (e) { ElMessage.error('添加失败') }
		finally { bannerAdding.value = false }
	}

	const selectTemplate = (t: any) => {
		bannerContent.value = t.content
		bannerColor.value = t.color
	}

	return {
		loading, plantVisible, plantType, plantX, plantY, planting,
		waterVisible, watering,
		fertilizeVisible, pickFertilizer, fertilizing, bagFertilizers,
		bannerVisible, bannerContent, bannerColor, bannerAdding, bannerTemplates,
		selectedTree,
		openPlant, doPlant,
		openWater, doWater,
		openFertilize, doFertilize, doBatchFertilize,
		openBanner, doAddBanner, selectTemplate,
	}
}
