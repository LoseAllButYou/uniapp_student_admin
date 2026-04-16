<template>
	<div class="pet-game-config">
		<el-tabs v-model="activeTab" type="card" @tab-click="handleTabChange">
			<!-- 宠物配置 -->
			<el-tab-pane label="宠物配置" name="pets">
				<div class="tab-header">
					<h3>可选宠物列表</h3>
					<el-button type="primary" @click="openPetDialog()">
						<el-icon><Plus /></el-icon> 添加宠物
					</el-button>
				</div>
				<el-table v-loading="petsLoading" :data="petsList" style="width: 100%">
					<el-table-column prop="pet_id" label="ID" width="70" />
					<el-table-column label="图片" width="90">
						<template #default="{ row }">
							<img v-if="row.img" :src="row.img" class="pet-img" />
							<span v-else class="no-img">无图</span>
						</template>
					</el-table-column>
					<el-table-column prop="pet_name" label="名称" width="100" />
					<el-table-column prop="pet_type" label="类型" width="80" />
					<el-table-column prop="adopt_condition" label="领养条件" show-overflow-tooltip />
					<el-table-column prop="sort_order" label="排序" width="70" />
					<el-table-column label="状态" width="70">
						<template #default="{ row }">
							<el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
								{{ row.status === 1 ? '启用' : '禁用' }}
							</el-tag>
						</template>
					</el-table-column>
					<el-table-column label="操作" width="150" fixed="right">
						<template #default="{ row }">
							<el-button type="primary" size="small" @click="openPetDialog(row)">编辑</el-button>
							<el-button type="danger" size="small" @click="handleDeletePet(row)">删除</el-button>
						</template>
					</el-table-column>
				</el-table>
			</el-tab-pane>

			<!-- 食品配置 -->
			<el-tab-pane label="食品配置" name="foods">
				<div class="tab-header">
					<h3>宠物食品列表</h3>
					<el-button type="primary" @click="openFoodDialog()">
						<el-icon><Plus /></el-icon> 添加食品
					</el-button>
				</div>
				<el-table v-loading="foodsLoading" :data="foodsList" style="width: 100%">
					<el-table-column prop="id" label="ID" width="70" />
					<el-table-column prop="food_code" label="编码" width="120" />
					<el-table-column prop="food_name" label="名称" width="120" />
					<el-table-column prop="energy_add" label="能量值" width="80" />
					<el-table-column prop="rarity" label="稀有度" width="80">
						<template #default="{ row }">
							<el-tag :type="row.rarity === 'epic' ? 'danger' : row.rarity === 'rare' ? 'warning' : 'info'" size="small">
								{{ row.rarity === 'epic' ? '史诗' : row.rarity === 'rare' ? '稀有' : '普通' }}
							</el-tag>
						</template>
					</el-table-column>
					<el-table-column prop="sort" label="排序" width="70" />
					<el-table-column label="状态" width="70">
						<template #default="{ row }">
							<el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
								{{ row.status === 1 ? '启用' : '禁用' }}
							</el-tag>
						</template>
					</el-table-column>
					<el-table-column label="操作" width="150" fixed="right">
						<template #default="{ row }">
							<el-button type="primary" size="small" @click="openFoodDialog(row)">编辑</el-button>
							<el-button type="danger" size="small" @click="handleDeleteFood(row)">删除</el-button>
						</template>
					</el-table-column>
				</el-table>
			</el-tab-pane>

			<!-- 玩具配置 -->
			<el-tab-pane label="玩具配置" name="toys">
				<div class="tab-header">
					<h3>宠物玩具列表</h3>
					<el-button type="primary" @click="openToyDialog()">
						<el-icon><Plus /></el-icon> 添加玩具
					</el-button>
				</div>
				<el-table v-loading="toysLoading" :data="toysList" style="width: 100%">
					<el-table-column prop="id" label="ID" width="70" />
					<el-table-column prop="toy_code" label="编码" width="120" />
					<el-table-column prop="toy_name" label="名称" width="120" />
					<el-table-column prop="mood_add" label="心情值" width="80" />
					<el-table-column prop="rarity" label="稀有度" width="80">
						<template #default="{ row }">
							<el-tag :type="row.rarity === 'epic' ? 'danger' : row.rarity === 'rare' ? 'warning' : 'info'" size="small">
								{{ row.rarity === 'epic' ? '史诗' : row.rarity === 'rare' ? '稀有' : '普通' }}
							</el-tag>
						</template>
					</el-table-column>
					<el-table-column prop="sort" label="排序" width="70" />
					<el-table-column label="状态" width="70">
						<template #default="{ row }">
							<el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
								{{ row.status === 1 ? '启用' : '禁用' }}
							</el-tag>
						</template>
					</el-table-column>
					<el-table-column label="操作" width="150" fixed="right">
						<template #default="{ row }">
							<el-button type="primary" size="small" @click="openToyDialog(row)">编辑</el-button>
							<el-button type="danger" size="small" @click="handleDeleteToy(row)">删除</el-button>
						</template>
					</el-table-column>
				</el-table>
			</el-tab-pane>
		</el-tabs>

		<!-- 宠物编辑弹窗 -->
		<el-dialog v-model="petDialogVisible" :title="petDialogTitle" width="550px">
			<el-form :model="petForm" :rules="petRules" ref="petFormRef" label-width="100px">
				<el-form-item label="宠物名称" prop="pet_name">
					<el-input v-model="petForm.pet_name" placeholder="请输入宠物名称" />
				</el-form-item>
				<el-form-item label="宠物类型" prop="pet_type">
					<el-input v-model="petForm.pet_type" placeholder="请输入宠物类型编码，如 pig" />
				</el-form-item>
				<el-form-item label="宠物图片" prop="img">
					<el-input v-model="petForm.img" placeholder="请输入图片路径" />
				</el-form-item>
				<el-form-item label="领养条件">
					<el-input v-model="petForm.adopt_condition" type="textarea" :rows="2" placeholder="请输入领养条件" />
				</el-form-item>
				<el-form-item label="排序">
					<el-input-number v-model="petForm.sort_order" :min="0" :max="999" style="width: 100%" />
				</el-form-item>
				<el-form-item label="状态">
					<el-switch v-model="petForm.status" :active-value="1" :inactive-value="0" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="petDialogVisible = false">取消</el-button>
				<el-button type="primary" :loading="petSubmitLoading" @click="submitPetForm">确定</el-button>
			</template>
		</el-dialog>

		<!-- 食品编辑弹窗 -->
		<el-dialog v-model="foodDialogVisible" :title="foodDialogTitle" width="550px">
			<el-form :model="foodForm" :rules="foodRules" ref="foodFormRef" label-width="100px">
				<el-form-item label="食品编码" prop="food_code">
					<el-input v-model="foodForm.food_code" placeholder="请输入食品编码，如 apple" />
				</el-form-item>
				<el-form-item label="食品名称" prop="food_name">
					<el-input v-model="foodForm.food_name" placeholder="请输入食品名称" />
				</el-form-item>
				<el-form-item label="能量值" prop="energy_add">
					<el-input-number v-model="foodForm.energy_add" :min="1" :max="999" style="width: 100%" />
				</el-form-item>
				<el-form-item label="稀有度">
					<el-select v-model="foodForm.rarity" style="width: 100%">
						<el-option label="普通" value="common" />
						<el-option label="稀有" value="rare" />
						<el-option label="史诗" value="epic" />
					</el-select>
				</el-form-item>
				<el-form-item label="排序">
					<el-input-number v-model="foodForm.sort" :min="0" :max="999" style="width: 100%" />
				</el-form-item>
				<el-form-item label="状态">
					<el-switch v-model="foodForm.status" :active-value="1" :inactive-value="0" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="foodDialogVisible = false">取消</el-button>
				<el-button type="primary" :loading="foodSubmitLoading" @click="submitFoodForm">确定</el-button>
			</template>
		</el-dialog>

		<!-- 玩具编辑弹窗 -->
		<el-dialog v-model="toyDialogVisible" :title="toyDialogTitle" width="550px">
			<el-form :model="toyForm" :rules="toyRules" ref="toyFormRef" label-width="100px">
				<el-form-item label="玩具编码" prop="toy_code">
					<el-input v-model="toyForm.toy_code" placeholder="请输入玩具编码，如 ball" />
				</el-form-item>
				<el-form-item label="玩具名称" prop="toy_name">
					<el-input v-model="toyForm.toy_name" placeholder="请输入玩具名称" />
				</el-form-item>
				<el-form-item label="心情值" prop="mood_add">
					<el-input-number v-model="toyForm.mood_add" :min="1" :max="999" style="width: 100%" />
				</el-form-item>
				<el-form-item label="稀有度">
					<el-select v-model="toyForm.rarity" style="width: 100%">
						<el-option label="普通" value="common" />
						<el-option label="稀有" value="rare" />
						<el-option label="史诗" value="epic" />
					</el-select>
				</el-form-item>
				<el-form-item label="排序">
					<el-input-number v-model="toyForm.sort" :min="0" :max="999" style="width: 100%" />
				</el-form-item>
				<el-form-item label="状态">
					<el-switch v-model="toyForm.status" :active-value="1" :inactive-value="0" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="toyDialogVisible = false">取消</el-button>
				<el-button type="primary" :loading="toySubmitLoading" @click="submitToyForm">确定</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
	getPetConfigs, savePetConfig, deletePetConfig,
	getFoodConfigs, saveFoodConfig, deleteFoodConfig,
	getToyConfigs, saveToyConfig, deleteToyConfig
} from '@/api/request'

