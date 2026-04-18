<template>
	<div class="student-manage-container">
		<!-- 小组筛选栏 -->
		<el-card class="filter-card" shadow="never">
			<el-form :inline="true" class="filter-form">
				<el-form-item label="小组筛选" prop="stu_group_info_id">
					<el-select v-model="filterForm.stu_group_info_id" placeholder="请选择小组" clearable
						@change="onGroupChange" style="width: 220px;">
						<el-option v-for="item in groupList" :key="item.id" :label="item.name +'<'+ item.description+'>'"
							:value="item.id" />
					</el-select>
				</el-form-item>
				<el-form-item>
					<el-button type="success" @click="openAddDialog">新增学生</el-button>
					<el-button type="warning" @click="downloadTemplate">下载学生模板</el-button>
					<el-button type="info" @click="importExcel">导入学生</el-button>
					<el-button type="info" @click="exportToExcel">导出学生信息</el-button>
					<el-button type="primary" plain @click="openSeatDialog">排座位</el-button>
					<el-button type="success" plain @click="openGroupNamingDialog">小组命名</el-button>
				</el-form-item>
			</el-form>
		</el-card>

		<!-- 年级/学期/周次筛选栏（简化版） -->
		<el-card class="filter-card" shadow="never">
			<div class="score-filter-bar">
				<el-button type="primary" plain @click="openScoreOperationDialog"
					:disabled="!selectedWeek">积分操作</el-button>
				<el-button type="primary" plain @click="openScoreRecordDialog">积分记录</el-button>
				<el-button type="primary" plain
					@click="toggleDetailMode">展示学生😊{{ detailMode ? '简要信息' : '详细信息' }}</el-button>
			</div>
		</el-card>

		<!-- 学生列表表格 -->
		<el-card class="table-card" shadow="hover">
			<el-table :data="studentList" border stripe v-loading="loading">
				<el-table-column prop="student_no" label="学号" width="120" v-if="detailMode" />
				<el-table-column prop="name" label="姓名" width="100" />
				<el-table-column prop="gender" label="性别" width="80" />
				<el-table-column prop="group_name" label="小组" width="100" />
				<el-table-column prop="group_description" label="小组花名" width="120" />
				<el-table-column prop="member_number" label="编号" width="80" align="center">
					<template #default="{ row }">{{ row.member_number ? `${row.member_number}号` : '-' }}</template>
				</el-table-column>
				<el-table-column prop="height" label="身高(cm)" width="100" v-if="detailMode" />
				<el-table-column prop="vision" label="视力" width="100" v-if="detailMode">
					<template #default="{ row }">{{ row.vision ? (row.vision / 10).toFixed(1) : '-' }}</template>
				</el-table-column>
				<el-table-column prop="score_rank" label="成绩排名" width="100" v-if="detailMode" />
				<el-table-column prop="current_points" label="剩余积分" width="100" sortable />
				<el-table-column prop="total_points" label="累计积分" width="100" sortable />
				<el-table-column label="操作" width="320" fixed="right">
					<template #default="{ row }">
						<el-button type="info" size="small" @click="openEditDialog(row)">编辑</el-button>
						<el-button type="danger" size="small" @click="deleteStudent(row)">删除</el-button>
					</template>
				</el-table-column>
			</el-table>
			<el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.limit"
				:total="pagination.total" layout="total, sizes, prev, pager, next" @size-change="handleSizeChange"
				@current-change="handleCurrentChange" />
		</el-card>

		<!-- 子组件弹窗 -->
		<StudentFormDialog v-model="formDialogVisible" :title="formDialogTitle" :class-id="currentClass?.id"
			:school-id="currentClass?.stu_school_id" :group-list="groupList" :student='selectStudent' :existing-students="originalStudents"
			@success="reloadStudents" />

		<GroupNamingDialog v-model="groupNamingVisible" :groups="groupList" :class-id="currentClass?.id"
			@success="reloadStudents" />

		<ScoreOperationDialog v-model="scoreOperationVisible" :class-id="currentClass?.id" :grade="selectedGrade"
			:semester="selectedSemester" :week="selectedWeek" :group-list="groupList" :students="originalStudents"
			:reason-options="reasonOptions" @refresh="reloadStudents" />

		<SeatArrangementDialog v-model="seatDialogVisible" :students="originalStudents" />

		<ScoreRecordDialog v-model="scoreRecordDialogVisible" :group-list="groupList" :all-students="originalStudents"
			:class-id="currentClass?.id" />
	</div>
