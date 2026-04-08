<template>
	<div class="student-manage-container">
		<!-- 筛选栏：只保留小组筛选 -->
		<el-card class="filter-card" shadow="never">
			<el-form :inline="true" class="filter-form">
				<el-form-item label="小组" prop="stu_group_info_id" style="width: 220px;">
					<el-select v-model="filterForm.stu_group_info_id" placeholder="请选择小组" clearable
						@change="onGroupChange">
						<el-option v-for="item in groupList" :key="item.id" :label="item.name" :value="item.id" />
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

		<!-- 学生列表（保持不变） -->
		<el-card class="table-card" shadow="hover">
			<el-table :data="studentList" border stripe v-loading="loading">
				<el-table-column prop="student_no" label="学号" width="120" />
				<el-table-column prop="name" label="姓名" width="100" />
				<el-table-column prop="gender" label="性别" width="80" />
				<el-table-column prop="group_name" label="小组" width="100" />
				<el-table-column prop="group_description" label="小组花名" width="120" />
				<el-table-column prop="member_number" label="编号" width="80" align="center">
					<template #default="{ row }">{{ row.member_number ? `${row.member_number}号` : '-' }}</template>
				</el-table-column>
				<el-table-column prop="height" label="身高(cm)" width="100" />
				<el-table-column prop="vision" label="视力" width="100">
					<template #default="{ row }">{{ row.vision ? (row.vision / 10).toFixed(1) : '-' }}</template>
				</el-table-column>
				<el-table-column prop="score_rank" label="成绩排名" width="100" />
				<el-table-column prop="total_points" label="总积分" width="100" sortable />
				<el-table-column label="操作" width="150" fixed="right">
					<template #default="{ row }">
						<el-button type="primary" size="small" @click="openEditDialog(row)">编辑</el-button>
						<el-button type="danger" size="small" @click="deleteStudent(row)">删除</el-button>
					</template>
				</el-table-column>
			</el-table>
			<el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.limit"
				:total="pagination.total" layout="total, sizes, prev, pager, next" @size-change="handleSizeChange"
				@current-change="handleCurrentChange" />
		</el-card>

		<!-- 新增/编辑弹窗（保持不变） -->
		<el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
			<el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
				<el-form-item label="学号" prop="student_no">
					<el-input v-model="form.student_no" placeholder="请输入学号" />
				</el-form-item>
				<el-form-item label="姓名" prop="name">
					<el-input v-model="form.name" placeholder="请输入姓名" />
				</el-form-item>
				<el-form-item label="性别" prop="gender">
					<el-radio-group v-model="form.gender">
						<el-radio label="男">男</el-radio>
						<el-radio label="女">女</el-radio>
						<el-radio label="未知">未知</el-radio>
					</el-radio-group>
				</el-form-item>
				<el-form-item label="小组" prop="stu_group_id">
					<el-select v-model="form.stu_group_info_id" placeholder="请选择小组" clearable>
						<el-option v-for="item in groupList" :key="item.id" :label="item.name" :value="item.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="组内编号" prop="member_number">
					<el-select v-model="form.member_number" placeholder="请选择编号" clearable
						:disabled="!form.stu_group_info_id">
						<el-option v-for="num in availableNumbers" :key="num" :label="`${num}号`" :value="num" />
					</el-select>
				</el-form-item>
				<el-form-item label="身高(cm)" prop="height">
					<el-input-number v-model="form.height" :min="0" :max="250" placeholder="身高(cm)" />
				</el-form-item>
				<el-form-item label="视力" prop="vision">
					<el-input-number v-model="form.vision" :min="0" :max="55" placeholder="如4.8填48" />
					<span class="form-tip">（5.0制×10，如4.8→48）</span>
				</el-form-item>
				<el-form-item label="成绩排名" prop="score_rank">
					<el-input-number v-model="form.score_rank" :min="1" placeholder="班级内排名" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="dialogVisible = false">取消</el-button>
				<el-button type="primary" :loading="submitLoading" @click="submitForm">确定</el-button>
			</template>
		</el-dialog>

		<!-- 小组命名弹窗 -->
		<el-dialog v-model="groupNamingVisible" title="小组花名设置" width="600px">
			<el-form label-width="160px">
				<div v-for="group in groupEditList" :key="group.id" class="group-naming-item">
					<el-form-item :label="`${group.name}（编号${group.code}）`">
						<el-input v-model="group.description" placeholder="请输入小组花名（如：星辰组）" clearable />
					</el-form-item>
				</div>
			</el-form>
			<template #footer>
				<el-button @click="groupNamingVisible = false">取消</el-button>
				<el-button type="primary" :loading="groupNamingLoading" @click="submitGroupNaming">保存</el-button>
			</template>
		</el-dialog>

		<!-- 排座位弹窗（添加导出座位表按钮） -->
		<el-dialog v-model="seatDialogVisible" title="排座位" width="90%" top="5vh" :close-on-click-modal="false"
			class="seat-dialog">
			<div class="seat-layout">
				<div class="seat-grid">
					<div v-for="(row, rIdx) in seatMatrix" :key="rIdx" class="seat-row">
						<div v-for="(seat, cIdx) in row" :key="cIdx" class="seat-cell"
							:class="{ occupied: seat.student }" @dragover.prevent
							@drop="handleDrop($event, rIdx, cIdx)">
							<div v-if="seat.student" class="student-info" draggable="true"
								@dragstart="handleDragStart($event, seat.student)">
								{{ seat.student.name }}
							</div>
							<div v-else class="empty-seat">空</div>
						</div>
					</div>
				</div>
				<div class="unassigned-list">
					<h4>待安排学生</h4>
					<div v-for="stu in unassignedStudents" :key="stu.id" class="unassigned-item" draggable="true"
						@dragstart="handleDragStart($event, stu)">
						{{ stu.name }} ({{ stu.gender }})
					</div>
					<el-empty v-if="unassignedStudents.length === 0" description="所有学生已安排" />
				</div>
			</div>
			<div class="seat-actions">
				<el-button type="primary" @click="autoArrangeSeats">一键排座（权重算法）</el-button>
				<el-button @click="resetSeats">重置座位</el-button>
				<el-button type="success" @click="exportSeatTable">导出座位表</el-button>
				<el-button @click="saveSeats">保存座位安排</el-button>
			</div>
		</el-dialog>

		<!-- 隐藏文件上传 -->
		<input type="file" ref="fileInput" style="display:none" accept=".xlsx,.xls" @change="handleFileUpload" />
	</div>