const activeTab = ref('pets')

// ==================== 宠物配置 ====================
const petsList = ref<any[]>([])
const petsLoading = ref(false)
const petDialogVisible = ref(false)
const petDialogTitle = ref('添加宠物')
const petFormRef = ref()
const petSubmitLoading = ref(false)
const petForm = ref({
	pet_id: null as number | null,
	stu_class_id: 0,
	stu_game_id: 1,
	pet_name: '',
	pet_type: '',
	img: '',
	adopt_condition: '',
	sort_order: 0,
	status: 1
})
const petRules = {
	pet_name: [{ required: true, message: '请输入宠物名称', trigger: 'blur' }],
	pet_type: [{ required: true, message: '请输入宠物类型', trigger: 'blur' }],
	img: [{ required: true, message: '请输入图片路径', trigger: 'blur' }],
}

const fetchPets = async () => {
	petsLoading.value = true
	try {
		const res = await getPetConfigs({ game_id: 1 })
		if (res.code === 1) {
			petsList.value = res.data || []
		}
	} catch (error) {
		ElMessage.error('获取宠物列表失败')
	} finally {
		petsLoading.value = false
	}
}

const openPetDialog = (pet?: any) => {
	if (pet) {
		petDialogTitle.value = '编辑宠物'
		petForm.value = {
			pet_id: pet.pet_id,
			stu_class_id: pet.stu_class_id || 0,
			stu_game_id: pet.stu_game_id || 1,
			pet_name: pet.pet_name || '',
			pet_type: pet.pet_type || '',
			img: pet.img || '',
			adopt_condition: pet.adopt_condition || '',
			sort_order: pet.sort_order || 0,
			status: pet.status ?? 1
		}
	} else {
		petDialogTitle.value = '添加宠物'
		petForm.value = {
			pet_id: null,
			stu_class_id: 0,
			stu_game_id: 1,
			pet_name: '',
			pet_type: '',
			img: '',
			adopt_condition: '',
			sort_order: 0,
			status: 1
		}
	}
	petDialogVisible.value = true
}

