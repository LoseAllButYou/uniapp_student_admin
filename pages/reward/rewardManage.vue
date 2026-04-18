<template>
	<div class="reward-manage-container">
		<el-card class="class-card" shadow="never">
			<div class="class-header">
				<div class="class-name">{{ className }}</div>
				<div class="header-actions">
					<el-button type="success" @click="openGameImportDialog">
						🎮 一键配置游戏商品
					</el-button>
					<el-button type="primary" @click="openAddDialog">
						<el-icon><Plus /></el-icon> 添加商品
					</el-button>
				</div>
			</div>
		</el-card>

		<div class="reward-grid">
			<el-card v-for="item in rewardList" :key="item.id" class="reward-card" shadow="hover">
				<div class="reward-image">
					<img :src="item.image || defaultImage" @error="handleImageError" />
					<div class="reward-type" :class="getTypeClass(item.type)">
						{{ getTypeName(item.type) }}
					</div>
				</div>
				<div class="reward-info">
					<div class="reward-name">{{ item.name }}</div>
					<div class="reward-code" v-if="item.code">
						<span class="code-label">编码：</span>
						<span class="code-value">{{ item.code }}</span>
					</div>
					<div class="reward-attrs">
						<el-tag size="small" effect="plain">
							{{ item.points }} 积分
						</el-tag>
						<el-tag size="small" :type="item.stock <= 10 ? 'warning' : 'info'" effect="plain">
							库存: {{ item.stock }}
						</el-tag>
						<el-tag size="small" :type="item.status === 1 ? 'success' : 'info'" effect="plain">
							{{ item.status === 1 ? '上架' : '下架' }}
						</el-tag>
						<el-tag v-if="[3, 4].includes(item.type)" size="small" type="primary" effect="dark">
							{{ getGameName(item.game_id) }}
						</el-tag>
					</div>
					<div class="reward-desc">
						<span class="desc-label">描述：</span>
						<span class="desc-content" :class="{'desc-empty': !item.description}">{{ item.description || '没有商品描述' }}</span>
					</div>
					<div class="reward-actions">
						<el-button type="primary" size="small" @click="openEditDialog(item)">编辑</el-button>
						<el-button type="danger" size="small" @click="handleDelete(item)">删除</el-button>
					</div>
				</div>
			</el-card>
			<el-empty v-if="rewardList.length === 0" description="暂无商品，点击添加商品" />
		</div>

		<!-- 添加/编辑弹窗 -->
		<el-dialog v-model="dialogVisible" :title="dialogTitle" width="550px" @close="resetForm">
			<el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
				<el-form-item label="奖品类型" prop="type">
					<el-select v-model="form.type" placeholder="请选择奖品类型" style="width: 100%">
						<el-option label="学生奖励（总积分）" :value="1" />
						<el-option label="学生周奖（当周积分）" :value="2" />
						<el-option label="小组奖励（总积分排名发放）" :value="3" />
						<el-option label="小组周奖（当周积分排名发放）" :value="4" />
					</el-select>
				</el-form-item>
				<el-form-item v-if="isGameType" label="所属游戏" prop="game_id">
					<el-select v-model="form.game_id" placeholder="请选择所属游戏" style="width: 100%">
						<el-option label="宠物乐园" :value="1" />
						<el-option label="种树游戏" :value="2" />
					</el-select>
				</el-form-item>
				<el-form-item label="奖品名称" prop="name">
				<el-input v-model="form.name" placeholder="请输入奖品名称" />
			</el-form-item>
			<el-form-item label="商品编码" prop="code">
				<el-input v-model="form.code" placeholder="商品编码" :disabled="!!form.id">
					<template #append v-if="!form.id">
						<el-button @click="generateCode">生成</el-button>
					</template>
				</el-input>
			</el-form-item>
				<el-form-item label="所需积分" prop="points">
					<el-input-number v-model="form.points" :min="1" :max="99999" placeholder="所需积分" style="width: 100%" />
				</el-form-item>
				<el-form-item label="库存数量" prop="stock">
					<el-input-number v-model="form.stock" :min="0" :max="9999" placeholder="库存数量" style="width: 100%" />
				</el-form-item>
				<el-form-item label="商品图片">
					<div class="upload-container">
						<el-upload class="avatar-uploader" action="/api/stu/reward/upload" :headers="uploadHeaders"
							:show-file-list="false" :on-success="handleUploadSuccess" :before-upload="beforeUpload">
							<img v-if="form.image" :src="form.image" class="avatar" />
							<el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
						</el-upload>
						<div class="upload-tip">支持jpg、png格式，建议尺寸200x200</div>
					</div>
				</el-form-item>
				<el-form-item label="商品描述" prop="description">
					<el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入商品描述" />
				</el-form-item>
				<el-form-item label="上架状态" prop="status">
					<el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="上架" inactive-text="下架" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="dialogVisible = false">取消</el-button>
				<el-button type="primary" :loading="submitLoading" @click="submitForm">确定</el-button>
			</template>
		</el-dialog>

		<!-- 一键配置游戏商品弹窗 -->
		<el-dialog v-model="gameImportVisible" title="🎮 一键配置游戏商品" width="700px" top="5vh" :close-on-click-modal="false">
			<el-steps :active="importStep" finish-status="success" simple style="margin-bottom:20px">
				<el-step title="选择类型" />
				<el-step title="选择商品" />
				<el-step title="确认导入" />
			</el-steps>

			<!-- 步骤1：选择商品类型 -->
			<div v-if="importStep === 0" class="import-step">
				<div class="type-select-grid">
					<div v-for="cfg in GAME_ITEM_CONFIGS" :key="cfg.key" class="type-select-card" :class="{selected: selectedImportType === cfg.key}" @click="selectImportType(cfg.key)">
						<div class="type-icon">{{ cfg.icon }}</div>
						<div class="type-label">{{ cfg.label }}</div>
						<div class="type-desc">类型{{ cfg.type }} · {{ cfg.effectLabel }}+{{ cfg.itemType === 'food' ? '食物' : '玩具' }}</div>
					</div>
				</div>
			</div>

			<!-- 步骤2：选择具体商品 -->
			<div v-if="importStep === 1" class="import-step">
				<div v-loading="gameItemsLoading">
					<div class="select-all-row">
						<el-checkbox v-model="allGameItemsSelected" @change="toggleAllGameItems">全选</el-checkbox>
					</div>
					<div class="game-items-grid">
						<div v-for="item in gameItems" :key="item.id" class="game-item-card" :class="{selected: selectedGameItems.includes(item.id)}" @click="toggleGameItem(item.id)">
							<el-checkbox :model-value="selectedGameItems.includes(item.id)" @click.stop @change="toggleGameItem(item.id)" />
							<div class="game-item-name">{{ currentImportConfig?.itemType === 'food' ? item.food_name : item.toy_name }}</div>
							<div class="game-item-effect">
								{{ currentImportConfig?.effectLabel }}+{{ currentImportConfig?.itemType === 'food' ? item.energy_add : item.mood_add }}
							</div>
							<el-tag size="small" :type="item.rarity === 'epic' ? 'danger' : item.rarity === 'rare' ? 'warning' : 'info'">
								{{ item.rarity === 'epic' ? '史诗' : item.rarity === 'rare' ? '稀有' : '普通' }}
							</el-tag>
							<div class="game-item-upload" @click.stop>
								<el-upload
									action="/api/stu/reward/upload"
									:headers="uploadHeaders"
									:show-file-list="false"
									:on-success="(res:any) => handleItemUploadSuccess(res, item.id)"
									:before-upload="beforeUpload"
									class="item-img-uploader"
								>
									<img v-if="itemImages[item.id]" :src="itemImages[item.id]" class="item-img" />
									<span v-else class="upload-placeholder">📷 上传图片</span>
								</el-upload>
							</div>
						</div>
					</div>
					<el-empty v-if="gameItems.length === 0 && !gameItemsLoading" description="暂无可用商品" />
				</div>
			</div>

			<!-- 步骤3：确认导入 -->
			<div v-if="importStep === 2" class="import-step">
				<el-form :model="importForm" :rules="importRules" ref="importFormRef" label-width="100px">
					<el-form-item label="商品类型">
						<el-tag type="success">{{ currentImportConfig?.label }} (类型{{ currentImportConfig?.type }})</el-tag>
					</el-form-item>
					<el-form-item label="所属游戏">
						<el-tag type="primary">{{ currentImportConfig?.gameId === 1 ? '宠物乐园' : '种树游戏' }}</el-tag>
					</el-form-item>
					<el-form-item label="已选商品">
						<span>{{ selectedGameItems.length }} 件</span>
					</el-form-item>
					<el-form-item label="商品编码">
						<el-tag type="info" v-for="item in selectedGameItemsDetail" :key="item.id" style="margin:2px">
							{{ item.code }}
						</el-tag>
					</el-form-item>
					<el-form-item label="默认积分" prop="points">
						<el-input-number v-model="importForm.points" :min="1" :max="9999" style="width:200px" />
					</el-form-item>
					<el-form-item label="默认库存" prop="stock">
						<el-input-number v-model="importForm.stock" :min="1" :max="9999" style="width:200px" />
					</el-form-item>
					<el-form-item label="导入预览">
						<div class="import-preview-list">
							<div v-for="item in selectedGameItemsDetail" :key="item.id" class="preview-item">
								<img v-if="itemImages[item.id]" :src="itemImages[item.id]" class="preview-img" />
								<div v-else class="preview-img-placeholder">无图</div>
								<div class="preview-info">
									<div class="preview-name">{{ item.name }}</div>
									<div class="preview-desc">{{ item.description }}</div>
								</div>
							</div>
						</div>
					</el-form-item>
				</el-form>
			</div>

			<template #footer>
				<el-button v-if="importStep > 0" @click="importStep--">上一步</el-button>
				<el-button @click="gameImportVisible = false">取消</el-button>
				<el-button v-if="importStep < 2" type="primary" :disabled="importStep === 0 && !selectedImportType || importStep === 1 && selectedGameItems.length === 0" @click="nextImportStep">下一步</el-button>
				<el-button v-if="importStep === 2" type="primary" :loading="importLoading" @click="submitGameImport">确认导入</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
	import { ref, computed, onMounted } from 'vue'
	import { ElMessage, ElMessageBox } from 'element-plus'
	import { Plus } from '@element-plus/icons-vue'
	import { getRewardList, addReward, editReward, deleteReward, getPetFoodList, getPetToyList } from '@/api/request'
	import { useClassData } from '@/api/useClassData'
	import { GAME_ITEM_CONFIGS } from './gameItemConfig'

	const { currentClass, className, loadClassInfo, loadLocalData } = useClassData()
	
	const rewardList = ref<any[]>([])
	const defaultImage = '/web/static/reward-default.png'
	const dialogVisible = ref(false)
	const dialogTitle = ref('添加商品')
	const submitLoading = ref(false)
	const formRef = ref(null)

	const form = ref({
		id: null,
		stu_class_id: null,
		type: 1,
		game_id: 1,
		name: '',
		code: '',
		points: 10,
		stock: 999,
		image: '',
		description: '',
		status: 1
	})

	const rules = {
		type: [{ required: true, message: '请选择奖品类型', trigger: 'change' }],
		name: [{ required: true, message: '请输入奖品名称', trigger: 'blur' }],
		points: [{ required: true, message: '请输入所需积分', trigger: 'blur' }],
		stock: [{ required: true, message: '请输入库存数量', trigger: 'blur' }]
	}

	const uploadHeaders = {
		Authorization: uni.getStorageSync('token') || ''
	}

	const getTypeName = (type: number) => {
		const map: Record<number, string> = { 1: '学生奖励', 2: '学生周奖', 3: '小组奖励', 4: '小组周奖' }
		return map[type] || '未知'
	}

	const getTypeClass = (type: number) => {
		const map: Record<number, string> = { 1: 'type-student', 2: 'type-student-week', 3: 'type-group', 4: 'type-group-week' }
		return map[type] || ''
	}

	const getGameName = (gameId: number) => {
		const map: Record<number, string> = { 0: '无', 1: '宠物乐园', 2: '种树游戏' }
		return map[gameId] || '未知游戏'
	}

	const generateCode = () => {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
		let code = ''
		for (let i = 0; i < 12; i++) {
			code += chars.charAt(Math.floor(Math.random() * chars.length))
		}
		form.value.code = code
	}

	const handleImageError = (e: Event) => {
		(e.target as HTMLImageElement).src = defaultImage
	}

	const fetchRewardList = async () => {
		if (!currentClass.value?.id) return
		try {
			const res = await getRewardList({ class_id: currentClass.value.id })
			if (res.code === 1) {
				rewardList.value = res.data
			}
		} catch (error) {
			console.error(error)
			ElMessage.error('获取商品列表失败')
		}
	}

	const openAddDialog = () => {
	dialogTitle.value = '添加商品'
	resetForm()
	dialogVisible.value = true
}

