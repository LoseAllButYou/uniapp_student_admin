<template>
	<div class="app-container">
		<el-card class="header-card" shadow="never">
			<div class="header-content">
				<div class="actions">
					<el-button type="primary" plain @click="exportToExcel" icon="Upload">导出Excel</el-button>
					<el-button type="info" plain @click="refreshData" icon="RefreshRight">刷新数据</el-button>
				</div>
			</div>
			<div class="filter-bar">
				<el-select v-model="selectedGrade" placeholder="选择年级" style="width: 140px; margin-right: 12px"
					@change="onGradeOrSemesterChange">
					<el-option v-for="grade in gradeOptions" :key="grade" :label="grade" :value="grade" />
				</el-select>
				<el-select v-model="selectedSemester" placeholder="选择学期" style="width: 120px; margin-right: 12px"
					@change="onGradeOrSemesterChange">
					<el-option label="上学期" :value="1" />
					<el-option label="下学期" :value="2" />
				</el-select>
				<el-select v-model="selectedWeek" placeholder="选择周次" style="width: 120px; margin-right: 12px"
					:disabled="!selectedGrade || !selectedSemester" @change="onWeekSelect">
					<el-option v-for="w in availableWeeks" :key="w" :label="`第${w}周`" :value="w" />
				</el-select>
				<el-alert :title="infoMsg" type="warning" :closable="true" show-icon style="margin-left: auto;" />
				<el-alert v-if="loadError" :title="errorMsg" type="error" :closable="true" @close="loadError = false"
					show-icon style="margin-left: auto;" />
			</div>
		</el-card>

		<el-card class="table-card" shadow="hover" v-loading="loading">
			<div class="table-title">
				<h2>{{ schoolInfo }} {{ classInfo.name }} {{ selectedGrade }} {{ semesterText }}
					第{{ currentWeek }}周 积分汇总表</h2>
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
						<span :class="{ 'total-score': row.isSummary }">{{ row.groupTotal || '' }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="avgScore" label="平均分" width="90" align="center">
					<template #default="{ row }">{{ row.avgScore || '' }}</template>
				</el-table-column>
				<el-table-column prop="rank" label="排名" width="80" align="center">
					<template #default="{ row }">
						<el-tag v-if="row.rank" :type="getRankType(row.rank)" size="small">{{ row.rank }}</el-tag>
					</template>
				</el-table-column>
			</el-table>
		</el-card>
	</div>
</template>

<script setup lang="ts">
	import { ref, onMounted, computed } from 'vue'
	import { ElMessage } from 'element-plus'
	import * as XLSX from 'xlsx'
	import { getGroupsScores, getClassWeeksByGradeSemester, getClasses } from '@/api/request'

	// 筛选条件s
	const selectedGrade = ref('')
	const selectedSemester = ref<number | null>(null)
	const selectedWeek = ref(0)
	const availableWeeks = ref<number[]>([])
	const gradeOptions = ref<string[]>(['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'])

	// 其他状态
	const schoolInfo = ref('')
	const classInfo = ref<any>(null)
	const currentWeek = ref(0)
	const loading = ref(false)
	const loadError = ref(false)
	const errorMsg = ref('')
	const tableData = ref<any[]>([])
	const groupsStore = ref<any[]>([]) // 存储原始小组数据

	const infoMsg = "数据来源学生积分表，如需修改积分请到学生管理页面操作"
	const semesterText = computed(() => selectedSemester.value === 1 ? '上学期' : '下学期')
	const weekdaysOrder = ['周一', '周二', '周三', '周四', '周五']

	// 获取班级信息并初始化默认筛选条件
	const initClassInfo = async () => {
		const storedClass = uni.getStorageSync('currentClass')
		if (storedClass) {
			classInfo.value = storedClass
		} else {
			const classRes = await getClass()
			if (classRes.code !== 1) throw new Error('获取班级信息失败')
			classInfo.value = classRes.data
			uni.setStorageSync('currentClass', classInfo.value)
		}
		// 设置默认年级（使用班级的年级）
		selectedGrade.value = classInfo.value.grade || gradeOptions.value[0]
		// 默认学期：根据当前月份判断（9-2月为上学期，3-8月为下学期）
		const month = new Date().getMonth() + 1
		selectedSemester.value = month >= 3 && month <= 8 ? 2 : 1
	}

	// 年级或学期变化时，加载周次列表
	const onGradeOrSemesterChange = async () => {
		if (!selectedGrade.value || !selectedSemester.value || !classInfo.value?.id) return
		loading.value = true
		try {
			const res = await getClassWeeksByGradeSemester(classInfo.value.id, selectedGrade.value, selectedSemester.value)
			if (res.code === 1) {
				availableWeeks.value = res.data
				if (availableWeeks.value.length) {
					selectedWeek.value = Math.max(...availableWeeks.value) // 默认最新周
					currentWeek.value = selectedWeek.value
					await loadGroupScores()
				} else {
					availableWeeks.value = []
					selectedWeek.value = 0
					tableData.value = []
					ElMessage.warning('当前学期暂无周次数据')
				}
			}
		} catch (error) {
			console.error('加载周次失败', error)
			ElMessage.error('加载周次列表失败')
		} finally {
			loading.value = false
		}
	}

	// 周次切换
	const onWeekSelect = async () => {
		if (!selectedWeek.value) return
		currentWeek.value = selectedWeek.value
		await loadGroupScores()
	}

	// 从后端加载小组积分数据
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
			// 后端返回格式：{ groups: [{ id, name, days: [{ day, scores: [score1..score7] }], summary: { totals } }] }
			groupsStore.value = res.data.groups.map((group : any) => normalizeGroupData(group))
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

	// 标准化小组数据（确保每天都有7个分数）
	const normalizeGroupData = (group : any) => {
		const normalizedDays = weekdaysOrder.map(weekday => {
			const existing = group.days.find((d : any) => d.day === weekday)
			const scores = Array(7).fill(null)
			if (existing && Array.isArray(existing.scores)) {
				for (let i = 0; i < Math.min(existing.scores.length, 7); i++) {
					scores[i] = existing.scores[i] ?? null
				}
			}
			return { day: weekday, scores }
		})
		group.days = normalizedDays
		// 重新计算小组合计（如果后端没返回或需要前端计算）
		const totals = Array(7).fill(0)
		normalizedDays.forEach(day => {
			for (let i = 0; i < 7; i++) {
				if (day.scores[i] !== null) totals[i] += day.scores[i]
			}
		})
		group.summary = { totals: totals.map(t => t === 0 && !hasAnyScore(normalizedDays, i) ? null : t) }
		return group
	}

	const hasAnyScore = (days : any[], memberIdx : number) => {
		return days.some(day => day.scores[memberIdx] !== null && day.scores[memberIdx] !== 0)
	}

	// 计算小组总分和平均分
	const calculateGroupScores = (group : any) => {
		const totals = group.summary.totals
		const validTotals = totals.filter((t : number | null) => t !== null && t !== undefined)
		const groupTotal = validTotals.reduce((sum : number, val : number) => sum + val, 0)
		const memberCount = validTotals.length
		const avgScore = memberCount > 0 ? (groupTotal / memberCount).toFixed(2) : '0.00'
		return { groupTotal, avgScore, memberCount }
	}

	// 构建表格显示数据
	const buildTableFromGroups = () => {
		const groupScores = groupsStore.value.map(group => {
			const { groupTotal, avgScore } = calculateGroupScores(group)
			return { groupName: group.name, groupTotal, avgScore }
		})
		groupScores.sort((a, b) => b.groupTotal - a.groupTotal)
		const rankMap = new Map()
		groupScores.forEach((item, idx) => rankMap.set(item.groupName, idx + 1))

		const data : any[] = []
		groupsStore.value.forEach(group => {
			group.days.forEach((dayData : any, idx : number) => {
				const row : any = {
					groupName: group.name,
					day: dayData.day,
					isSummary: false,
					groupId: group.name
				}
				for (let i = 1; i <= 7; i++) {
					row[`member${i}`] = dayData.scores[i - 1] ?? ''
				}
				if (idx === 0) {
					const { groupTotal, avgScore } = groupScores.find(g => g.groupName === group.name)!
					row.groupTotal = groupTotal
					row.avgScore = avgScore
					row.rank = rankMap.get(group.name) || ''
				} else {
					row.groupTotal = ''
					row.avgScore = ''
					row.rank = ''
				}
				data.push(row)
			})
			// 添加合计行
			const summaryRow : any = {
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
				summaryRow[`member${i}`] = val !== null ? val : ''
			}
			data.push(summaryRow)
		})
		tableData.value = data
	}

	// 合并单元格逻辑
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

	const refreshData = () => {
		loadGroupScores()
	}

	// 导出Excel（保持原有功能，适配新数据结构）
	const exportToExcel = () => {
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
		// 合并标题行
		ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }]
		ws['!cols'] = [{ wch: 12 }, { wch: 8 }, ...Array(7).fill({ wch: 8 }), { wch: 10 }, { wch: 8 }, { wch: 6 }]
		XLSX.utils.book_append_sheet(wb, ws, `第${currentWeek.value}周积分表`)
		XLSX.writeFile(wb, `${classInfo.value.name}_${selectedGrade.value}_${semesterText.value}_第${currentWeek.value}周积分表.xlsx`)
		ElMessage.success('导出成功')
	}

	onMounted(async () => {
		uni.getStorage({
			key: 'teacherInfo',
			success(res) {
				schoolInfo.value = res.data.school
			}
		})
		await initClassInfo()
		await onGradeOrSemesterChange()
	})
</script>

<style scoped>
	/* 保持原有样式不变，可根据需要微调 */
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
	}

	.actions {
		display: flex;
		gap: 8px;
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
	}
</style>