const submitPetForm = async () => {
		if (!petFormRef.value) return
		const validateResult = await (petFormRef.value as any).validate().catch(() => false)
		if (!validateResult) return
		petSubmitLoading.value = true
		try {
			const res = await savePetConfig(petForm.value)
			if (res && res.code === 1) {
				ElMessage.success('保存成功')
				petDialogVisible.value = false
				await fetchPets()
			} else {
				ElMessage.error(res?.msg || '保存失败')
			}
		} catch (error) {
			ElMessage.error('网络错误，请检查网络连接')
			console.error('保存宠物配置失败:', error)
		} finally {
			petSubmitLoading.value = false
		}
	}

const handleDeletePet = (pet: any) => {
		ElMessageBox.confirm(`确定删除宠物"${pet.pet_name}"吗？`, '提示', { type: 'warning' })
			.then(async () => {
				try {
					const res = await deletePetConfig({ pet_id: pet.pet_id })
					if (res && res.code === 1) {
						ElMessage.success('删除成功')
						await fetchPets()
					} else {
						ElMessage.error(res?.msg || '删除失败')
					}
				} catch (error) {
					ElMessage.error('网络错误，请检查网络连接')
					console.error('删除宠物失败:', error)
				}
			})
			.catch(() => {})
	}

// ==================== 食品配置 ====================
const foodsList = ref<any[]>([])
const foodsLoading = ref(false)
const foodDialogVisible = ref(false)
const foodDialogTitle = ref('添加食品')
const foodFormRef = ref()
const foodSubmitLoading = ref(false)
const foodForm = ref({
	id: null as number | null,
	food_code: '',
	food_name: '',
	energy_add: 10,
	rarity: 'common',
	sort: 0,
	status: 1
})
const foodRules = {
	food_code: [{ required: true, message: '请输入食品编码', trigger: 'blur' }],
	food_name: [{ required: true, message: '请输入食品名称', trigger: 'blur' }],
	energy_add: [{ required: true, message: '请输入能量值', trigger: 'blur' }],
}