const openEditDialog = (item: any) => {
	dialogTitle.value = '编辑商品'
	form.value = {
		id: item.id,
		stu_class_id: item.stu_class_id,
		type: item.type,
		game_id: item.game_id || (isGameType.value ? 1 : 0),
		name: item.name,
		code: item.code || '',
		points: item.points,
		stock: item.stock,
		image: item.image || '',
		description: item.description || '',
		status: item.status
	}
	dialogVisible.value = true
}

const resetForm = () => {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	let code = ''
	for (let i = 0; i < 12; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length))
	}
	form.value = {
		id: null,
		stu_class_id: currentClass.value?.id,
		type: 1,
		game_id: 1,
		name: '',
		code: code,
		points: 10,
		stock: 999,
		image: '',
		description: '',
		status: 1
	}
	if (formRef.value) {
		(formRef.value as any).resetFields()
	}
}

const isGameType = computed(() => {
	return [3, 4].includes(form.value.type)
})

	const beforeUpload = (file: File) => {
		const isImage = file.type === 'image/jpeg' || file.type === 'image/png'
		const isLt2M = file.size / 1024 / 1024 < 20
		if (!isImage) {
			ElMessage.error('只能上传 JPG/PNG 格式图片!')
			return false
		}
		if (!isLt2M) {
			ElMessage.error('图片大小不能超过 2MB!')
			return false
		}
		return true
	}

	const handleUploadSuccess = (res: any) => {
		if (res.code === 1) {
			form.value.image = res.data.fullurl
			ElMessage.success('上传成功')
		} else {
			ElMessage.error(res.msg || '上传失败')
		}
	}

	const submitForm = async () => {
		if (!formRef.value) return
		await (formRef.value as any).validate()
		submitLoading.value = true
		form.value.stu_class_id = currentClass.value?.id
		try {
			let res
			if (form.value.id) {
				res = await editReward(form.value)
			} else {
				res = await addReward(form.value)
			}
			if (res.code === 1) {
				ElMessage.success(form.value.id ? '编辑成功' : '添加成功')
				dialogVisible.value = false
				await fetchRewardList()
			} else {
				ElMessage.error(res.msg || '操作失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		} finally {
			submitLoading.value = false
		}
	}

	const handleDelete = (item: any) => {
		ElMessageBox.confirm(`确定删除商品“${item.name}”吗？`, '提示', { type: 'warning' })
			.then(async () => {
				try {
					const res = await deleteReward({ id: item.id })
					if (res.code === 1) {
						ElMessage.success('删除成功')
						await fetchRewardList()
					} else {
						ElMessage.error(res.msg || '删除失败')
					}
				} catch (error) {
					ElMessage.error('网络错误')
				}
			})
			.catch(() => {})
	}

	const gameImportVisible = ref(false)
	const importStep = ref(0)
	const selectedImportType = ref('')
	const gameItems = ref<any[]>([])
	const selectedGameItems = ref<number[]>([])
	const gameItemsLoading = ref(false)
	const importLoading = ref(false)
	const importFormRef = ref()
	const importForm = ref({ points: 10, stock: 99 })
	const itemImages = ref<Record<number, string>>({})
	const importRules = {
		points: [{ required: true, message: '请输入默认积分', trigger: 'blur' }],
		stock: [{ required: true, message: '请输入默认库存', trigger: 'blur' }],
	}

	const currentImportConfig = computed(() => GAME_ITEM_CONFIGS.find(c => c.key === selectedImportType.value))

	const allGameItemsSelected = computed(() => gameItems.value.length > 0 && selectedGameItems.value.length === gameItems.value.length)

	const selectedGameItemsDetail = computed(() => {
		const cfg = currentImportConfig.value
		if (!cfg) return []
		return gameItems.value
			.filter(item => selectedGameItems.value.includes(item.id))
			.map(item => ({
				id: item.id,
				name: cfg.itemType === 'food' ? item.food_name : item.toy_name,
				code: cfg.itemType === 'food' ? item.food_code : item.toy_code,
				description: `${cfg.effectLabel}+${cfg.itemType === 'food' ? item.energy_add : item.mood_add} | 稀有度:${item.rarity || '普通'}`,
			}))
	})

	const openGameImportDialog = () => {
		importStep.value = 0
		selectedImportType.value = ''
		gameItems.value = []
		selectedGameItems.value = []
		importForm.value = { points: 10, stock: 99 }
		itemImages.value = {}
		gameImportVisible.value = true
	}

	const selectImportType = (key: string) => {
		selectedImportType.value = key
	}

	const nextImportStep = async () => {
		if (importStep.value === 0 && !selectedImportType.value) return
		if (importStep.value === 1 && selectedGameItems.value.length === 0) return

		if (importStep.value === 0) {
			gameItemsLoading.value = true
			try {
				const cfg = currentImportConfig.value!
				
				// 获取已配置的奖品列表
				const rewardRes = await getRewardList({ class_id: currentClass.value?.id })
				const existingRewards = rewardRes.code === 1 ? rewardRes.data : []
				const existingNames = existingRewards
					.filter((r: any) => r.type === cfg.type)
					.map((r: any) => r.name)

				// 获取游戏商品列表
				const apiFn = cfg.itemType === 'food' ? getPetFoodList : getPetToyList
				const res = await apiFn()
				if (res.code === 1) {
					// 过滤掉已配置的商品
					gameItems.value = res.data.filter((item: any) => {
						const itemName = cfg.itemType === 'food' ? item.food_name : item.toy_name
						return !existingNames.includes(itemName)
					})
					selectedGameItems.value = []
				}
			} catch (e) {
				ElMessage.error('获取游戏商品失败')
			} finally {
				gameItemsLoading.value = false
			}
		}
		importStep.value++
	}

	const toggleGameItem = (id: number) => {
		const idx = selectedGameItems.value.indexOf(id)
		if (idx >= 0) {
			selectedGameItems.value.splice(idx, 1)
		} else {
			selectedGameItems.value.push(id)
		}
	}

	const toggleAllGameItems = (checked: boolean) => {
		selectedGameItems.value = checked ? gameItems.value.map(i => i.id) : []
	}

	const handleItemUploadSuccess = (res: any, itemId: number) => {
		if (res.code === 1) {
			itemImages.value[itemId] = res.data.fullurl
			ElMessage.success('上传成功')
		} else {
			ElMessage.error(res.msg || '上传失败')
		}
	}

	const submitGameImport = async () => {
		if (!importFormRef.value) return
		await (importFormRef.value as any).validate()
		if (!currentImportConfig.value || !currentClass.value?.id) return

		importLoading.value = true
		let successCount = 0
		let failCount = 0

		try {
			const cfg = currentImportConfig.value!
			const items = gameItems.value.filter(item => selectedGameItems.value.includes(item.id))

			for (const item of items) {
				const name = cfg.itemType === 'food' ? item.food_name : item.toy_name
				const effectVal = cfg.itemType === 'food' ? item.energy_add : item.mood_add
				const code = cfg.itemType === 'food' ? item.food_code : item.toy_code
				try {
					const res = await addReward({
						stu_class_id: currentClass.value!.id,
						type: cfg.type,
						game_id: cfg.gameId,
						code: code,
						name: name,
						points: importForm.value.points,
						stock: importForm.value.stock,
						image: itemImages.value[item.id] || '',
						description: `${cfg.effectLabel}+${effectVal} | 稀有度:${item.rarity || '普通'}`,
						status: 1,
					})
					if (res.code === 1) {
						successCount++
					} else {
						failCount++
						console.warn(`导入"${name}"失败:`, res.msg)
					}
				} catch (e) {
					failCount++
					console.warn(`导入"${name}"异常:`, e)
				}
			}

			if (successCount > 0) {
				ElMessage.success(`成功导入 ${successCount} 件商品${failCount > 0 ? `，${failCount} 件失败` : ''}`)
				gameImportVisible.value = false
				await fetchRewardList()
			} else {
				ElMessage.error('导入失败，请检查后重试')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		} finally {
			importLoading.value = false
		}
	}

	onMounted(async () => {
		await loadClassInfo()
		await loadLocalData()
		await fetchRewardList()
	})
</script>

<style scoped>
	/* 样式保持不变，与之前相同 */
	.reward-manage-container {
		padding: 20px;
		background: #f5f7fa;
		min-height: calc(100vh - 60px);
	}
	.class-card {
		margin-bottom: 20px;
		border-radius: 16px;
	}
	.class-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.class-name {
		font-size: 1.2rem;
		font-weight: 600;
		color: #1e293b;
	}
	.reward-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 20px;
	}
	.reward-card {
		border-radius: 16px;
		overflow: hidden;
		transition: all 0.3s;
	}
	.reward-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
	}
	.reward-image {
		position: relative;
		height: 160px;
		overflow: hidden;
	}
	.reward-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.reward-type {
		position: absolute;
		top: 12px;
		right: 12px;
		padding: 4px 12px;
		border-radius: 20px;
		font-size: 12px;
		font-weight: 500;
		color: white;
	}
	.type-student { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.type-student-week { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.type-group { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.type-group-week { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.reward-info { padding: 16px; }
.reward-name { font-size: 1.1rem; font-weight: 600; color: #1e293b; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.reward-code {
	margin-bottom: 8px;
	padding: 4px 8px;
	background: #f0f9ff;
	border-radius: 4px;
	border-left: 3px solid #3b82f6;
}
.code-label { font-size: 12px; color: #64748b; font-weight: 500; }
.code-value { font-size: 12px; color: #1e40af; font-family: 'Courier New', monospace; font-weight: 600; }
.reward-attrs {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-bottom: 10px;
}
.reward-desc {
	margin-bottom: 10px;
	padding: 8px 10px;
	background: #f8fafc;
	border-radius: 6px;
	border: 1px solid #e2e8f0;
	font-size: 13px;
	line-height: 1.4;
}
.desc-label {
	color: #94a3b8;
	font-weight: 500;
	margin-right: 4px;
}
.desc-content {
	color: #475569;
}
.desc-empty {
	color: #c0c4cc;
	font-style: italic;
}
.reward-actions { display: flex; gap: 8px; }
	.upload-container { display: flex; flex-direction: column; gap: 8px; }
	.avatar-uploader { border: 1px dashed #d9d9d9; border-radius: 8px; cursor: pointer; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fafafa; }
	.avatar-uploader:hover { border-color: #409eff; }
	.avatar { width: 100%; height: 100%; object-fit: cover; }
	.avatar-uploader-icon { font-size: 28px; color: #8c939d; }
	.upload-tip { font-size: 12px; color: #909399; }

	.header-actions { display: flex; gap: 10px; }

	.type-select-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
	.type-select-card {
		padding: 24px 16px; border: 2px solid #e8e8e8; border-radius: 12px; cursor: pointer;
		text-align: center; transition: all 0.2s;
	}
	.type-select-card:hover { border-color: #409eff; background: #f0f7ff; }
	.type-select-card.selected { border-color: #409eff; background: #e1f0ff; box-shadow: 0 0 8px rgba(64,158,255,0.3); }
	.type-icon { font-size: 36px; margin-bottom: 8px; }
	.type-label { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 4px; }
	.type-desc { font-size: 12px; color: #999; }

	.game-items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-top: 12px; }
	.game-item-card {
		padding: 12px; border: 2px solid #eee; border-radius: 8px; cursor: pointer;
		transition: all 0.2s; display: flex; flex-direction: column; gap: 4px;
	}
	.game-item-card:hover { border-color: #409eff; }
	.game-item-card.selected { border-color: #409eff; background: #f0f7ff; }
	.game-item-name { font-size: 14px; font-weight: 500; }
	.game-item-effect { font-size: 12px; color: #67c23a; }
	.game-item-upload { margin-top: 6px; }
	.item-img-uploader { width: 100%; }
	.item-img-uploader :deep(.el-upload) { width: 100%; border: 1px dashed #d9d9d9; border-radius: 6px; cursor: pointer; overflow: hidden; }
	.item-img-uploader :deep(.el-upload):hover { border-color: #409eff; }
	.item-img { width: 100%; height: 60px; object-fit: cover; display: block; }
	.upload-placeholder { display: block; padding: 8px; text-align: center; font-size: 12px; color: #909399; }
	.select-all-row { margin-bottom: 8px; }

	.import-preview-list { max-height: 300px; overflow-y: auto; }
	.preview-item { display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 6px; }
	.preview-img { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
	.preview-img-placeholder { width: 40px; height: 40px; background: #f5f5f5; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #ccc; }
	.preview-info { flex: 1; }
	.preview-name { font-size: 14px; font-weight: 500; }
	.preview-desc { font-size: 12px; color: #999; }
</style>