<template>
	<div class="student-manage-container">


		<!-- 原有筛选栏（小组筛选） -->
		<el-card class="filter-card" shadow="never">
			<el-form :inline="true" class="filter-form">
				<el-form-item label="小组筛选" prop="stu_group_info_id">
					<el-select v-model="filterForm.stu_group_info_id" placeholder="请选择小组" clearable
						@change="onGroupChange" style="width: 220px;">
						<el-option v-for="item in groupList" :key="item.id" :label="item.name+item.description"
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
		<!-- 新增：年级/学期/周次筛选栏 -->
		<el-card class="filter-card" shadow="never">
			<div class="score-filter-bar">
				<!-- 				<el-select v-model="selectedGrade" placeholder="选择年级" style="width: 140px"
					@change="onGradeOrSemesterChange">
					<el-option v-for="grade in gradeOptions" :key="grade" :label="grade+'年级'" :value="grade" />
				</el-select>
				<el-select v-model="selectedSemester" placeholder="选择学期" style="width: 120px"
					@change="onGradeOrSemesterChange">
					<el-option label="上学期" :value="1" />
					<el-option label="下学期" :value="2" />
				</el-select> -->
				<el-button type="primary" plain @click="openScoreDialog" :disabled="!selectedWeek">积分操作</el-button>
				<el-button type="primary" plain
					@click="complateInfo=!complateInfo">{{!complateInfo?'详细信息':'简要信息'}}</el-button>
			</div>
		</el-card>
		<!-- 学生列表（保持不变，但确保 group_id 字段正确） -->
		<el-card class="table-card" shadow="hover">
			<el-table :data="studentList" border stripe v-loading="loading">
				<el-table-column prop="student_no" label="学号" width="120" v-if="complateInfo" />
				<el-table-column prop="name" label="姓名" width="100" />
				<el-table-column prop="gender" label="性别" width="80" />
				<el-table-column prop="group_name" label="小组" width="100" />
				<el-table-column prop="group_description" label="小组花名" width="120" />
				<el-table-column prop="member_number" label="编号" width="80" align="center">
					<template #default="{ row }">{{ row.member_number ? `${row.member_number}号` : '-' }}</template>
				</el-table-column>
				<el-table-column prop="height" label="身高(cm)" width="100" v-if="complateInfo" />
				<el-table-column prop="vision" label="视力" width="100" v-if="complateInfo">
					<template #default="{ row }">{{ row.vision ? (row.vision / 10).toFixed(1) : '-' }}</template>
				</el-table-column>
				<el-table-column prop="score_rank" label="成绩排名" width="100" v-if="complateInfo" />
				<el-table-column prop="current_points" label="剩余积分" width="100" sortable />
				<el-table-column prop="total_points" label="累计积分" width="100" sortable />
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
						<el-option v-for="item in groupList" :key="item.id" :label="item.name+item.description"
							:value="item.id" />
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

		<!-- 积分操作弹窗（大尺寸） -->
		<el-dialog v-model="scoreDialogVisible" title="积分操作" width="80%" top="5vh" :close-on-click-modal="false"
			class="score-dialog">
			<div class="score-dialog-header">
				<el-form-item label="选择周次">
					<el-select v-model="selectedWeek" placeholder="选择周次" style="width: 120px"
						:disabled="!selectedGrade || !selectedSemester" @change="onWeekChange">
						<el-option v-for="w in availableWeeks" :key="w" :label="`第${w}周`" :value="w" />
					</el-select>
				</el-form-item>
				<el-form inline>
					<el-form-item label="选择星期">
						<el-select v-model="scoreDayOfWeek" placeholder="请选择星期" style="width: 120px">
							<el-option label="周一" :value="1" />
							<el-option label="周二" :value="2" />
							<el-option label="周三" :value="3" />
							<el-option label="周四" :value="4" />
							<el-option label="周五" :value="5" />
						</el-select>
						<el-button size="small" @click="setTodayWeek">今天</el-button>
					</el-form-item>
					<el-form-item>
						<el-alert title="提示：小组整体加减分将影响该小组所有成员（仅对存在的成员生效）" type="info" :closable="false" show-icon />
					</el-form-item>
				</el-form>
			</div>
			<div class="groups-score-container" v-loading="scoreGroupLoading">
				<el-collapse v-model="activeGroupCollapse">
					<el-collapse-item v-for="group in groupMembersList" :key="group.id" :name="group.id">
						<template #title>
							<div class="group-title">
								<span>{{ group.name }} ({{ group.members.length }}人)</span>
								<div class="group-batch-buttons" @click.stop>
									<el-select v-model="batchReasonId" placeholder="选择加减分" size="small"
										style="width: 160px">
										<el-option v-for="item in reasonOptions" :key="item.id"
											:label="`${item.score}分：${item.reason}`" :value="item.id" />
									</el-select>
									<el-button type="primary" size="small"
										@click="submitBatchAdjust(group)">提交</el-button>
								</div>
							</div>
						</template>
						<el-table :data="group.members" border size="small">
							<el-table-column prop="member_number" label="编号" width="80" />
							<el-table-column prop="name" label="姓名" width="100" />
							<el-table-column label="当前周积分" width="100">
								<template #default="{ row }">{{ getStudentWeekScore(row) }}</template>
							</el-table-column>
							<el-table-column label="操作" width="200">
								<template #default="{ row }">
									<el-button type="primary" size="small"
										@click="openStudentScoreAdjust(row)">加减分</el-button>
								</template>
							</el-table-column>
						</el-table>
					</el-collapse-item>
				</el-collapse>
			</div>
			<template #footer>
				<el-button @click="scoreDialogVisible = false">关闭</el-button>
			</template>
		</el-dialog>

		<!-- 个人加减分子弹窗 -->
		<el-dialog v-model="personalScoreDialogVisible" title="个人加减分" width="500px">
			<el-form :model="personalScoreForm" label-width="100px">
				<el-form-item label="学生姓名">
					<span>{{ personalScoreForm.studentName }}</span>
				</el-form-item>
				<el-form-item label="选择星期">
					<el-select v-model="personalScoreDayOfWeek" placeholder="请选择星期" style="width: 120px">
						<el-option label="周一" :value="1" />
						<el-option label="周二" :value="2" />
						<el-option label="周三" :value="3" />
						<el-option label="周四" :value="4" />
						<el-option label="周五" :value="5" />
					</el-select>
					<el-button size="small" @click="setPersonalTodayWeek">今天</el-button>
				</el-form-item>
				<el-form-item label="加减分原因">
					<el-select v-model="personalReasonId" placeholder="请选择加减分项" clearable style="width: 100%">
						<el-option v-for="item in reasonOptions" :key="item.id" :label="`${item.score}分：${item.reason}`"
							:value="item.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="备注（可选）">
					<el-input v-model="personalScoreForm.reason" placeholder="可补充说明" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="personalScoreDialogVisible = false">取消</el-button>
				<el-button type="primary" :loading="personalScoreSubmitting" @click="submitPersonalScore">确定</el-button>
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
	import { ref, reactive, onMounted, computed, onUnmounted } from 'vue'
	import { ElMessage, ElMessageBox } from 'element-plus'
	import * as XLSX from 'xlsx'
	import {

		getGroupList, getStudentList, addStudent, updateStudent, getClasses, deleteStudent as deleteStudentApi, updateGroup,
		getGroupsScores, addStudentScore, batchAddStudentScore, getScoreReasons

	} from '@/api/request'

	// ========== 年级/学期/周次相关 ==========
	const selectedGrade = ref('')
	const selectedSemester = ref<number | null>(null)
	const selectedWeek = ref(0)
	const availableWeeks = ref<number[]>([])
	const gradeOptions = ref<string[]>([])
	const gradeLoading = ref(false)

	// 新增：生成 1~22 周
	const generateWeeks = () => {
		return Array.from({ length: 22 }, (_, i) => i + 1)
	}
	// 积分操作弹窗相关
	const scoreDialogVisible = ref(false)
	const scoreDayOfWeek = ref(1)  // 默认周一
	const groupMembersList = ref<any[]>([])   // { id, name, members: [] }
	const activeGroupCollapse = ref<number[]>([])
	const scoreGroupLoading = ref(false)
	// 积分原因配置列表
	const reasonOptions = ref<any[]>([])
	const batchReasonId = ref<number | null>(null)
	// 个人加减分子弹窗
	const personalScoreDialogVisible = ref(false)
	// 个人加减分弹窗使用的星期（独立于小组的星期，避免冲突）
	const personalScoreDayOfWeek = ref(1)
	// 个人加减分选中的原因ID
	const personalReasonId = ref<number | null>(null)
	const personalScoreForm = reactive({
		studentId: null,
		studentName: '',
		score: 0,
		reason: ''
	})
	const personalScoreSubmitting = ref(false)
	const scoreValues = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

	// 其他原有状态...
	const complateInfo = ref(false)
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
			const classes = await uni.getStorageSync('teacherInfo').classes
			const currentClassId = await uni.getStorageSync('currentClassId')

			if (classes.length && currentClassId) {
				currentClass.value = classes.filter(item => item.id == currentClassId)[0];
			}
			else {
				currentClass.value = {}
			}
			console.log(currentClass.value)
			// 获取年级选项（从班级信息中提取，实际可从班级的 grade 字段取）
			gradeOptions.value = [currentClass.value.grade]
			selectedGrade.value = currentClass.value.grade
			// 学期默认当前月份判断
			const month = new Date().getMonth() + 1
			selectedSemester.value = month >= 3 && month <= 8 ? 2 : 1
			// 加载周次（前端生成）
			loadWeeks()
			await loadGroupList()
			await fetchAllStudents()
		} catch (error) {
			console.error(error)
		}
	}

	// 根据学期和当前日期计算默认周次
	const calculateDefaultWeek = (semester : number) : number => {
		const now = new Date()
		let startDate : Date
		if (semester === 2) {
			// 下学期：起始 9月1日
			startDate = new Date(now.getFullYear(), 2, 1) // 月份 0-index，3月 => 2
			// 如果当前日期早于 3月1日，则使用去年的 3月1日（实际上学期已结束，但为了显示，取去年）
			if (now < startDate) {
				startDate = new Date(now.getFullYear() - 1, 2, 1)
			}
		} else {
			// 上学期：起始 3月1日
			startDate = new Date(now.getFullYear(), 8, 1)
			if (now < startDate) {
				startDate = new Date(now.getFullYear() - 1, 8, 1)
			}
		}
		const diffDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
		let week = Math.ceil(diffDays / 7)
		if (week < 1) week = 1
		if (week > 22) week = 22
		return week
	}

	// 重新加载周次（改为前端生成）
	const loadWeeks = () => {
		availableWeeks.value = generateWeeks()
		if (selectedSemester.value !== null) {
			selectedWeek.value = calculateDefaultWeek(selectedSemester.value)
		} else {
			selectedWeek.value = 1
		}
	}

	// 年级或学期变化时的处理（不再请求后端，直接重新生成周次并计算默认周）
	const onGradeOrSemesterChange = () => {
		if (!selectedGrade.value || selectedSemester.value === null) return
		loadWeeks()
		// 可选：如果需要刷新学生列表的积分显示（因为周次变了），可以调用 fetchAllStudents 或其他刷新逻辑
	}

	// 周次切换（直接使用前端周次）
	const onWeekChange = () => {
		// 周次变化时，可刷新学生列表的当前周积分显示（可选）
	}


	const loadGroupList = async () => {
		console.log(currentClass)
		if (!currentClass.value) return
		const res = await getGroupList({ class_id: currentClass.value.id })
		if (res.code === 1) {
			groupList.value = res.data
			uni.setStorage({
				key: 'group',
				data: groupList.value,
				success: function () {
					console.log('success');
				}
			})
		}
	}

	// 获取小组及成员列表（用于积分弹窗）
	const loadGroupMembers = async () => {
		if (!currentClass.value) return
		scoreGroupLoading.value = true
		try {
			const groups = groupList.value
			const membersMap : Record<number, any[]> = {}
			// 获取所有学生并按小组分组

			originalStudents.value.forEach((stu : any) => {
				const gid = stu.stu_group_info_id
				if (gid) {
					if (!membersMap[gid]) membersMap[gid] = []
					membersMap[gid].push(stu)
				}
			})

			groupMembersList.value = groups.map((g : any) => ({
				id: g.id,
				name: g.name,
				members: (membersMap[g.id] || []).sort((a, b) => (a.member_number || 0) - (b.member_number || 0))
			})).filter(g => g.members.length > 0)
			// 默认展开所有小组
			activeGroupCollapse.value = groupMembersList.value.map(g => g.id)
		} catch (error) {
			ElMessage.error('加载小组成员失败')
		} finally {
			scoreGroupLoading.value = false
		}
	}

	// 获取学生本周当前总积分（用于弹窗显示）
	const getStudentWeekScore = (student : any) => {
		// 可调用 getGroupsScores 获取，这里简化，实际可另行请求
		return student.total_points || 0
	}

	// 打开积分操作弹窗
	const openScoreDialog = async () => {
		if (!selectedWeek.value) {
			ElMessage.warning('请先选择年级、学期和周次')
			return
		}
		await loadGroupMembers()
		// 加载积分原因列表
		await fetchScoreReasons()
		// 设置默认星期为今天（周一=1，周日=7，将周日映射为7，但我们只支持1-5，若周末则设为周一）
		const today = new Date().getDay() // 0周日 ~ 6周六
		let defaultDay = today === 0 ? 7 : today
		if (defaultDay > 5) defaultDay = 1 // 周末默认周一
		scoreDayOfWeek.value = defaultDay
		scoreDialogVisible.value = true
	}

	const setTodayWeek = () => {
		const today = new Date().getDay()
		let day = today === 0 ? 7 : today
		if (day > 5) day = 1
		scoreDayOfWeek.value = day
		ElMessage.success(`已设为周${['一', '二', '三', '四', '五'][day - 1]}`)
	}

	// 获取积分原因配置
	const fetchScoreReasons = async () => {
		try {
			// 调用 FastAdmin 接口（请根据实际路由调整）
			const res = await getScoreReasons()  // 需要在 @/api/request 中定义
			if (res.code === 1) {
				reasonOptions.value = res.data
			} else {
				console.warn('获取积分原因失败', res.msg)
			}
		} catch (error) {
			console.error(error)
		}
	}


	// 提交小组整体加减分（新版）
	const submitBatchAdjust = async (group : any) => {
		if (!batchReasonId.value) {
			ElMessage.warning('请先选择加减分项')
			return
		}
		if (!scoreDayOfWeek.value) {
			ElMessage.warning('请选择星期')
			return
		}

		const selectedReason = reasonOptions.value.find(r => r.id === batchReasonId.value)
		if (!selectedReason) return

		const delta = selectedReason.score
		const reasonText = selectedReason.reason
		const members = group.members
		if (members.length === 0) {
			ElMessage.warning('该小组暂无成员')
			return
		}

		// 确认操作（可选）
		try {
			await ElMessageBox.confirm(
				`确定为小组【${group.name}】所有成员 ${delta > 0 ? '+' : ''}${delta} 分，原因：${reasonText}？`,
				'确认操作',
				{ type: 'warning' }
			)
		} catch {
			return
		}

		const records = members.map((stu : any) => ({
			studentId: stu.id,
			classId: currentClass.value.id,
			grade: selectedGrade.value,
			semester: selectedSemester.value,
			week: selectedWeek.value,
			dayOfWeek: scoreDayOfWeek.value,
			score: delta,
			reason: reasonText
		}))

		try {
			const res = await batchAddStudentScore({ records })
			if (res.code === 1) {
				ElMessage.success(`已为小组 ${group.name} 所有成员 ${delta > 0 ? '+' : ''}${delta} 分`)
				await fetchAllStudents()
				loadGroupMembers()
				// 清空当前选中的原因，防止重复提交
				batchReasonId.value = null
			} else {
				ElMessage.error(res.msg || '操作失败')
			}
		} catch (error) {
			console.error(error)
			ElMessage.error('提交失败')
		}
	}

	// 打开个人加减分子弹窗
	const openStudentScoreAdjust = (student : any) => {
		personalScoreForm.studentId = student.id
		personalScoreForm.studentName = student.name
		personalScoreForm.reason = ''   // 额外备注清空
		personalReasonId.value = null   // 清空选中的原因

		// 设置默认星期为今天（周一~周五，周末默认周一）
		const today = new Date().getDay()
		let defaultDay = today === 0 ? 7 : today
		if (defaultDay > 5) defaultDay = 1
		personalScoreDayOfWeek.value = defaultDay

		personalScoreDialogVisible.value = true
	}

	// 提交个人加减分
	const submitPersonalScore = async () => {
		// 校验是否选择了原因
		if (!personalReasonId.value) {
			ElMessage.warning('请选择加减分原因')
			return
		}
		// 校验星期
		if (!personalScoreDayOfWeek.value) {
			ElMessage.warning('请选择星期')
			return
		}

		const selectedReason = reasonOptions.value.find(r => r.id === personalReasonId.value)
		if (!selectedReason) {
			ElMessage.error('无效的加减分项')
			return
		}

		const delta = selectedReason.score
		const reasonText = selectedReason.reason
		// 如果用户额外填写了备注，可以拼接或覆盖（这里将备注附加到原因后面）
		const finalReason = personalScoreForm.reason
			? `${reasonText}（${personalScoreForm.reason}）`
			: reasonText

		personalScoreSubmitting.value = true
		try {
			const res = await addStudentScore({
				studentId: personalScoreForm.studentId,
				classId: currentClass.value.id,
				grade: selectedGrade.value,
				semester: selectedSemester.value,
				week: selectedWeek.value,
				dayOfWeek: personalScoreDayOfWeek.value,   // 使用个人弹窗的星期
				score: delta,
				reason: finalReason
			})
			if (res.code === 1) {
				ElMessage.success(`已为 ${personalScoreForm.studentName} ${delta > 0 ? '+' : ''}${delta} 分，原因：${reasonText}`)
				personalScoreDialogVisible.value = false
				await fetchAllStudents()  // 刷新列表
				loadGroupMembers()
			} else {
				ElMessage.error(res.msg || '操作失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		} finally {
			personalScoreSubmitting.value = false
		}
	}

	const setPersonalTodayWeek = () => {
		const today = new Date().getDay()
		let day = today === 0 ? 7 : today
		if (day > 5) day = 1
		personalScoreDayOfWeek.value = day
		ElMessage.success(`已设为周${['一', '二', '三', '四', '五'][day - 1]}`)
	}

	// 修复小组筛选：确保学生数据中包含 stu_group_id
	const fetchAllStudents = async () => {
		if (!currentClass.value) return
		loading.value = true
		try {
			const params = { class_id: currentClass.value.id, limit: 9999 }
			const res = await getStudentList(params)
			if (res.code === 1) {
				// 确保每条学生记录都有 stu_group_id 字段（后端返回）
				originalStudents.value = res.data.list.map((s : any) => ({
					...s,
					stu_group_info_id: s.stu_group_info_id ?? s.stu_group_info_id ?? null
				}))
				uni.setStorage({
					key: 'student',
					data: res.data,
					success: function () {
						console.log('success');
					}
				})
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
			filtered = filtered.filter(s => s.stu_group_info_id === filterForm.stu_group_info_id)
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

	// 其他原有方法（新增、编辑、删除、导入导出、排座位等）保持不变...
	// 注意：需要将原有的 reloadStudents 改为 fetchAllStudents 等，此处省略重复代码

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
			const payload = { ...form, stu_class_id: currentClass.value.id, stu_school_id: currentClass.value.stu_school_id }
			console.log(payload)
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
		console.log(groupList.value)
		groupEditList.value = groupList.value.map(g => ({
			id: g.id,
			name: g.name,
			code: g.code,
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
				const groupRes = await getGroupList({ class_id: currentClass.value.id })
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

	// ---------- 排座位功能（新增导出座位表）----------
	const openSeatDialog = async () => {
		const allStudentsData = originalStudents.value
		if (allStudentsData.length == 0) {
			console.log(allStudentsData)
			const allStudentsRes = await getStudentList({ class_id: currentClass.value.id, limit: 9999 })
			if (allStudentsRes.code !== 1) {
				ElMessage.error('获取学生列表失败')
				return
			}
			allStudentsData.value = allStudentsRes.data
		}


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
		uni.$on('storage', fetchCurrentClass)
		await fetchCurrentClass()
	})
	onUnmounted(async () => {
		uni.$off('storage', fetchCurrentClass)
	})
</script>

<style scoped>
	/* 原有样式保持不变，新增样式 */
	.score-filter-bar {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 16px;
	}

	.score-dialog :deep(.el-dialog__body) {
		padding: 20px;
		max-height: 70vh;
		overflow-y: auto;
	}

	.groups-score-container {
		margin-top: 20px;
	}

	.group-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding-right: 20px;
	}

	.group-batch-buttons {
		display: flex;
		gap: 8px;
	}

	.score-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

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