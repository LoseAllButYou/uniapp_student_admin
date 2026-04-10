<template>
	<div class="reward-manage-container">
		<el-card class="class-card" shadow="never">
			<div class="class-header">
				<div class="class-name">{{ className }}</div>
				<el-button type="primary" @click="openAddDialog">
					<el-icon><Plus /></el-icon> 添加商品
				</el-button>
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
					<div class="reward-points">
						<span class="points">{{ item.points }}</span> 积分
					</div>
					<div class="reward-stock">
						库存：<span :class="{ 'low-stock': item.stock <= 10 }">{{ item.stock }}</span>
					</div>
					<div class="reward-status">
						<el-tag :type="item.status === 1 ? 'success' : 'info'" size="small">
							{{ item.status === 1 ? '上架' : '下架' }}
						</el-tag>
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
				<el-form-item label="奖品名称" prop="name">
					<el-input v-model="form.name" placeholder="请输入奖品名称" />
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
	</div>
</template>

<script setup lang="ts">
	import { ref, onMounted } from 'vue'
	import { ElMessage, ElMessageBox } from 'element-plus'
	import { Plus } from '@element-plus/icons-vue'
	import { getRewardList, addReward, editReward, deleteReward } from '@/api/request'
	import { useClassData } from '@/api/useClassData'

	const { currentClass, className, loadClassInfo, loadLocalData } = useClassData()
	
	const rewardList = ref<any[]>([])
	const defaultImage = '/static/reward-default.png'
	const dialogVisible = ref(false)
	const dialogTitle = ref('添加商品')
	const submitLoading = ref(false)
	const formRef = ref(null)

	const form = ref({
		id: null,
		stu_class_id: null,
		type: 1,
		name: '',
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
			name: item.name,
			points: item.points,
			stock: item.stock,
			image: item.image || '',
			description: item.description || '',
			status: item.status
		}
		dialogVisible.value = true
	}

	const resetForm = () => {
		form.value = {
			id: null,
			stu_class_id: currentClass.value?.id,
			type: 1,
			name: '',
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
	.reward-points { font-size: 0.9rem; color: #f59e0b; margin-bottom: 6px; }
	.points { font-size: 1.2rem; font-weight: 700; }
	.reward-stock { font-size: 0.85rem; color: #64748b; margin-bottom: 8px; }
	.low-stock { color: #ef4444; font-weight: 600; }
	.reward-status { margin-bottom: 12px; }
	.reward-actions { display: flex; gap: 8px; }
	.upload-container { display: flex; flex-direction: column; gap: 8px; }
	.avatar-uploader { border: 1px dashed #d9d9d9; border-radius: 8px; cursor: pointer; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fafafa; }
	.avatar-uploader:hover { border-color: #409eff; }
	.avatar { width: 100%; height: 100%; object-fit: cover; }
	.avatar-uploader-icon { font-size: 28px; color: #8c939d; }
	.upload-tip { font-size: 12px; color: #909399; }
</style>