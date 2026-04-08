<template>
	<div class="app-container">
		<el-card class="header-card" shadow="never">
			<div class="header-content">
				<div class="actions">
					<el-button type="primary" plain @click="exportToExcel" icon="Upload" :disabled="!tableData.length">
						导出Excel
					</el-button>
					<el-button type="success" plain @click="handleAddNewWeek" icon="Plus" :disabled="!hasWeeksData"
						:loading="addingWeek">
						新建周次
					</el-button>
					<el-button type="info" plain @click="refreshData" icon="RefreshRight" :loading="loading">
						刷新数据
					</el-button>
				</div>
			</div>
			<div class="filter-bar">
				<el-select v-model="selectedGrade" placeholder="选择年级" style="width: 140px"
					@change="onGradeOrSemesterChange" :loading="gradeLoading" :disabled="!hasWeeksData">
					<el-option v-for="grade in gradeOptions" :key="grade" :label="grade" :value="grade" />
				</el-select>
				<el-select v-model="selectedSemester" placeholder="选择学期" style="width: 120px"
					@change="onGradeOrSemesterChange" :disabled="!hasWeeksData">
					<el-option label="上学期" :value="1" />
					<el-option label="下学期" :value="2" />
				</el-select>
				<el-select v-model="selectedWeek" placeholder="选择周次" style="width: 120px" :disabled="!hasWeeksData"
					@change="onWeekSelect">
					<el-option v-for="w in availableWeeks" :key="w" :label="`第${w}周`" :value="w" />
				</el-select>
				<el-alert v-if="!hasWeeksData" title="暂无周次数据，请前往个人信息管理界面新建班级信息" type="warning" :closable="true"
					show-icon />
				<el-alert :title="infoMsg" type="warning" :closable="true" show-icon style="margin-left: auto;" />
				<el-alert v-if="loadError" :title="errorMsg" type="error" :closable="true" @close="loadError = false"
					show-icon style="margin-left: auto;" />
			</div>
		</el-card>

		<el-card class="table-card" shadow="hover" v-loading="loading">
			<div class="table-title">
				<h2>{{ titleText }}</h2>
			</div>
			<el-table :data="tableData" border stripe style="width: 100%" :span-method="spanMethod"
				:header-cell-style="{ background: '#f5f7fa', color: '#1e293b', fontWeight: 'bold' }">
				<el-table-column prop="groupName" label="组别" width="100" fixed="left" />
				<el-table-column prop="day" label="时间" width="80" />
				<el-table-column v-for="n in 7" :key="n" :prop="`member${n}`" :label="`${n}号组员`" width="85"
					align="center">
					<template #default="{ row }">
						<span :class="{ 'total-score': row.isSummary }">
							{{ row[`member${n}`] !== null && row[`member${n}`] !== undefined ? row[`member${n}`] : '' }}
						</span>
					</template>
				</el-table-column>
				<el-table-column prop="groupTotal" label="小组总分" width="100" align="center">
					<template #default="{ row }">
						<span :class="{ 'total-score': row.isSummary }">{{ row.groupTotal ?? '' }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="avgScore" label="平均分" width="90" align="center">
					<template #default="{ row }">{{ row.avgScore ?? '' }}</template>
				</el-table-column>
				<el-table-column prop="rank" label="排名" width="80" align="center">
					<template #default="{ row }">
						<el-tag v-if="row.rank" :type="getRankType(row.rank)" size="small">{{ row.rank }}</el-tag>
					</template>
				</el-table-column>
			</el-table>
			<div v-if="!tableData.length && !loading" class="empty-placeholder">
				<el-empty description="暂无积分数据，请先到学生管理页面为本周添加积分" />
			</div>
		</el-card>
	</div>
</template>

<script setup lang="ts">
	import { ref, onMounted, computed } from 'vue'
	import { ElMessage, ElMessageBox } from 'element-plus'
	import * as XLSX from 'xlsx'
	import { getGroupsScores, getClassWeeks, getClasses, addNewWeek } from '@/api/request'

	// ---------- 类型定义 ----------
	interface ScoreRow {
		groupName : string
		day : string
		isSummary : boolean
		groupId : string | number
		member1 ?: number | string
		member2 ?: number | string
		member3 ?: number | string
		member4 ?: number | string
		member5 ?: number | string
		member6 ?: number | string
		member7 ?: number | string
		groupTotal ?: number | string
		avgScore ?: number | string
		rank ?: number | string
	}

	interface GroupData {
		id : number
		name : string
		days : Array<{ day : string; scores : (number | null)[] }>
		summary : { totals : (number | null)[] }
	}

	// ---------- 响应式数据 ----------
	const schoolInfo = ref('')
	const classInfo = ref<any>(null)

	// 筛选条件
	const selectedGrade = ref('')
	const selectedSemester = ref<number | null>(null)
	const selectedWeek = ref(0)
	const availableWeeks = ref<number[]>([])
	const gradeOptions = ref<string[]>([])
	const gradeLoading = ref(false)

	// 表格数据
	const tableData = ref<ScoreRow[]>([])
	const groupsStore = ref<GroupData[]>([])
	const loading = ref(false)
	const loadError = ref(false)
	const errorMsg = ref('')
	const addingWeek = ref(false) // 新建周次加载状态

	const infoMsg = "数据来源学生积分表，如需修改积分请到学生管理页面操作"
	const weekdaysOrder = ['周一', '周二', '周三', '周四', '周五']

	// 年级排序优先级（数值越小年级越低）
	const gradeOrder : Record<string, number> = {
		'一年级': 1, '二年级': 2, '三年级': 3, '四年级': 4, '五年级': 5, '六年级': 6,
		'初一': 7, '初二': 8, '初三': 9,
		'高一': 10, '高二': 11, '高三': 12
	}

	// ---------- 计算属性 ----------
	const semesterText = computed(() => selectedSemester.value === 1 ? '上学期' : '下学期')
	const titleText = computed(() => {
		if (!classInfo.value) return '积分汇总表'
		return `${schoolInfo.value} ${classInfo.value.name} ${selectedGrade.value} ${semesterText.value} 第${currentWeek.value}周 积分汇总表`
	})
	const currentWeek = computed(() => selectedWeek.value)
	const hasWeeksData = computed(() => availableWeeks.value.length > 0)

	// ---------- 辅助函数 ----------
	const hasAnyScore = (days : GroupData['days'], memberIdx : number) : boolean => {
		return days.some(day => day.scores[memberIdx] !== null && day.scores[memberIdx] !== 0)
	}

	// 标准化小组数据
	const normalizeGroupData = (group : GroupData) : GroupData => {
		const normalizedDays = weekdaysOrder.map(weekday => {
			const existing = group.days.find(d => d.day === weekday)
			const scores = Array(7).fill(null) as (number | null)[]
			if (existing && Array.isArray(existing.scores)) {
				for (let i = 0; i < Math.min(existing.scores.length, 7); i++) {
					scores[i] = existing.scores[i] ?? null
				}
			}
			return { day: weekday, scores }
		})

		// 重新计算小组合计
		const totals = Array(7).fill(0) as (number | null)[]
		normalizedDays.forEach(day => {
			for (let i = 0; i < 7; i++) {
				if (day.scores[i] !== null) {
					totals[i] = (totals[i] || 0) + day.scores[i]!
				}
			}
		})
		// 将没有有效分数的成员设为 null
		for (let i = 0; i < 7; i++) {
			if (totals[i] === 0 && !hasAnyScore(normalizedDays, i)) {
				totals[i] = null
			}
		}

		return {
			...group,
			days: normalizedDays,
			summary: { totals }
		}
	}

	// 计算小组总分和平均分
	const calculateGroupScores = (group : GroupData) => {
		const totals = group.summary.totals
		const validTotals = totals.filter(t => t !== null && t !== undefined) as number[]
		const groupTotal = validTotals.reduce((sum, val) => sum + val, 0)
		const memberCount = validTotals.length
		const avgScore = memberCount > 0 ? (groupTotal / memberCount).toFixed(2) : '0.00'
		return { groupTotal, avgScore }
	}

	// 构建表格显示数据
	const buildTableFromGroups = () => {
		if (!groupsStore.value.length) {
			tableData.value = []
			return
		}

		// 计算每个小组的总分和平均分用于排名
		const groupStats = groupsStore.value.map(group => {
			const { groupTotal, avgScore } = calculateGroupScores(group)
			return { groupName: group.name, groupTotal, avgScore }
		})
		groupStats.sort((a, b) => b.groupTotal - a.groupTotal)
		const rankMap = new Map<string, number>()
		groupStats.forEach((item, idx) => rankMap.set(item.groupName, idx + 1))

		const data : ScoreRow[] = []
		groupsStore.value.forEach(group => {
			// 每天的数据行
			group.days.forEach((dayData, idx) => {
				const row : ScoreRow = {
					groupName: group.name,
					day: dayData.day,
					isSummary: false,
					groupId: group.name
				}
				for (let i = 1; i <= 7; i++) {
					const val = dayData.scores[i - 1]
					row[`member${i}` as keyof ScoreRow] = val !== null ? val : ''
				}
				// 只在第一行显示小组总分、平均分、排名
				if (idx === 0) {
					const stats = groupStats.find(g => g.groupName === group.name)!
					row.groupTotal = stats.groupTotal
					row.avgScore = stats.avgScore
					row.rank = rankMap.get(group.name) || ''
				} else {
					row.groupTotal = ''
					row.avgScore = ''
					row.rank = ''
				}
				data.push(row)
			})

			// 合计行
			const summaryRow : ScoreRow = {
				groupName: group.name,
				day: '合计',
				isSummary: true,
				groupId: group.name,
				groupTotal: '',
				avgScore: '',
				rank: ''
			}
			for (let i = 1; i <= 7; i++) {
				const val = group.summary.totals[i - 1]
				summaryRow[`member${i}` as keyof ScoreRow] = val !== null ? val : ''
			}
			data.push(summaryRow)
		})
		tableData.value = data
	}

	// ---------- 数据加载 ----------
	// 获取班级信息
	const initClassInfo = async () => {
		const classes = await uni.getStorageSync('teacherInfo').classes
		const currentClassId = await uni.getStorageSync('currentClassId')
		if (classes.length && currentClassId) {
			classInfo.value = classes.filter(item => item.id == currentClassId)[0];
		}
		else {
			ElMessage.warning('请先选择班级')
			throw new Error('未找到班级信息')
		}
	}

	// 获取年级选项（从教师所教班级中提取年级，去重并按等级排序）
	const loadGradeOptions = async () => {
		if (!classInfo.value?.id) return
		gradeLoading.value = true
		try {
			const res = await getClasses()
			if (res.code === 1 && Array.isArray(res.data)) {
				// 提取所有年级，去重，并按 gradeOrder 排序
				const grades = [...new Set(res.data.map((cls : any) => cls.grade).filter(Boolean))] as string[]
				grades.sort((a, b) => (gradeOrder[a] || 99) - (gradeOrder[b] || 99))
				gradeOptions.value = grades
				if (gradeOptions.value.length) {
					// 默认选中最高年级（排序后的最后一个）
					selectedGrade.value = gradeOptions.value[gradeOptions.value.length - 1]
				} else {
					// 降级使用默认列表
					gradeOptions.value = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']
					selectedGrade.value = gradeOptions.value[gradeOptions.value.length - 1]
				}
			} else {
				gradeOptions.value = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']
				selectedGrade.value = gradeOptions.value[gradeOptions.value.length - 1]
			}
		} catch (error) {
			console.error('获取年级列表失败', error)
			gradeOptions.value = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']
			selectedGrade.value = gradeOptions.value[gradeOptions.value.length - 1]
		} finally {
			gradeLoading.value = false
		}
	}

	// 加载周次列表
	const loadWeeks = async () => {
		if (!classInfo.value?.id || !selectedGrade.value || !selectedSemester.value) return
		loading.value = true
		try {
			const res = await getClassWeeks(classInfo.value.id)
			if (res.code === 1) {
				availableWeeks.value = (res.data as number[]).sort((a, b) => a - b)
				if (availableWeeks.value.length) {
					selectedWeek.value = Math.max(...availableWeeks.value) // 最新周
					await loadGroupScores()
				} else {
					selectedWeek.value = 0
					tableData.value = []
					// 无周次数据时不清空 groupsStore，但禁用选择器
				}
			} else {
				throw new Error(res.msg || '获取周次失败')
			}
		} catch (error : any) {
			console.error('加载周次失败', error)
			ElMessage.error(error.message || '加载周次列表失败')
			availableWeeks.value = []
			selectedWeek.value = 0
			tableData.value = []
		} finally {
			loading.value = false
		}
	}

	// 加载小组积分数据
	const loadGroupScores = async () => {
		if (!classInfo.value?.id || !selectedGrade.value || !selectedSemester.value || !selectedWeek.value) return
		loading.value = true
		loadError.value = false
		try {
			const res = await getGroupsScores({
				classId: classInfo.value.id,
				grade: selectedGrade.value,
				semester: selectedSemester.value,
				week: selectedWeek.value
			})
			if (res.code !== 1) throw new Error(res.msg || '获取数据失败')
			if (!res.data.groups || !res.data.groups.length) {
				tableData.value = []
				groupsStore.value = []
				ElMessage.info('当前无小组数据，请先创建小组并添加学生')
				return
			}
			groupsStore.value = res.data.groups.map((group : GroupData) => normalizeGroupData(group))
			buildTableFromGroups()
		} catch (error : any) {
			console.error('加载小组积分失败', error)
			loadError.value = true
			errorMsg.value = error.message || '数据加载失败'
			tableData.value = []
		} finally {
			loading.value = false
		}
	}

	// ---------- 新建周次 ----------
	const handleAddNewWeek = async () => {
		if (!hasWeeksData.value) {
			ElMessage.warning('暂无周次数据，无法新建，请前往个人信息管理界面新建班级信息')
			return
		}
		if (!groupsStore.value.length) {
			ElMessage.warning('当前没有小组数据，无法新建周次')
			return
		}
		try {
			await ElMessageBox.confirm('新建周次将基于当前周的小组结构创建下一周数据（所有成员分数初始化为0），是否继续？', '提示', {
				confirmButtonText: '确认',
				cancelButtonText: '取消',
				type: 'info'
			})
		} catch {
			return
		}

		addingWeek.value = true
		try {
			const maxWeek = Math.max(...availableWeeks.value)
			const newWeek = maxWeek + 1

			// 为每个小组构建新一周的数据（复制当前周的 days 结构，分数置0）
			const promises = groupsStore.value.map(async (group) => {
				// 构建新的 days 数组：每个 day 的 scores 中，非 null 的改为 0，null 保持不变
				const newDays = group.days.map(day => ({
					day: day.day,
					scores: day.scores.map(score => (score !== null ? 0 : null))
				}))
				const weeklyJson = {
					days: newDays,
					summary: { totals: Array(7).fill(0) } // 初始合计为0
				}
				return addNewWeek(classInfo.value.id, newWeek, group.name, weeklyJson)
			})

			const results = await Promise.all(promises)
			const failed = results.some(res => res.code !== 1)
			if (failed) {
				throw new Error('部分小组新建周次失败')
			}

			ElMessage.success(`成功创建第 ${newWeek} 周`)
			// 刷新周次列表
			await loadWeeks()
			// 自动切换到新周次
			if (availableWeeks.value.includes(newWeek)) {
				selectedWeek.value = newWeek
				await loadGroupScores()
			}
		} catch (error : any) {
			console.error('新建周次失败', error)
			ElMessage.error(error.message || '新建周次失败，请稍后重试')
		} finally {
			addingWeek.value = false
		}
	}

	// ---------- 事件处理 ----------
	const onGradeOrSemesterChange = async () => {
		if (!selectedGrade.value || !selectedSemester.value) return
		await loadWeeks()
	}

	const onWeekSelect = async () => {
		if (selectedWeek.value) {
			await loadGroupScores()
		}
	}

	const refreshData = () => {
		if (selectedWeek.value) {
			loadGroupScores()
		} else {
			loadWeeks()
		}
	}

	// 导出Excel
	const exportToExcel = () => {
		if (!tableData.value.length) {
			ElMessage.warning('暂无数据可导出')
			return
		}
		const exportData : any[][] = []
		const title = `${schoolInfo.value}${classInfo.value.name} ${selectedGrade.value}${semesterText.value} 第${currentWeek.value}周积分汇总表`
		exportData.push([title, '', '', '', '', '', '', '', '', '', '', ''])
		exportData.push(['组别', '时间', '1号组员', '2号组员', '3号组员', '4号组员', '5号组员', '6号组员', '7号组员', '小组总分', '平均分', '排名'])

		tableData.value.forEach(row => {
			const line = [
				row.groupName,
				row.day,
				row.member1 ?? '', row.member2 ?? '', row.member3 ?? '', row.member4 ?? '',
				row.member5 ?? '', row.member6 ?? '', row.member7 ?? '',
				row.groupTotal ?? '', row.avgScore ?? '', row.rank ?? ''
			]
			exportData.push(line)
		})

		const wb = XLSX.utils.book_new()
		const ws = XLSX.utils.aoa_to_sheet(exportData)
		ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }]
		ws['!cols'] = [{ wch: 12 }, { wch: 8 }, ...Array(7).fill({ wch: 8 }), { wch: 10 }, { wch: 8 }, { wch: 6 }]
		XLSX.utils.book_append_sheet(wb, ws, `第${currentWeek.value}周积分表`)
		const fileName = `${classInfo.value.name}_${selectedGrade.value}_${semesterText.value}_第${currentWeek.value}周积分表.xlsx`
		XLSX.writeFile(wb, fileName)
		ElMessage.success('导出成功')
	}

	// 合并单元格
	const spanMethod = ({ row, column, rowIndex, columnIndex } : any) => {
		if (columnIndex === 0) {
			const groupRows = tableData.value.filter(r => r.groupId === row.groupId)
			const firstIndex = tableData.value.findIndex(r => r.groupId === row.groupId)
			if (firstIndex === rowIndex) return { rowspan: groupRows.length, colspan: 1 }
			return { rowspan: 0, colspan: 0 }
		}
		if (columnIndex >= 9 && columnIndex <= 11) {
			const groupRows = tableData.value.filter(r => r.groupId === row.groupId)
			const firstRow = groupRows[0]
			const firstIndex = tableData.value.findIndex(r => r.groupId === row.groupId && r.day === firstRow.day)
			if (firstIndex === rowIndex) return { rowspan: groupRows.length, colspan: 1 }
			return { rowspan: 0, colspan: 0 }
		}
		return { rowspan: 1, colspan: 1 }
	}

	const getRankType = (rank : number) => {
		if (rank === 1) return 'danger'
		if (rank === 2) return 'warning'
		if (rank === 3) return 'success'
		return 'info'
	}

	// ---------- 生命周期 ----------
	onMounted(async () => {
		uni.getStorage({
			key: 'teacherInfo',
			success(res) {
				schoolInfo.value = res.data.school || ''
			},
			fail() {
				schoolInfo.value = ''
			}
		})
		try {
			await initClassInfo()
			// 设置默认学期（根据月份）
			const month = new Date().getMonth() + 1
			selectedSemester.value = month >= 3 && month <= 8 ? 2 : 1
			await loadGradeOptions()
			if (selectedGrade.value && selectedSemester.value) {
				await loadWeeks()
			}
		} catch (error) {
			console.error('初始化失败', error)
			ElMessage.error('页面初始化失败，请刷新重试')
		}
	})
</script>

<style scoped>
	.app-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 20px;
	}

	.header-card {
		margin-bottom: 24px;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		flex-wrap: wrap;
		gap: 12px;
	}

	.actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.filter-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		padding-top: 8px;
		border-top: 1px solid #eef2f6;
	}

	.table-card {
		overflow-x: auto;
	}

	.total-score {
		font-weight: bold;
		color: #e6a23c;
	}

	.table-title {
		text-align: center;
		margin-bottom: 20px;
	}

	.table-title h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1e293b;
	}

	.empty-placeholder {
		margin-top: 20px;
	}

	/* 响应式调整 */
	@media (max-width: 768px) {
		.app-container {
			padding: 12px;
		}

		.filter-bar {
			justify-content: flex-start;
		}

		.actions {
			width: 100%;
			justify-content: flex-end;
		}
	}
</style>