const fetchFoods = async () => {
	foodsLoading.value = true
	try {
		const res = await getFoodConfigs()
		if (res.code === 1) {
			foodsList.value = res.data || []
		}
	} catch (error) {
		ElMessage.error('获取食品列表失败')
	} finally {
		foodsLoading.value = false
	}
}

const openFoodDialog = (food?: any) => {
	if (food) {
		foodDialogTitle.value = '编辑食品'
		foodForm.value = {
			id: food.id,
			food_code: food.food_code || '',
			food_name: food.food_name || '',
			energy_add: food.energy_add || 10,
			rarity: food.rarity || 'common',
			sort: food.sort || 0,
			status: food.status ?? 1
		}
	} else {
		foodDialogTitle.value = '添加食品'
		foodForm.value = {
			id: null,
			food_code: '',
			food_name: '',
			energy_add: 10,
			rarity: 'common',
			sort: 0,
			status: 1
		}
	}
	foodDialogVisible.value = true
}

const submitFoodForm = async () => {
		if (!foodFormRef.value) return
		const validateResult = await (foodFormRef.value as any).validate().catch(() => false)
		if (!validateResult) return
		foodSubmitLoading.value = true
		try {
			const res = await saveFoodConfig(foodForm.value)
			if (res && res.code === 1) {
				ElMessage.success('保存成功')
				foodDialogVisible.value = false
				await fetchFoods()
			} else {
				ElMessage.error(res?.msg || '保存失败')
			}
		} catch (error) {
			ElMessage.error('网络错误，请检查网络连接')
			console.error('保存食品配置失败:', error)
		} finally {
			foodSubmitLoading.value = false
		}
	}

const handleDeleteFood = (food: any) => {
	ElMessageBox.confirm(`确定删除食品"${food.food_name}"吗？`, '提示', { type: 'warning' })
		.then(async () => {
			try {
				const res = await deleteFoodConfig({ id: food.id })
				if (res && res.code === 1) {
					ElMessage.success('删除成功')
					await fetchFoods()
				} else {
					ElMessage.error(res?.msg || '删除失败')
				}
			} catch (error) {
				ElMessage.error('网络错误，请检查网络连接')
				console.error('删除食品失败:', error)
			}
		})
		.catch(() => {})
}