</template>

<script setup lang="ts">
	import { ref, reactive, onMounted, computed } from 'vue'
	import { ElMessage, ElMessageBox } from 'element-plus'
	import * as XLSX from 'xlsx'
	import {
		getGroupList,
		getStudentList,
		addStudent,
		updateStudent,
		getClasses,
		deleteStudent as deleteStudentApi,
		updateGroup,        // 新增：更新小组接口（需后端实现）
	} from '@/api/request'

	// ---------- 全局变量 ----------
	const currentClass = ref<any>(null)
	const groupList = ref<any[]>([])
	const allStudents = ref<any[]>([])
	const filteredStudents = ref<any[]>([])
	const studentList = ref<any[]>([])
	const loading = ref(false)
	const pagination = reactive({ page: 1, limit: 10, total: 0 })
	const filterForm = reactive({ stu_group_info_id: null })
	const originalStudents = ref<any[]>([])

	// 弹窗相关
	const dialogVisible = ref(false)
	const dialogTitle = ref('新增学生')
	const formRef = ref(null)
	const submitLoading = ref(false)
	const form = reactive({
		id: null,
		student_no: '',
		name: '',
		gender: '未知',
		stu_group_info_id: null,
		member_number: null,
		height: null,
		vision: null,
		score_rank: null,
	})

	// 小组命名弹窗相关
	const groupNamingVisible = ref(false)
	const groupNamingLoading = ref(false)
	const groupEditList = ref<any[]>([])   // 用于编辑的小组列表副本

	// 排座位相关
	const seatDialogVisible = ref(false)
	const seatMatrix = ref<any[][]>([])
	const unassignedStudents = ref<any[]>([])
	let draggingStudent : any = null

	// 计算可用编号
	const availableNumbers = computed(() => {
		if (!form.stu_group_info_id) return []
		const occupied = allStudents.value.filter(s => s.stu_group_info_id === form.stu_group_info_id).map(s => s.member_number).filter(n => n)
		return [1, 2, 3, 4, 5, 6, 7].filter(n => !occupied.includes(n))
	})

	// ---------- 初始化 ----------
	const fetchCurrentClass = async () => {
		try {
			const res = await getClasses()
			if (res.code === 1) {
				currentClass.value = res.data
				const groupRes = await getGroupList({ class_id: currentClass.value[0].id })
				if (groupRes.code === 1) groupList.value = groupRes.data
				await fetchAllStudents()
			} else {
				ElMessage.error('获取班级信息失败')
			}
		} catch (error) {
			console.error(error)
		}
	}

	const fetchAllStudents = async () => {
		if (!currentClass.value) return
		loading.value = true
		try {
			const params = { class_id: currentClass.value[0].id, limit: 9999 }
			const res = await getStudentList(params)
			if (res.code === 1) {
				originalStudents.value = res.data.list
				applyFilter()
			} else {
				ElMessage.error(res.msg || '获取学生列表失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		} finally {
			loading.value = false
		}
	}

	const applyFilter = () => {
		let filtered = [...originalStudents.value]
		if (filterForm.stu_group_info_id) {
			filtered = filtered.filter(s => {
				const groupId = s.stu_group_id ?? s.group_id ?? s.stu_group_info_id
				return groupId === filterForm.stu_group_info_id
			})
		}
		filteredStudents.value = filtered
		pagination.total = filtered.length
		pagination.page = 1
		updatePageData()
	}

	const onGroupChange = () => {
		pagination.page = 1
		applyFilter()
	}

	const updatePageData = () => {
		const start = (pagination.page - 1) * pagination.limit
		const end = start + pagination.limit
		studentList.value = filteredStudents.value.slice(start, end)
	}

	const reloadStudents = async () => {
		await fetchAllStudents()
	}

	// ---------- 新增/编辑 ----------
	const openAddDialog = () => {
		dialogTitle.value = '新增学生'
		Object.assign(form, {
			id: null,
			student_no: '',
			name: '',
			gender: '未知',
			stu_group_id: null,
			stu_group_info_id: null,
			member_number: null,
			height: null,
			vision: null,
			score_rank: null,
		})
		dialogVisible.value = true
	}

	const openEditDialog = (row : any) => {
		dialogTitle.value = '编辑学生'
		Object.assign(form, row)
		dialogVisible.value = true
	}

	const submitForm = async () => {
		if (!formRef.value) return
		await formRef.value.validate()
		submitLoading.value = true
		try {
			let res
			const payload = { ...form, stu_class_id: currentClass.value[0].id }
			if (form.id) {
				res = await updateStudent(payload)
			} else {
				res = await addStudent(payload)
			}
			
			if (res.code === 1) {
				ElMessage.success('操作成功')
				dialogVisible.value = false
				await reloadStudents()
			} else {
				ElMessage.error(res.msg || '操作失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		} finally {
			submitLoading.value = false
		}
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

	// ---------- 小组命名功能 ----------
	const openGroupNamingDialog = () => {
		// 复制当前小组列表用于编辑，保留原有 description
		groupEditList.value = groupList.value.map(g => ({
			id: g.id,
			name: g.name,
			code:g.code,
			sort_order: g.sort_order,
			description: g.description || '',
		}))
		groupNamingVisible.value = true
	}

	const submitGroupNaming = async () => {
		groupNamingLoading.value = true
		try {
			const updatePromises = groupEditList.value.map(group => {
				// 只更新修改了 description 的小组（可选）
				const originalGroup = groupList.value.find(g => g.id === group.id)
				if (originalGroup && originalGroup.description === group.description) {
					return Promise.resolve(null) // 未变化，跳过
				}
				return updateGroup({ id: group.id, description: group.description })
			})
			const results = await Promise.allSettled(updatePromises)
			const succeeded = results.filter(r => r.status === 'fulfilled' && r.value !== null && r.value?.code === 1).length
			const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value !== null && r.value?.code !== 1)).length
			if (succeeded > 0) {
				ElMessage.success(`成功更新 ${succeeded} 个小组的花名${failed > 0 ? `，失败 ${failed} 个` : ''}`)
				// 刷新小组列表
				const groupRes = await getGroupList({ class_id: currentClass.value[0].id })
				if (groupRes.code === 1) groupList.value = groupRes.data
				await reloadStudents()  // 刷新学生列表中的小组花名显示
				groupNamingVisible.value = false
			} else if (failed > 0) {
				ElMessage.error('更新失败，请检查网络或接口')
			} else {
				ElMessage.info('未检测到任何修改')
				groupNamingVisible.value = false
			}
		} catch (error) {
			console.error(error)
			ElMessage.error('操作失败')
		} finally {
			groupNamingLoading.value = false
		}
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
					stu_school_id: currentClass.value[0].stu_school_id,
					student_no: studentNo,
					name: name,
					gender: gender,
					groupName: groupName,
					stu_class_id: currentClass.value[0].id,
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

	// ---------- 排座位功能（新增导出座位表）----------
	const openSeatDialog = async () => {
		const allStudentsRes = await getStudentList({ class_id: currentClass.value[0].id, limit: 9999 })
		if (allStudentsRes.code !== 1) {
			ElMessage.error('获取学生列表失败')
			return
		}
		const allStudentsData = allStudentsRes.data.list
		seatMatrix.value = Array(8).fill(null).map(() => Array(8).fill(null).map(() => ({ student: null })))
		unassignedStudents.value = [...allStudentsData]
		seatDialogVisible.value = true
	}

	const handleDragStart = (event : DragEvent, student : any) => {
		draggingStudent = student
		event.dataTransfer!.setData('text/plain', student.id)
	}

	const handleDrop = (event : DragEvent, row : number, col : number) => {
		event.preventDefault()
		if (!draggingStudent) return
		const targetSeat = seatMatrix.value[row][col]
		if (targetSeat.student) {
			unassignedStudents.value.push(targetSeat.student)
			targetSeat.student = draggingStudent
			const idx = unassignedStudents.value.findIndex(s => s.id === draggingStudent.id)
			if (idx !== -1) unassignedStudents.value.splice(idx, 1)
		} else {
			targetSeat.student = draggingStudent
			const idx = unassignedStudents.value.findIndex(s => s.id === draggingStudent.id)
			if (idx !== -1) unassignedStudents.value.splice(idx, 1)
		}
		draggingStudent = null
	}

	const resetSeats = () => {
		const allStudentsTemp = []
		for (let i = 0; i < 8; i++) {
			for (let j = 0; j < 8; j++) {
				if (seatMatrix.value[i][j].student) {
					allStudentsTemp.push(seatMatrix.value[i][j].student)
					seatMatrix.value[i][j].student = null
				}
			}
		}
		unassignedStudents.value = allStudentsTemp
	}

	const autoArrangeSeats = () => {
		let allStudentsTemp = [...unassignedStudents.value]
		for (let i = 0; i < 8; i++) {
			for (let j = 0; j < 8; j++) {
				if (seatMatrix.value[i][j].student) {
					allStudentsTemp.push(seatMatrix.value[i][j].student)
				}
			}
		}
		const unique = new Map()
		allStudentsTemp.forEach(s => unique.set(s.id, s))
		allStudentsTemp = Array.from(unique.values())

		const scored = allStudentsTemp.map(s => {
			let score = 0
			score += (200 - (s.height || 150)) * 0.1
			score += (s.vision || 40) * 0.5
			score -= (s.score_rank || 100) * 0.2
			if (s.gender === '女') score += 10
			return { student: s, score }
		})
		scored.sort((a, b) => b.score - a.score)

		let idx = 0
		for (let i = 0; i < 8; i++) {
			for (let j = 0; j < 8; j++) {
				if (idx < scored.length) {
					seatMatrix.value[i][j].student = scored[idx].student
					idx++
				} else {
					seatMatrix.value[i][j].student = null
				}
			}
		}
		unassignedStudents.value = []
		ElMessage.success('排座完成')
	}

	// 导出座位表为 Excel
	const exportSeatTable = () => {
		// 构建一个 8x8 的二维数组，每个单元格显示学生姓名或“空”
		const seatData : string[][] = []
		for (let i = 0; i < 8; i++) {
			const row : string[] = []
			for (let j = 0; j < 8; j++) {
				const student = seatMatrix.value[i][j].student
				row.push(student ? student.name : '空')
			}
			seatData.push(row)
		}
		// 添加行号列和列号行（可选）
		const exportSheet = seatData.map((row, idx) => [`第${idx + 1}排`, ...row])
		exportSheet.unshift(['座位排', '列1', '列2', '列3', '列4', '列5', '列6', '列7', '列8'])
		const ws = XLSX.utils.aoa_to_sheet(exportSheet)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, '座位表')
		XLSX.writeFile(wb, `座位表_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`)
		ElMessage.success('座位表已导出')
	}

	const saveSeats = () => {
		ElMessage.info('保存功能暂未实现，座位安排仅用于展示')
	}

	// ---------- 分页 ----------
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
		await fetchCurrentClass()
	})
</script>

<style scoped>
	/* 原有样式保持不变 */
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

	.form-tip {
		font-size: 12px;
		color: #909399;
		margin-left: 8px;
	}

	.seat-dialog :deep(.el-dialog__body) {
		padding: 20px;
		max-height: 70vh;
		overflow-y: auto;
	}

	.seat-layout {
		display: flex;
		gap: 30px;
		justify-content: space-between;
	}

	.seat-grid {
		flex: 2;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.seat-row {
		display: flex;
		gap: 8px;
	}

	.seat-cell {
		width: 70px;
		height: 70px;
		border: 1px solid #dcdfe6;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #fafafa;
		transition: 0.2s;
	}

	.seat-cell.occupied {
		background: #e6f7ff;
		border-color: #409eff;
	}

	.student-info {
		cursor: grab;
		text-align: center;
		font-size: 12px;
		padding: 4px;
	}

	.empty-seat {
		color: #c0c4cc;
		font-size: 12px;
	}

	.unassigned-list {
		flex: 1;
		border-left: 1px solid #e4e7ed;
		padding-left: 20px;
		max-height: 500px;
		overflow-y: auto;
	}

	.unassigned-list h4 {
		margin: 0 0 12px 0;
	}

	.unassigned-item {
		padding: 8px;
		margin-bottom: 8px;
		background: #f5f7fa;
		border-radius: 4px;
		cursor: grab;
		transition: 0.2s;
	}

	.unassigned-item:hover {
		background: #ecf5ff;
	}

	.seat-actions {
		margin-top: 20px;
		text-align: center;
	}

	/* 小组命名弹窗样式 */
	.group-naming-item {
		margin-bottom: 16px;
	}
</style>