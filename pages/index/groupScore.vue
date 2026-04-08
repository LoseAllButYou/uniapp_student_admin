<template>
	<div class="app-container">
		<el-card class="header-card" shadow="never">
			<div class="header-content">
				<div class="actions">
					<el-button type="primary" plain @click="exportToExcel" icon="Upload">导出Excel</el-button>
					<el-button type="info" plain @click="refreshData" icon="RefreshRight">刷新数据</el-button>
				</div>
			</div>
			<div class="week-bar">
				<el-select v-model="selectedSemester" placeholder="选择学期" style="width: 120px; margin-right: 12px;"
					@change="onSemesterChange">
					<el-option label="上学期" :value="1" />
					<el-option label="下学期" :value="2" />
				</el-select>
				<el-select v-model="selectedWeek" placeholder="选择周次" style="width: 120px" :disabled="!selectedSemester"
					@change="onWeekSelect">
					<el-option v-for="w in availableWeeks" :key="w" :label="`第${w}周`" :value="w" />
				</el-select>
				<el-alert v-if="loadError" :title="errorMsg" type="error" :closable="true" @close="loadError = false"
					show-icon style="margin-left: auto;" />
			</div>
		</el-card>
		<el-card class="table-card" shadow="hover" v-loading="loading">
			<div class="table-title">
				<h2>{{ schoolInfo }}{{ className }} 第{{ selectedWeek }}周积分汇总表</h2>
			</div>
			<el-table :data="tableData" border stripe style="width: 100%" :span-method="spanMethod"
				:header-cell-style="{ background: '#f5f7fa', color: '#1e293b', fontWeight: 'bold' }">
				<el-table-column prop="groupName" label="组别" width="100" fixed="left">
					<template #default="{ row, $index }">
						<div class="group-name-cell" @click.stop="handleGroupClick(row.groupName, $index)">
							{{ row.groupName }}
						</div>
					</template>
				</el-table-column>
				<el-table-column prop="day" label="时间" width="80" />
				<el-table-column prop="member1" label="1号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member1 !== null && row.member1 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 1)">{{ row.member1 }}</span>
						<span v-else-if="row.member1 === null" class="null-score">x</span>
						<span v-else class="null-score">-</span>
					</template>
				</el-table-column>
				<el-table-column prop="member2" label="2号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member2 !== null && row.member2 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 2)">{{ row.member2 }}</span>
						<span v-else-if="row.member2 === null" class="null-score">x</span>
						<span v-else class="null-score">-</span>
					</template>
				</el-table-column>
				<el-table-column prop="member3" label="3号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member3 !== null && row.member3 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 3)">{{ row.member3 }}</span>
						<span v-else-if="row.member3 === null" class="null-score">x</span>
						<span v-else class="null-score">-</span>
					</template>
				</el-table-column>
				<el-table-column prop="member4" label="4号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member4 !== null && row.member4 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 4)">{{ row.member4 }}</span>
						<span v-else-if="row.member4 === null" class="null-score">x</span>
						<span v-else class="null-score">-</span>
					</template>
				</el-table-column>
				<el-table-column prop="member5" label="5号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member5 !== null && row.member5 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 5)">{{ row.member5 }}</span>
						<span v-else-if="row.member5 === null" class="null-score">x</span>
						<span v-else class="null-score">-</span>
					</template>
				</el-table-column>
				<el-table-column prop="member6" label="6号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member6 !== null && row.member6 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 6)">{{ row.member6 }}</span>
						<span v-else-if="row.member6 === null" class="null-score">x</span>
						<span v-else class="null-score">-</span>
					</template>
				</el-table-column>
				<el-table-column prop="member7" label="7号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member7 !== null && row.member7 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 7)">{{ row.member7 }}</span>
						<span v-else-if="row.member7 === null" class="null-score">x</span>
						<span v-else class="null-score">-</span>
					</template>
				</el-table-column>
				<el-table-column prop="groupTotal" label="小组总分" width="100" align="center">
					<template #default="{ row }">
						<span v-if="row.isSummary" :class="{ 'total-score': row.isSummary }">{{ row.groupTotal }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="avgScore" label="平均分" width="90" align="center">
					<template #default="{ row }">
						<span v-if="row.isSummary">{{ row.avgScore }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="rank" label="排名" width="80" align="center">
					<template #default="{ row }">
						<el-tag v-if="row.isSummary && row.rank" :type="getRankType(row.rank)"
							size="small">{{ row.rank }}</el-tag>
					</template>
				</el-table-column>
			</el-table>
		</el-card>

		<!-- 个人加减分弹窗 -->
		<el-dialog v-model="personalDialog.visible" title="修改个人分数" width="400px">
			<div class="score-buttons">
				<el-button v-for="val in scoreValues" :key="val"
					:type="val === 0 ? 'info' : (val > 0 ? 'success' : 'danger')" size="small"
					@click="confirmPersonalChange(val)">
					{{ val > 0 ? '+' : '' }}{{ val }}
				</el-button>
			</div>
		</el-dialog>

		<!-- 小组批量加减分弹窗 -->
		<el-dialog v-model="groupDialog.visible" title="小组批量加减分" width="400px">
			<div class="score-buttons">
				<el-button v-for="val in scoreValues" :key="val"
					:type="val === 0 ? 'info' : (val > 0 ? 'success' : 'danger')" size="small"
					@click="confirmGroupChange(val)">
					{{ val > 0 ? '+' : '' }}{{ val }}
				</el-button>
			</div>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
	import { ref, reactive, onMounted, computed, onUnmounted } from 'vue'
	import { ElMessage, ElMessageBox } from 'element-plus'
	import * as XLSX from 'xlsx'
	import { getGroupList, getStudentList, getClasses, addStudentScore, batchAddStudentScore, getAllClassScores } from '@/api/request'

	// ---------- 学校/班级信息 ----------
	const schoolInfo = ref('')
	const className = ref('')
	const classId = ref<number | null>(null)
	const classGrade = ref<number | null>(null)

	// ---------- 筛选条件 ----------
	const selectedSemester = ref<number | null>(null)   // 1上学期 2下学期
	const selectedWeek = ref<number | null>(null)
	const availableWeeks = ref<number[]>([])            // 当前学期可选的周次

	// ---------- 状态 ----------
	const loading = ref(false)
	const loadError = ref(false)
	const errorMsg = ref('')

	// ---------- 原始数据 ----------
	const groupsData = ref<any[]>([])           // 小组列表
	const studentsData = ref<any[]>([])         // 学生列表
	// 核心缓存：weekScoresCache[week][`${studentId}_${dayOfWeek}`] = 该学生该天该周的总积分
	const weekScoresCache = ref<Map<number, Map<string, number>>>(new Map())
	// 所有存在的周次（全局）
	const allWeeksSet = ref<Set<number>>(new Set())

	// ---------- 表格展示数据 ----------
	const tableData = ref<any[]>([])

	// ---------- 常量 ----------
	const weekdays = ['周一', '周二', '周三', '周四', '周五']
	const dayOfWeekMap : Record<string, number> = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5 }
	const scoreValues = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

	// ---------- 弹窗状态 ----------
	const personalDialog = ref({ visible: false, row: null, memberNumber: null, currentScore: null, studentId: null, dayOfWeek: null })
	const groupDialog = ref({ visible: false, groupName: null, targetDay: null })

	// ---------- 辅助函数：根据周次判断所属学期 ----------
	const getSemesterByWeek = (week : number) : number => {
		// 上学期 1-22 周，下学期 23-44 周（可根据实际教学周调整）
		return week <= 22 ? 1 : 2
	}

	// ---------- 获取当前班级信息（从 storage + 降级接口） ----------
	const fetchCurrentClass = async () => {
		try {
			const teacherInfo = uni.getStorageSync('teacherInfo')
			const classes = teacherInfo?.classes || []
			const currentClassId = uni.getStorageSync('currentClassId')
			if (classes.length && currentClassId) {
				const cls = classes.find((c : any) => c.id == currentClassId)
				if (cls) {
					classId.value = cls.id
					className.value = cls.name
					classGrade.value = cls.grade || 1
					schoolInfo.value = teacherInfo.school || ''
					return
				}
			}
			// 降级：从接口获取
			const classRes = await getClasses()
			if (classRes.code === 1 && classRes.data.length) {
				const cls = classRes.data[0]
				classId.value = cls.id
				className.value = cls.name
				classGrade.value = cls.grade || 1
				const teacherRes = uni.getStorageSync('teacherInfo')
				schoolInfo.value = teacherRes.school || ''
			} else {
				throw new Error('未找到班级信息')
			}
		} catch (error) {
			console.error('获取班级信息失败', error)
			ElMessage.error('获取班级信息失败，请重新登录')
		}
	}

	// ---------- 获取小组列表 ----------
	// 替换原有的 fetchGroups 函数
	const fetchGroups = async () => {
	  if (!classId.value) return []
	  const res = await getGroupList({ class_id: classId.value })
	  if (res.code === 1) {
	    // 按小组名称中的数字从小到大排序
	    const groups = res.data
	    groups.sort((a: any, b: any) => {
	      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0')
	      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0')
	      return numA - numB
	    })
	    groupsData.value = groups
	    return groupsData.value
	  }
	  return []
	}

	// ---------- 获取学生列表 ----------
	const fetchStudents = async () => {
		if (!classId.value) return []
		const res = await getStudentList({ class_id: classId.value, limit: 9999 })
		if (res.code === 1) {
			studentsData.value = res.data.list
			return studentsData.value
		}
		return []
	}

	// ---------- 一次性获取该班级所有积分记录并构建缓存 ----------
	const fetchAllScoresAndBuildCache = async () => {
		console.log(1111)
		if (!classId.value) return
		console.log(1111)
		try {
			// 调用新接口：获取该班级所有积分记录（不分周次）
			// 假设返回格式：{ code:1, data: [{ studentId, week, dayOfWeek, score }] }
			const res = await getAllClassScores({ classId: classId.value })
			if (res.code !== 1) {
				console.warn('获取积分记录失败', res.msg)
				return
			}
			const records = res.data || []
			// 清空旧缓存
			weekScoresCache.value.clear()
			allWeeksSet.value.clear()

			// 遍历记录，按周次聚合
			for (const rec of records) {
				const week = rec.week
				const studentId = rec.studentId
				const dayOfWeek = rec.dayOfWeek
				const score = rec.score

				if (!weekScoresCache.value.has(week)) {
					weekScoresCache.value.set(week, new Map())
				}
				const weekMap = weekScoresCache.value.get(week)!
				const key = `${studentId}_${dayOfWeek}`
				const oldScore = weekMap.get(key) || 0
				weekMap.set(key, oldScore + score)

				allWeeksSet.value.add(week)
			}
		} catch (error) {
			console.error('获取积分记录失败', error)
			ElMessage.error('加载积分数据失败，请刷新重试')
		}
	}

	// ---------- 根据当前学期过滤周次 ----------
	const filterWeeksBySemester = () => {
		if (!selectedSemester.value) return []
		const allWeeks = Array.from(allWeeksSet.value).sort((a, b) => a - b)
		return allWeeks.filter(w => getSemesterByWeek(w) === selectedSemester.value)
	}

	// ---------- 更新周次下拉选项 ----------
	const updateAvailableWeeks = () => {
		availableWeeks.value = filterWeeksBySemester()
	}

	// ---------- 学期变化时的处理 ----------
	const onSemesterChange = () => {
		updateAvailableWeeks()
		if (availableWeeks.value.length > 0) {
			// 默认选中该学期最大周次
			selectedWeek.value = Math.max(...availableWeeks.value)
			buildTableByWeek(selectedWeek.value)
		} else {
			selectedWeek.value = null
			tableData.value = []
		}
	}

	// ---------- 周次切换 ----------
	const onWeekSelect = () => {
		if (selectedWeek.value) {
			buildTableByWeek(selectedWeek.value)
		}
	}

	// ---------- 根据指定周次构建表格 ----------
	const buildTableByWeek = (week: number) => {
	  if (!week) return
	  const weekMap = weekScoresCache.value.get(week) || new Map()
	
	  // 1. 按小组分组，每个小组内按成员编号排序
	  const groupMap = new Map<number, any[]>()
	  studentsData.value.forEach((student: any) => {
	    const gid = student.stu_group_info_id
	    if (!gid) return
	    if (!groupMap.has(gid)) groupMap.set(gid, [])
	    groupMap.get(gid)!.push(student)
	  })
	  for (let [gid, students] of groupMap.entries()) {
	    students.sort((a, b) => (a.member_number || 99) - (b.member_number || 99))
	  }
	
	  // 2. 构建每个小组的每日分数矩阵和统计信息
	  const groupScores: any[] = []
	  for (let group of groupsData.value) {
	    const students = groupMap.get(group.id) || []
	    // daysData: { 周一: [score1, score2, ..., score7], 周二: [...], ... }
	    const daysData: any = {}
	    weekdays.forEach(day => {
	      daysData[day] = Array(7).fill(null) // 先全部为 null（成员不存在）
	    })
	
	    // 填充存在的成员：初始分数0，然后累加积分记录
	    students.forEach((student: any) => {
	      const memberNum = student.member_number
	      if (!memberNum || memberNum < 1 || memberNum > 7) return
	      const idx = memberNum - 1
	      weekdays.forEach(day => {
	        const dayNum = dayOfWeekMap[day]
	        const key = `${student.id}_${dayNum}`
	        const score = weekMap.get(key) || 0
	        if (daysData[day][idx] === null) {
	          daysData[day][idx] = score
	        } else {
	          daysData[day][idx] += score
	        }
	      })
	    })
	
	    // 3. 计算每个成员的总分（所有天之和）及有效成员数
	    const memberTotals = Array(7).fill(0)
	    let validMemberCount = 0
	    for (let m = 0; m < 7; m++) {
	      let sum = 0
	      let hasMember = false
	      for (let day of weekdays) {
	        const val = daysData[day][m]
	        if (val !== null) {
	          sum += val
	          hasMember = true
	        }
	      }
	      if (hasMember) {
	        memberTotals[m] = sum
	        validMemberCount++
	      } else {
	        memberTotals[m] = 0
	      }
	    }
	
	    const groupTotal = memberTotals.reduce((a, b) => a + b, 0)
	    const avgScore = validMemberCount > 0 ? (groupTotal / validMemberCount).toFixed(2) : '0.00'
	
	    groupScores.push({
	      groupId: group.id,
	      groupName: group.name,
	      daysData,
	      memberTotals,
	      groupTotal,
	      avgScore,
	      rank: 0
	    })
	  }
	
	  // 4. 按小组总分降序排名
	  groupScores.sort((a, b) => b.groupTotal - a.groupTotal)
	  groupScores.forEach((g, idx) => { g.rank = idx + 1 })
	
	  // 5. 生成表格行（按照 groupsData 的原始顺序，即按名称数字排序）
	  // 注意：排名已经计算，但表格展示顺序应该按小组名称数字顺序，而不是排名顺序
	  const orderedGroups = [...groupScores].sort((a, b) => {
	    const numA = parseInt(a.groupName.match(/\d+/)?.[0] || '0')
	    const numB = parseInt(b.groupName.match(/\d+/)?.[0] || '0')
	    return numA - numB
	  })
	
	  const rows: any[] = []
	  for (let g of orderedGroups) {
	    // 每天一行
	    for (let day of weekdays) {
	      const row: any = {
	        groupName: g.groupName,
	        day: day,
	        member1: g.daysData[day][0],
	        member2: g.daysData[day][1],
	        member3: g.daysData[day][2],
	        member4: g.daysData[day][3],
	        member5: g.daysData[day][4],
	        member6: g.daysData[day][5],
	        member7: g.daysData[day][6],
	        groupTotal: '',
	        avgScore: '',
	        rank: '',
	        isSummary: false,
	        groupId: g.groupId
	      }
	      rows.push(row)
	    }
	    // 合计行
	    const summaryRow: any = {
	      groupName: g.groupName,
	      day: '合计',
	      member1: g.memberTotals[0],
	      member2: g.memberTotals[1],
	      member3: g.memberTotals[2],
	      member4: g.memberTotals[3],
	      member5: g.memberTotals[4],
	      member6: g.memberTotals[5],
	      member7: g.memberTotals[6],
	      groupTotal: g.groupTotal,
	      avgScore: g.avgScore,
	      rank: g.rank,
	      isSummary: true,
	      groupId: g.groupId
	    }
	    rows.push(summaryRow)
	  }
	  tableData.value = rows
	}
	// ---------- 合并单元格 ----------
	const spanMethod = ({ row, column, rowIndex, columnIndex }: any) => {
	  // 只合并组别列（第一列）
	  if (columnIndex === 0) {
	    const groupRows = tableData.value.filter(r => r.groupId === row.groupId)
	    const firstIndex = tableData.value.findIndex(r => r.groupId === row.groupId)
	    if (firstIndex === rowIndex) return { rowspan: groupRows.length, colspan: 1 }
	    return { rowspan: 0, colspan: 0 }
	  }
	  // 其他列不合并（包括小组总分、平均分、排名）
	  return { rowspan: 1, colspan: 1 }
	}

	const getRankType = (rank : number) => {
		if (rank === 1) return 'danger'
		if (rank === 2) return 'warning'
		if (rank === 3) return 'success'
		return 'info'
	}

	// ---------- 个人分数编辑 ----------
	const openStudentScoreEditor = (row : any, memberNumber : number) => {
		if (row.isSummary) {
			ElMessage.warning('合计行不能修改')
			return
		}
		const group = groupsData.value.find(g => g.name === row.groupName)
		if (!group) return
		const student = studentsData.value.find(s => s.stu_group_info_id === group.id && s.member_number === memberNumber)
		if (!student) {
			ElMessage.warning('该成员不存在，请检查小组配置')
			return
		}
		const dayNum = dayOfWeekMap[row.day]
		const weekMap = weekScoresCache.value.get(selectedWeek.value!) || new Map()
		const currentScore = weekMap.get(`${student.id}_${dayNum}`) || 0
		personalDialog.value = {
			visible: true,
			row,
			memberNumber,
			currentScore,
			studentId: student.id,
			dayOfWeek: dayNum
		}
	}

	const confirmPersonalChange = async (delta : number) => {
		const { studentId, dayOfWeek, currentScore, row, memberNumber } = personalDialog.value
		const newScore = (currentScore || 0) + delta
		try {
			const res = await addStudentScore({
				studentId: studentId,
				classId: classId.value,
				grade: classGrade.value,
				semester: selectedSemester.value,
				week: selectedWeek.value,
				dayOfWeek: dayOfWeek,
				score: delta,
				reason: `小组积分表手动${delta > 0 ? '加' : '减'}${Math.abs(delta)}分`
			})
			if (res.code === 1) {
				// 更新缓存
				if (!weekScoresCache.value.has(selectedWeek.value!)) {
					weekScoresCache.value.set(selectedWeek.value!, new Map())
				}
				const weekMap = weekScoresCache.value.get(selectedWeek.value!)!
				const key = `${studentId}_${dayOfWeek}`
				const oldVal = weekMap.get(key) || 0
				weekMap.set(key, oldVal + delta)
				// 重新构建当前周的表格
				buildTableByWeek(selectedWeek.value!)
				ElMessage.success(`已将 ${row.groupName} ${row.day} ${memberNumber}号组员分数调整为 ${newScore}`)
				personalDialog.value.visible = false
			} else {
				ElMessage.error(res.msg || '修改失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		}
	}

	// ---------- 小组批量加减分 ----------
	const handleGroupClick = (groupName : string) => {
		ElMessageBox.prompt('请输入要操作的星期 (周一~周五)', '选择星期', {
			confirmButtonText: '下一步',
			cancelButtonText: '取消',
			inputValue: '周一',
			inputValidator: (val) => {
				if (!weekdays.includes(val)) return '请输入正确的星期（周一~周五）'
				return true
			}
		}).then(({ value: targetDay }) => {
			groupDialog.value = { visible: true, groupName, targetDay }
		}).catch(() => { })
	}

	const confirmGroupChange = async (delta : number) => {
		const { groupName, targetDay } = groupDialog.value
		const group = groupsData.value.find(g => g.name === groupName)
		if (!group) return
		const studentsInGroup = studentsData.value.filter(s => s.stu_group_info_id === group.id && s.member_number)
		if (studentsInGroup.length === 0) {
			ElMessage.warning('该小组没有成员')
			groupDialog.value.visible = false
			return
		}
		const dayNum = dayOfWeekMap[targetDay]
		const records = studentsInGroup.map(student => ({
			studentId: student.id,
			classId: classId.value,
			grade: classGrade.value,
			semester: selectedSemester.value,
			week: selectedWeek.value,
			dayOfWeek: dayNum,
			score: delta,
			reason: `小组批量${delta > 0 ? '加' : '减'}${Math.abs(delta)}分`
		}))
		try {
			const res = await batchAddStudentScore({ records })
			if (res.code === 1) {
				// 更新缓存
				if (!weekScoresCache.value.has(selectedWeek.value!)) {
					weekScoresCache.value.set(selectedWeek.value!, new Map())
				}
				const weekMap = weekScoresCache.value.get(selectedWeek.value!)!
				for (let student of studentsInGroup) {
					const key = `${student.id}_${dayNum}`
					const oldScore = weekMap.get(key) || 0
					weekMap.set(key, oldScore + delta)
				}
				buildTableByWeek(selectedWeek.value!)
				ElMessage.success(`已为${groupName}的${targetDay}所有成员${delta > 0 ? '+' : ''}${delta}分`)
				groupDialog.value.visible = false
			} else {
				ElMessage.error(res.msg || '操作失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		}
	}

	// ---------- 导出 Excel ----------
	const exportToExcel = () => {
		const exportData : any[][] = []
		exportData.push([`${schoolInfo.value}${className.value} 第${selectedWeek.value}周积分汇总表`, '', '', '', '', '', '', '', '', '', '', ''])
		exportData.push(['组别', '时间', '1号组员', '2号组员', '3号组员', '4号组员', '5号组员', '6号组员', '7号组员', '小组总分', '平均分', '排名'])

		let currentGroupName = ''
		for (let row of tableData.value) {
			const exportRow = []
			if (row.groupName !== currentGroupName) {
				exportRow.push(row.groupName)
				currentGroupName = row.groupName
			} else {
				exportRow.push('')
			}
			exportRow.push(row.day)
			exportRow.push(row.member1 !== null ? row.member1 : (row.member1 === null ? 'x' : ''))
			exportRow.push(row.member2 !== null ? row.member2 : (row.member2 === null ? 'x' : ''))
			exportRow.push(row.member3 !== null ? row.member3 : (row.member3 === null ? 'x' : ''))
			exportRow.push(row.member4 !== null ? row.member4 : (row.member4 === null ? 'x' : ''))
			exportRow.push(row.member5 !== null ? row.member5 : (row.member5 === null ? 'x' : ''))
			exportRow.push(row.member6 !== null ? row.member6 : (row.member6 === null ? 'x' : ''))
			exportRow.push(row.member7 !== null ? row.member7 : (row.member7 === null ? 'x' : ''))
			if (row.isSummary) {
				exportRow.push(row.groupTotal, row.avgScore, row.rank)
			} else {
				exportRow.push('', '', '')
			}
			exportData.push(exportRow)
		}

		const ws = XLSX.utils.aoa_to_sheet(exportData)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, `第${selectedWeek.value}周积分表`)
		XLSX.writeFile(wb, `班级第${selectedWeek.value}周积分汇总表.xlsx`)
		ElMessage.success('导出成功')
	}

	const refreshData = () => {
		if (selectedWeek.value) {
			buildTableByWeek(selectedWeek.value)
		} else {
			ElMessage.warning('请先选择学期和周次')
		}
	}

	// ---------- 初始化 ----------
	const init = async () => {
		loading.value = true
		loadError.value = false
		try {
			await fetchCurrentClass()
			if (!classId.value) throw new Error('班级信息缺失')
			await Promise.all([fetchGroups(), fetchStudents()])
			await fetchAllScoresAndBuildCache()

			// 设置默认学期（根据当前月份）
			const month = new Date().getMonth() + 1
			selectedSemester.value = (month >= 3 && month <= 8) ? 2 : 1

			updateAvailableWeeks()
			if (availableWeeks.value.length > 0) {
				selectedWeek.value = Math.max(...availableWeeks.value)
				buildTableByWeek(selectedWeek.value)
			} else {
				tableData.value = []
			}
		} catch (error) {
			console.error('初始化失败', error)
			loadError.value = true
			errorMsg.value = '数据加载失败，请刷新页面重试'
		} finally {
			loading.value = false
		}
	}

	onMounted(() => {
		uni.$on('storage',init)
		init()
	})
	
	onUnmounted(async ()=>{
		uni.$off('storage',init)
	})
</script>

<style scoped>
	/* 样式与原来保持一致 */
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
		flex-wrap: wrap;
		gap: 16px;
		margin-bottom: 16px;
	}

	.actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.week-bar {
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
		padding-bottom: 10px;
		border-bottom: 2px solid #eef2f6;
	}

	.table-title h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1e293b;
	}

	.group-name-cell {
		cursor: pointer;
		color: #409eff;
		font-weight: 500;
	}

	.group-name-cell:hover {
		text-decoration: underline;
	}

	.clickable-score {
		cursor: pointer;
		display: inline-block;
		padding: 4px 8px;
		border-radius: 4px;
		transition: background 0.2s;
	}

	.clickable-score:hover {
		background-color: #ecf5ff;
	}

	.null-score {
		color: #f56c6c;
		font-weight: bold;
	}

	.score-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
	}

	:deep(.el-table .cell) {
		white-space: nowrap;
	}

	:deep(.el-table__header th) {
		background-color: #f5f7fa;
	}
</style>