// ==================== 玩具配置 ====================
const toysList = ref<any[]>([])
const toysLoading = ref(false)
const toyDialogVisible = ref(false)
const toyDialogTitle = ref('添加玩具')
const toyFormRef = ref()
const toySubmitLoading = ref(false)
const toyForm = ref({
	id: null as number | null,
	toy_code: '',
	toy_name: '',
	mood_add: 10,
	rarity: 'common',
	sort: 0,
	status: 1
})
const toyRules = {
	toy_code: [{ required: true, message: '请输入玩具编码', trigger: 'blur' }],
	toy_name: [{ required: true, message: '请输入玩具名称', trigger: 'blur' }],
	mood_add: [{ required: true, message: '请输入心情值', trigger: 'blur' }],
}

const fetchToys = async () => {
	toysLoading.value = true
	try {
		const res = await getToyConfigs()
		if (res.code === 1) {
			toysList.value = res.data || []
		}
	} catch (error) {
		ElMessage.error('获取玩具列表失败')
	} finally {
		toysLoading.value = false
	}
}

const openToyDialog = (toy?: any) => {
	if (toy) {
		toyDialogTitle.value = '编辑玩具'
		toyForm.value = {
			id: toy.id,
			toy_code: toy.toy_code || '',
			toy_name: toy.toy_name || '',
			mood_add: toy.mood_add || 10,
			rarity: toy.rarity || 'common',
			sort: toy.sort || 0,
			status: toy.status ?? 1
		}
	} else {
		toyDialogTitle.value = '添加玩具'
		toyForm.value = {
			id: null,
			toy_code: '',
			toy_name: '',
			mood_add: 10,
			rarity: 'common',
			sort: 0,
			status: 1
		}
	}
	toyDialogVisible.value = true
}

const submitToyForm = async () => {
		if (!toyFormRef.value) return
		const validateResult = await (toyFormRef.value as any).validate().catch(() => false)
		if (!validateResult) return
		toySubmitLoading.value = true
		try {
			const res = await saveToyConfig(toyForm.value)
			if (res && res.code === 1) {
				ElMessage.success('保存成功')
				toyDialogVisible.value = false
				await fetchToys()
			} else {
				ElMessage.error(res?.msg || '保存失败')
			}
		} catch (error) {
			ElMessage.error('网络错误，请检查网络连接')
			console.error('保存玩具配置失败:', error)
		} finally {
			toySubmitLoading.value = false
		}
	}

const handleDeleteToy = (toy: any) => {
	ElMessageBox.confirm(`确定删除玩具"${toy.toy_name}"吗？`, '提示', { type: 'warning' })
		.then(async () => {
			try {
				const res = await deleteToyConfig({ id: toy.id })
				if (res && res.code === 1) {
					ElMessage.success('删除成功')
					await fetchToys()
				} else {
					ElMessage.error(res?.msg || '删除失败')
				}
			} catch (error) {
				ElMessage.error('网络错误，请检查网络连接')
				console.error('删除玩具失败:', error)
			}
		})
		.catch(() => {})
}

// ==================== 初始化 ====================
onMounted(async () => {
	await fetchPets()
	await fetchFoods()
	await fetchToys()
})

// 监听标签页切换，重新获取数据
const handleTabChange = async (tab: any) => {
	const tabName = tab.props.name || tab.name
	activeTab.value = tabName
	if (tabName === 'pets') {
		await fetchPets()
	} else if (tabName === 'foods') {
		await fetchFoods()
	} else if (tabName === 'toys') {
		await fetchToys()
	}
}
</script>

<style scoped>
.pet-game-config {
	padding: 16px;
	min-height: 500px;
}

.tab-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}

.tab-header h3 {
	margin: 0;
	font-size: 15px;
	font-weight: 600;
	color: #1e293b;
}

.pet-img {
	width: 50px;
	height: 50px;
	object-fit: cover;
	border-radius: 6px;
}

.no-img {
	color: #c0c4cc;
	font-size: 12px;
}
</style>