</template>

<script setup lang="ts">
	import { ref, reactive, onMounted, onUnmounted } from 'vue'
	import { ElMessage, ElMessageBox } from 'element-plus'
	import * as XLSX from 'xlsx'
	import {
		getGroupList,
		getStudentList,
		addStudent,
		updateStudent,
		deleteStudent as deleteStudentApi,
		getScoreReasons
	} from '@/api/request'
	import StudentFormDialog from './StudentFormDialog.vue'
	import GroupNamingDialog from './GroupNamingDialog.vue'
	import ScoreOperationDialog from './ScoreOperationDialog.vue'
	import SeatArrangementDialog from './SeatArrangementDialog.vue'
	import ScoreRecordDialog from './ScoreRecordDialog.vue'

	// ========== 班级信息 ==========
	const currentClass = ref<any>(null)
	const selectedGrade = ref('')
	const selectedSemester = ref<number | null>(null)
	const selectedWeek = ref(0)
	const detailMode = ref(false)

	// ========== 数据 ==========
	const groupList = ref<any[]>([])
	const originalStudents = ref<any[]>([])
	const filteredStudents = ref<any[]>([])
	const studentList = ref<any[]>([])
	const loading = ref(false)
	const pagination = reactive({ page: 1, limit: 10, total: 0 })
	const filterForm = reactive({ stu_group_info_id: null })

	// 积分原因配置（传递给积分操作弹窗）
	const reasonOptions = ref<any[]>([])

	// 弹窗控制
	const formDialogVisible = ref(false)
	const formDialogTitle = ref('新增学生')
	const selectStudent = ref({})
	const groupNamingVisible = ref(false)
	const scoreOperationVisible = ref(false)
	const seatDialogVisible = ref(false)
	const scoreRecordVisible = ref(false)
	const currentStudentId = ref<number | null>(null)
	const currentStudentName = ref('')
	const scoreRecordDialogVisible = ref(false)

	// ========== 辅助函数 ==========
	const fetchCurrentClass = async () => {
		try {
			const teacherInfo = await uni.getStorageSync('teacherInfo')
			const classes = teacherInfo?.classes || []
			const currentClassId = await uni.getStorageSync('currentClassId')
			if (classes.length && currentClassId) {
				currentClass.value = classes.find((c : any) => c.id == currentClassId)
				selectedGrade.value = String(currentClass.value?.grade || '')
				const month = new Date().getMonth() + 1
				selectedSemester.value = month >= 3 && month <= 8 ? 2 : 1
				selectedWeek.value = 1 // 默认第一周，实际可按需计算
				console.log('xxxsx')
				await loadGroupList()
				await fetchAllStudents()
				await fetchScoreReasons()
			}
		} catch (error) {
			console.error(error)
		}
	}

	const loadGroupList = async () => {
		if (!currentClass.value) return
		const res = await getGroupList({ class_id: currentClass.value.id })
		if (res.code === 1) {
			groupList.value = res.data
			uni.setStorage({ key: 'group', data: groupList.value })
		}
	}

	const fetchAllStudents = async () => {
		if (!currentClass.value) return
		loading.value = true
		try {
			const res = await getStudentList({ class_id: currentClass.value.id, limit: 9999 })
			if (res.code === 1) {
				originalStudents.value = res.data.list.map((s : any) => ({
					...s,
					stu_group_info_id: s.stu_group_info_id ?? null
				}))
				uni.setStorage({ key: 'student', data: res.data })
				applyFilter()
			}
		} catch (error) {
			ElMessage.error('获取学生列表失败')
		} finally {
			loading.value = false
		}
	}

	const fetchScoreReasons = async () => {
		try {
			const res = await getScoreReasons()
			if (res.code === 1) reasonOptions.value = res.data
		} catch (error) {
			console.warn('获取积分原因失败', error)
		}
	}

	const applyFilter = () => {
		let filtered = [...originalStudents.value]
		if (filterForm.stu_group_info_id) {
			filtered = filtered.filter(s => s.stu_group_info_id === filterForm.stu_group_info_id)
		}
		filteredStudents.value = filtered
		pagination.total = filtered.length
		pagination.page = 1
		updatePageData()
	}

	const updatePageData = () => {
		const start = (pagination.page - 1) * pagination.limit
		const end = start + pagination.limit
		studentList.value = filteredStudents.value.slice(start, end)
	}

	const onGroupChange = () => {
		pagination.page = 1
		applyFilter()
	}

	const reloadStudents = async () => {
		await fetchAllStudents()
	}

	// ========== 事件处理 ==========
	const openAddDialog = () => {
		formDialogTitle.value = '新增学生'
		formDialogVisible.value = true
	}

	const openEditDialog = (row : any) => {
		formDialogTitle.value = '编辑学生'
		formDialogVisible.value = true
		selectStudent.value = row
		// 将学生数据传递给子组件，子组件需支持接收 row 数据
		// 此处简化，实际可通过 ref 或 props 传递，我们使用 v-model 绑定一个当前编辑的学生对象
		// 为简单，此处改为在子组件中通过 props 接收一个 student 对象，我们通过额外变量传递
		// 但为了代码清晰，我们将在 StudentFormDialog 中实现编辑模式，通过传入 student 对象来区分
		// 修改：StudentFormDialog 增加 student prop
		// 我们暂不在此处传递，而是在组件内部通过 watch 处理，保持主组件简洁
		// 更好的做法：主组件维护一个 currentEditStudent，通过 v-model 传递给子组件
		// 此处略，实际开发中可补充
	}

	const deleteStudent = (row : any) => {
		ElMessageBox.confirm('确定删除该学生吗？', '提示', { type: 'warning' }).then(async () => {
			try {
				const res = await deleteStudentApi({ id: row.id })
				if (res.code === 1) {
					ElMessage.success('删除成功')
					await reloadStudents()
				} else {
					ElMessage.error(res.msg || '删除失败')
				}
			} catch (error) {
				ElMessage.error('网络错误')
			}
		}).catch(() => { })
	}

	const openGroupNamingDialog = () => {
		groupNamingVisible.value = true
	}

	const openScoreOperationDialog = (row ?: any) => {
		// 如果传入了学生，可预选该学生（个人加减分），但为了简单，直接打开小组积分操作弹窗
		scoreOperationVisible.value = true
	}

	const openSeatDialog = () => {
		seatDialogVisible.value = true
	}


	const openScoreRecordDialog = () => {
		scoreRecordDialogVisible.value = true
	}

	const toggleDetailMode = () => {
		detailMode.value = !detailMode.value
	}

	// ---------- 导入导出（原函数保持不变，仅修复之前遗留的字段问题）----------
	const importExcel = () => {
		if (typeof uni !== 'undefined' && uni.chooseFile) {
			uni.chooseFile({
				count: 1,
				type: 'file',
				extension: ['xlsx', 'xls'],
				success: (res) => {
					const filePath = res.tempFiles[0]
					handleFileUpload(filePath)
				},
				fail: (error) => {
					console.error('选择文件失败:', error)
					fileInput.value.click()
				}
			})
		} else {
			fileInput.value.click()
		}
	}
	const handleFileUpload = async (filePath) => {
		const file = filePath
		if (!file) return
		const reader = new FileReader()
		reader.onload = async (e : any) => {
			const data = new Uint8Array(e.target.result)
			const workbook = XLSX.read(data, { type: 'array' })
			const sheet = workbook.Sheets[workbook.SheetNames[0]]
			const rows : any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
			if (!rows || rows.length < 2) {
				ElMessage.error('文件格式不正确')
				return
			}
			// 模糊匹配函数：在数组中查找包含目标字符串的元素，返回索引
			function fuzzyIndexOf(arr, target) {
				for (let i = 0; i < arr.length; i++) {
					if (arr[i] && arr[i].toString().trim().toLowerCase().includes(target.toLowerCase())) {
						return i;
					}
				}
				return -1;
			}
			const headers = rows[0]
			const nameIdx = fuzzyIndexOf(headers, '姓名');
			const studentNoIdx = fuzzyIndexOf(headers, '学号');
			const groupNoIdx = fuzzyIndexOf(headers, '小组编号');
			const groupNameIdx = fuzzyIndexOf(headers, '组名');
			const genderIdx = fuzzyIndexOf(headers, '性别');
			const heightIdx = fuzzyIndexOf(headers, '身高');
			const visionIdx = fuzzyIndexOf(headers, '视力');
			const rankIdx = fuzzyIndexOf(headers, '成绩排名');
			if (nameIdx === -1 || studentNoIdx === -1 || groupNoIdx === -1) {
				ElMessage.error('缺少必要列：姓名、学号、小组编号')
				return
			}
			const studentsToAdd = []
			for (let i = 1; i < rows.length; i++) {
				const row = rows[i]
				const name = row[nameIdx]?.trim()
				const studentNo = row[studentNoIdx]?.toString().trim()
				const groupNo = parseInt(row[groupNoIdx])
				const groupName = row[groupNameIdx]?.trim()
				const gender = row[genderIdx] === '男' ? '男' : (row[genderIdx] === '女' ? '女' : '未知')
				const height = row[heightIdx] ? parseInt(row[heightIdx]) : null
				const vision = row[visionIdx] ? parseInt(row[visionIdx]) : null
				const scoreRank = row[rankIdx] ? parseInt(row[rankIdx]) : null
				if (!name || !studentNo || isNaN(groupNo)) continue
				studentsToAdd.push({
					stu_school_id: currentClass.value.stu_school_id,
					student_no: studentNo,
					name: name,
					gender: gender,
					groupName: groupName,
					stu_class_id: currentClass.value.id,
					height: height,
					vision: vision,
					groupNo: groupNo,
					score_rank: scoreRank,
				})
			}
			if (studentsToAdd.length === 0) {
				ElMessage.warning('没有有效数据可导入')
				return
			}
			try {
				for (const stu of studentsToAdd) {
					await addStudent(stu)
				}
				ElMessage.success(`成功导入 ${studentsToAdd.length} 名学生`)
				await reloadStudents()
			} catch (err) {
				ElMessage.error('导入失败')
			} finally {
			}
		}
		reader.readAsArrayBuffer(file)
	}

	const exportToExcel = () => {
		const wsData = [['学号', '姓名', '性别', '组名', '小组编号', '学生身高', '视力（5.0制*10）', '成绩排名', '总积分']]
		filteredStudents.value.forEach(s => {
			wsData.push([
				s.student_no,
				s.name,
				s.gender,
				s.group_name || '',
				s.member_number ? s.member_number : null,
				s.height || 0,
				s.vision ? s.vision : null,
				s.score_rank || 0,
				s.total_points || 0,
			])
		})
		const ws = XLSX.utils.aoa_to_sheet(wsData)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, '学生信息')
		XLSX.writeFile(wb, `学生信息.xlsx`)
		ElMessage.success('导出成功')
	}

	const downloadTemplate = () => {
		const templateData = [
			['姓名', '学号', '小组编号', '组名', '性别', '学生身高', '视力（5.0制*10）', '成绩排名'],
			['张三', 'pw20150011', 1, '第一组', '男', 140, 48, 1],
			['李四', 'pw20150012', 2, '第一组', '女', 150, 49, 2],
		]
		const ws = XLSX.utils.aoa_to_sheet(templateData)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, '学生导入模板')
		XLSX.writeFile(wb, '学生导入模板.xlsx')
	}

	const handleSizeChange = (size : number) => {
		pagination.limit = size
		pagination.page = 1
		updatePageData()
	}
	const handleCurrentChange = (page : number) => {
		pagination.page = page
		updatePageData()
	}

	onMounted(async () => {
		uni.$on('storage', fetchCurrentClass)
		await fetchCurrentClass()
		await loadGroupList()
	})
	onUnmounted(() => {
		uni.$off('storage', fetchCurrentClass)
	})
</script>

<style scoped>
	.student-manage-container {
		padding: 20px;
		background: #f0f2f5;
		min-height: calc(100vh - 60px);
	}

	.filter-card {
		margin-bottom: 20px;
	}

	.filter-form {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}

	.table-card {
		overflow-x: auto;
	}

	.score-filter-bar {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 16px;
	}
</style>