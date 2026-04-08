<template>
	<div class="app-container">
		<el-card class="header-card" shadow="never">
			<div class="header-content">
				<div class="actions">
					<el-button type="primary" plain @click="exportToExcel" icon="Upload">导出Excel</el-button>
					<el-button type="success" plain @click="importExcel" icon="Download">导入Excel</el-button>
					<el-button type="info" plain @click="refreshData" icon="RefreshRight">刷新数据</el-button>
				</div>
			</div>
			<div class="week-bar">
				<el-select v-model="selectedWeek" placeholder="选择周次" style="width: 120px; margin-right: 12px;"
					@change="onWeekSelect" :disabled="selectedWeek==0">
					<el-option v-for="w in availableWeeks" :key="w" :label="`第${w}周`" :value="w" />
				</el-select>
				<el-button type="primary" @click="addNewWeek" icon="Plus">添加新一周</el-button>
				<el-alert :title="infoMsg" type="warning" :closable="true" show-icon style="margin-left: auto;" />
				<el-alert v-if="loadError" :title="errorMsg" type="error" :closable="true" @close="loadError = false"
					show-icon style="margin-left: auto;" />
			</div>
		</el-card>
		<el-card class="table-card" shadow="hover" v-loading="loading">
			<div class="table-title">
				<h2>{{ schoolInfo+classInfo.name }}小组管理第{{ currentWeek }}周积分汇总表</h2>
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
						<span v-else class="null-score" @click.stop="addMissingMember(row, 1)">x</span>
					</template>
				</el-table-column>
				<el-table-column prop="member2" label="2号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member2 !== null && row.member2 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 2)">{{ row.member2 }}</span>
						<span v-else class="null-score" @click.stop="addMissingMember(row, 2)">x</span>
					</template>
				</el-table-column>
				<el-table-column prop="member3" label="3号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member3 !== null && row.member3 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 3)">{{ row.member3 }}</span>
						<span v-else class="null-score" @click.stop="addMissingMember(row, 3)">x</span>
					</template>
				</el-table-column>
				<el-table-column prop="member4" label="4号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member4 !== null && row.member4 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 4)">{{ row.member4 }}</span>
						<span v-else class="null-score" @click.stop="addMissingMember(row, 4)">x</span>
					</template>
				</el-table-column>
				<el-table-column prop="member5" label="5号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member5 !== null && row.member5 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 5)">{{ row.member5 }}</span>
						<span v-else class="null-score" @click.stop="addMissingMember(row, 5)">x</span>
					</template>
				</el-table-column>
				<el-table-column prop="member6" label="6号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member6 !== null && row.member6 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 6)">{{ row.member6 }}</span>
						<span v-else class="null-score" @click.stop="addMissingMember(row, 6)">x</span>
					</template>
				</el-table-column>
				<el-table-column prop="member7" label="7号组员" width="85" align="center">
					<template #default="{ row }">
						<span v-if="row.member7 !== null && row.member7 !== undefined" class="clickable-score"
							@click.stop="openStudentScoreEditor(row, 7)">{{ row.member7 }}</span>
						<span v-else class="null-score" @click.stop="addMissingMember(row, 7)">x</span>
					</template>
				</el-table-column>
				<el-table-column prop="groupTotal" label="小组总分" width="100" align="center">
					<template #default="{ row }">
						<span v-if="row.isSummary || row.groupTotal !== undefined && row.groupTotal !== ''"
							:class="{ 'total-score': row.isSummary }">
							{{ row.groupTotal !== undefined && row.groupTotal !== '' ? row.groupTotal : '' }}
						</span>
					</template>
				</el-table-column>
				<el-table-column prop="avgScore" label="平均分" width="90" align="center">
					<template #default="{ row }">
						<span
							v-if="row.isSummary || (row.avgScore !== undefined && row.avgScore !== '')">{{ row.avgScore !== undefined ? row.avgScore : '' }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="rank" label="排名" width="80" align="center">
					<template #default="{ row }">
						<el-tag v-if="row.rank && row.rank !== ''" :type="getRankType(row.rank)"
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

		<!-- 隐藏文件上传 -->
		<input type="file" ref="fileInput" style="display:none" accept=".xlsx,.xls" @change="handleFileUpload" />
	</div>
</template>

<script setup lang="ts">
	import { ref, onMounted } from 'vue'
	import { ElMessage, ElMessageBox } from 'element-plus'
	import * as XLSX from 'xlsx'
	import { getGroups, updateGroupScore, getClasses, getTeacherInfo, addNewWeek as AddNewWeek, getClassWeeks, createClass } from '@/api/request'

	// 学校信息（显示用）
	const schoolInfo = ref('')
	const currentWeek = ref(4)
	const loading = ref(false)
	const loadError = ref(false)
	const infoMsg = "点击组别可批量加减分，点击分数可单独修改，点击 x 可添加新成员,新老师可以在个人信息栏创建班级后添加新周次，导入表格可以替换当前周数据"
	const errorMsg = ref('')
	const fileInput = ref(null)
	const tableData = ref([])
	const classInfo = ref(null)
	const groupsStore = ref([])

	// 周次下拉相关变量
	const selectedWeek = ref(0)
	const availableWeeks = ref<number[]>([])

	const scoreValues = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

	const personalDialog = ref({ visible: false, row: null, memberNumber: null, currentScore: null })
	const groupDialog = ref({ visible: false, groupName: null, targetDay: null })

	// 星期顺序常量
	const weekdaysOrder = ['周一', '周二', '周三', '周四', '周五']

	// 更新小组合计行
	const updateGroupSummary = (group) => {
		const totals = [null, null, null, null, null, null, null]
		group.days.forEach(day => {
			for (let i = 0; i < 7; i++) {
				const score = day.scores[i]
				if (score !== null && !isNaN(score)) {
					if (totals[i] === null) totals[i] = 0
					totals[i] += score
				}
			}
		})
		group.summary.totals = totals
	}

	// 标准化小组数据
	const normalizeGroupData = (group) => {
		const normalizedDays = weekdaysOrder.map(weekday => {
			const existing = group.days.find(d => d.day === weekday)
			const scores = Array(7).fill(null)
			if (existing && Array.isArray(existing.scores)) {
				for (let i = 0; i < Math.min(existing.scores.length, 7); i++) {
					scores[i] = existing.scores[i] === undefined ? null : existing.scores[i]
				}
			}
			return { day: weekday, scores }
		})
		group.days = normalizedDays
		updateGroupSummary(group)
		return group
	}

	// 计算小组总分和平均分
	const calculateGroupScores = (group) => {
		const existingTotals = group.summary.totals.filter(t => t !== null && t !== undefined)
		const groupTotal = existingTotals.reduce((sum, val) => sum + val, 0)
		const memberCount = existingTotals.length
		const avgScore = memberCount > 0 ? (groupTotal / memberCount).toFixed(2) : '0.00'
		return { groupTotal, avgScore, memberCount }
	}

	// 添加缺失成员
	const addMissingMember = (row, memberNumber) => {
		ElMessageBox.confirm(`是否添加 ${row.groupName} 的 ${memberNumber} 号组员？添加后所有天的分数将初始化为 0 分。`, '添加新成员', {
			confirmButtonText: '确认添加',
			cancelButtonText: '取消',
			type: 'info'
		}).then(() => {
			const group = groupsStore.value.find(g => g.name === row.groupName)
			if (!group) return
			group.days.forEach(day => {
				day.scores[memberNumber - 1] = 0
			})
			normalizeGroupData(group)
			buildTableFromGroups()
			saveCurrentData()
			ElMessage.success(`已添加 ${row.groupName} ${memberNumber}号组员，初始分数为 0`)
		}).catch(() => { })
	}


	// 按周次加载数据
	const loadDataByWeek = async (classId : number, week : number) => {
		const groupsRes = await getGroups(classId, week)
		if (groupsRes.code !== 1) throw new Error(groupsRes.msg || '获取小组数据失败')
		const toNumberOrNull = (val : any) : number | null => {
			if (val === null || val === undefined || val === '') return null
			if (typeof val === 'number') return isNaN(val) ? null : val
			if (typeof val === 'string') {
				const trimmed = val.trim()
				if (trimmed === '' || trimmed.toLowerCase() === 'x') return null
				const num = Number(trimmed)
				return isNaN(num) ? null : num
			}
			return null
		}
		const processGroupData = (group : any) => {
			let jsonData = null
			try {
				jsonData = group.weekly_score_json ? JSON.parse(group.weekly_score_json) : null
			} catch (e) { }
			if (!jsonData) {
				jsonData = {
					days: weekdaysOrder.map(day => ({ day, scores: [null, null, null, null, null, null, null] })),
					summary: { totals: [null, null, null, null, null, null, null] }
				}
			}
			const processedDays = (jsonData.days || []).map((dayItem : any) => {
				const scores = (dayItem.scores || []).slice(0, 7).map((s : any) => toNumberOrNull(s))
				while (scores.length < 7) scores.push(null)
				return { day: dayItem.day, scores }
			})
			const finalDays = weekdaysOrder.map(weekday => {
				const existing = processedDays.find(d => d.day === weekday)
				return existing || { day: weekday, scores: [null, null, null, null, null, null, null] }
			})
			const rawTotals = (jsonData.summary?.totals || []).slice(0, 7).map((t : any) => toNumberOrNull(t))
			while (rawTotals.length < 7) rawTotals.push(null)
			return {
				id: group.id,
				name: group.name,
				days: finalDays,
				summary: { totals: rawTotals }
			}
		}
		const groups = groupsRes.data.map(processGroupData)
		groupsStore.value = groups.map(g => normalizeGroupData(g))
		buildTableFromGroups()
	}

	// 从后端加载数据
	const fetchDataFromAPI = async () => {
		loading.value = true
		loadError.value = false
		try {
			// 从本地存储获取班级信息（由 index.vue 存入）
			const storedClass = uni.getStorageSync('currentClass')
			if (!storedClass) {
				// 如果本地没有，尝试调用接口获取
				const classRes = await getClasses()
				if (classRes.code !== 1 || !classRes.data.length) throw new Error('暂无班级数据')
				const currentClass = classRes.data[0]
				classInfo.value = currentClass
				uni.setStorageSync('currentClass', currentClass)
			} else {
				classInfo.value = storedClass
			}

			// 获取班级已有周次列表
			const weeksRes = await getClassWeeks(classInfo.value.id)
			if (weeksRes.code === 1) {
				availableWeeks.value = weeksRes.data
				if (availableWeeks.value.length) {
					const latestWeek = availableWeeks.value[availableWeeks.value.length - 1]
					selectedWeek.value = latestWeek
					currentWeek.value = latestWeek
					await loadDataByWeek(classInfo.value.id, latestWeek)
				} else {
					selectedWeek.value = 0
					currentWeek.value = 0
					await loadDataByWeek(classInfo.value.id, 1)
				}
			} else {
				throw new Error('获取周次列表失败')
			}
			ElMessage.success('数据加载成功')
		} catch (error) {
			console.error('数据加载失败:', error)
			loadError.value = true
			errorMsg.value = '从服务器获取数据失败，请导入Excel文件'
			ElMessageBox.confirm('无法从服务器获取数据，是否从本地Excel导入初始数据？', '提示', {
				confirmButtonText: '导入Excel',
				cancelButtonText: '取消',
				type: 'warning'
			}).then(() => {
				importExcel()
			}).catch(() => { })
		} finally {
			loading.value = false
		}
	}

	// 周次下拉选择事件
	const onWeekSelect = async () => {
		if (!selectedWeek.value || !classInfo.value?.id) return
		currentWeek.value = selectedWeek.value
		await loadDataByWeek(classInfo.value.id, selectedWeek.value)
		ElMessage.success(`已切换到第${selectedWeek.value}周`)
	}

	// 保存当前所有小组数据到后端
	const saveCurrentData = async () => {
		try {
			for (const group of groupsStore.value) {
				if (!group.id) {
					console.error('小组缺少 id，无法保存', group)
					ElMessage.warning(`小组 ${group.name} 缺少数据库ID，请先刷新页面或重新初始化小组`)
					continue
				}
				const payload = {
					days: group.days,
					summary: group.summary
				}
				await updateGroupScore(group.id, payload)
			}
		} catch (error) {
			console.error('保存数据失败', error)
			ElMessage.warning('部分数据未能保存到服务器')
		}
	}

	// 添加新一周
	const addNewWeek = async () => {
		try {
			await ElMessageBox.confirm('添加新一周将创建新一周数据，当前周分数将被保留。是否继续？', '提示', {
				confirmButtonText: '确认',
				cancelButtonText: '取消',
				type: 'warning'
			})
			if (!classInfo.value?.id) throw new Error('班级信息缺失')

			if (currentWeek.value === 0 || groupsStore.value.length === 0) {
				const emptyGroups = []
				for (let i = 1; i <= 9; i++) {
					emptyGroups.push({
						id: null,
						name: `第${i}组`,
						days: weekdaysOrder.map(day => ({ day, scores: [null, null, null, null, null, null, null] })),
						summary: { totals: [null, null, null, null, null, null, null] }
					})
				}
				groupsStore.value = emptyGroups
			}

			const newWeek = currentWeek.value + 1
			for (const group of groupsStore.value) {
				if (!group.days || group.days.length === 0) {
					group.days = weekdaysOrder.map(day => ({ day, scores: [null, null, null, null, null, null, null] }))
				}
				group.days.forEach(day => {
					for (let i = 0; i < 7; i++) {
						if (day.scores[i] !== null) {
							day.scores[i] = 0
						}
					}
				})
				const payload = {
					days: group.days,
					summary: { totals: [0, 0, 0, 0, 0, 0, 0] }
				}
				const res = await AddNewWeek(classInfo.value.id, newWeek, group.name, payload)
				if (res.code !== 1) throw new Error(res.msg || '创建新一周失败')
				normalizeGroupData(group)
			}
			buildTableFromGroups()
			const weeksRes = await getClassWeeks(classInfo.value.id)
			if (weeksRes.code === 1) {
				availableWeeks.value = weeksRes.data
				selectedWeek.value = newWeek
				currentWeek.value = newWeek
				await loadDataByWeek(classInfo.value.id, newWeek)
			}
			ElMessage.success(`已添加第${newWeek}周`)
		} catch (error) {
			if (error !== 'cancel') {
				console.error('添加新一周失败', error)
				ElMessage.error('添加新一周失败，请检查后端接口')
			}
		}
	}

	// 从导入的Excel构建内部数据结构
	const parseExcelToGroups = (workbook, existingGroups = []) => {
		const sheet = workbook.Sheets[workbook.SheetNames[0]]
		const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
		if (!rows || rows.length < 3) throw new Error('文件格式不正确')
		const groups = []
		let currentGroup = null
		for (let i = 2; i < rows.length; i++) {
			const row = rows[i]
			if (!row || row.length < 2) continue
			let groupName = row[0] ? row[0].toString().trim() : ""
			let dayText = row[1] ? row[1].toString().trim() : ""
			if (groupName && !groupName.includes('合计') && weekdaysOrder.includes(dayText)) {
				if (currentGroup) groups.push(currentGroup)
				currentGroup = {
					name: groupName,
					days: [],
					summary: { totals: [null, null, null, null, null, null, null] }
				}
			}
			if (currentGroup) {
				if (dayText === '合计') {
					for (let no = 1; no <= 7; no++) {
						const val = row[2 + (no - 1)]
						if (val !== undefined && val !== '' && val !== 'x') {
							currentGroup.summary.totals[no - 1] = parseFloat(val) || 0
						} else {
							currentGroup.summary.totals[no - 1] = null
						}
					}
				} else if (weekdaysOrder.includes(dayText)) {
					const scores = []
					for (let no = 1; no <= 7; no++) {
						let val = row[2 + (no - 1)]
						if (val === undefined || val === '' || val === 'x') {
							scores.push(null)
						} else {
							const num = parseFloat(val)
							scores.push(isNaN(num) ? null : num)
						}
					}
					currentGroup.days.push({ day: dayText, scores })
				}
			}
		}
		if (currentGroup) groups.push(currentGroup)
		const allGroupNames = ['第1组', '第2组', '第3组', '第4组', '第5组', '第6组', '第7组', '第8组', '第9组']
		const existingNames = groups.map(g => g.name)
		for (const name of allGroupNames) {
			if (!existingNames.includes(name)) {
				groups.push({
					name: name,
					days: weekdaysOrder.map(day => ({ day, scores: [null, null, null, null, null, null, null] })),
					summary: { totals: [null, null, null, null, null, null, null] }
				})
			}
		}
		groups.sort((a, b) => (parseInt(a.name.replace(/\D/g, '')) || 0) - (parseInt(b.name.replace(/\D/g, '')) || 0))
		const groupsWithId = groups.map(newGroup => {
			const existing = existingGroups.find(old => old.name === newGroup.name)
			return {
				id: existing ? existing.id : null,
				name: newGroup.name,
				days: newGroup.days,
				summary: newGroup.summary
			}
		})
		const finalGroups = groupsWithId.map(group => normalizeGroupData(group))
		return finalGroups
	}

	// 导入Excel
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

	const handleFileUpload = (fileOrEvent) => {
		let file
		if (fileOrEvent instanceof File) {
			file = fileOrEvent
		} else if (fileOrEvent && fileOrEvent.target) {
			file = fileOrEvent.target.files[0]
		} else {
			file = fileOrEvent
		}
		if (!file) return
		const reader = new FileReader()
		reader.onload = async (e) => {
			const data = new Uint8Array(e.target.result)
			const workbook = XLSX.read(data, { type: 'array' })
			try {
				const groups = parseExcelToGroups(workbook, groupsStore.value)
				groupsStore.value = groups
				buildTableFromGroups()
				await saveCurrentData()
				ElMessage.success('导入成功')
				loadError.value = false
			} catch (err) {
				ElMessage.error('解析文件失败：' + err.message)
			} finally {
				if (fileInput.value) fileInput.value.value = ''
			}
		}
		reader.readAsArrayBuffer(file)
	}

	// 导出Excel
	const exportToExcel = () => {
		const exportData : any[][] = []
		exportData.push([`${schoolInfo.value}${classInfo.value.name}小组管理第${currentWeek.value}周积分汇总表`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
		exportData.push(['组别', '时间', '1号组员', '2号组员', '3号组员', '4号组员', '5号组员', '6号组员', '7号组员', '小组总分', '平均分', '排名', '', '', '', '', ''])

		const groupScores = groupsStore.value.map(group => {
			const { groupTotal, avgScore } = calculateGroupScores(group)
			return { groupName: group.name, groupTotal, avgScore }
		})
		groupScores.sort((a, b) => b.groupTotal - a.groupTotal)
		const rankMap = new Map()
		groupScores.forEach((item, idx) => rankMap.set(item.groupName, idx + 1))

		groupsStore.value.forEach(group => {
			group.days.forEach((dayData, idx) => {
				const row = []
				if (idx === 0) row.push(group.name)
				else row.push('')
				row.push(dayData.day)
				for (let i = 0; i < 7; i++) {
					const val = dayData.scores[i]
					row.push(val !== null ? val : '')
				}
				if (idx === 0) {
					const groupTotal = groupScores.find(g => g.groupName === group.name)?.groupTotal ?? 0
					const avgScore = groupScores.find(g => g.groupName === group.name)?.avgScore ?? '0.00'
					const rank = rankMap.get(group.name) ?? ''
					row.push(groupTotal, avgScore, rank)
				} else {
					row.push('', '', '')
				}
				exportData.push(row)
			})
			const summaryRow = ['', '合计']
			for (let i = 0; i < 7; i++) {
				const val = group.summary.totals[i]
				summaryRow.push(val !== null ? val : '')
			}
			summaryRow.push('', '', '')
			exportData.push(summaryRow)
			exportData.push([])
		})

		if (groupsStore.value.length === 0) {
			exportData.push(['暂无小组数据', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
		}

		let XLSXLib = XLSX
		let useStyle = false
		const wb = XLSXLib.utils.book_new()
		const ws = XLSXLib.utils.aoa_to_sheet(exportData)

		const merges : any[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }]
		let currentRow = 2
		groupsStore.value.forEach(group => {
			const rowspan = group.days.length + 1
			merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow + rowspan - 1, c: 0 } })
			currentRow += rowspan + 1
		})
		ws['!merges'] = merges

		ws['!cols'] = [
			{ wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
			{ wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
			{ wch: 8 }, { wch: 6 }
		]

		if (useStyle) {
			const range = XLSXLib.utils.decode_range(ws['!ref'] || 'A1')
			for (let R = range.s.r; R <= range.e.r; ++R) {
				for (let C = range.s.c; C <= range.e.c; ++C) {
					const cellAddress = XLSXLib.utils.encode_cell({ r: R, c: C })
					if (!ws[cellAddress]) continue
					if (!ws[cellAddress].t) ws[cellAddress].t = 's'
					const style : any = { alignment: { horizontal: 'center', vertical: 'center' } }
					if (R === 0) style.font = { sz: 18, bold: true }
					else if (R === 1) style.font = { bold: true }
					ws[cellAddress].s = style
				}
			}
		}

		XLSXLib.utils.book_append_sheet(wb, ws, `第${currentWeek.value}周积分表`)
		try {
			XLSXLib.writeFile(wb, `班级第${currentWeek.value}周积分汇总表.xlsx`)
			ElMessage.success('导出成功')
		} catch (err) {
			console.error('导出失败', err)
			ElMessage.error('导出失败，请重试')
		}
	}

	const buildTableFromGroups = () => {
		groupsStore.value = groupsStore.value.map(group => normalizeGroupData(group))
		const groupScores = groupsStore.value.map(group => {
			const { groupTotal, avgScore } = calculateGroupScores(group)
			return { groupName: group.name, groupTotal, avgScore }
		})
		groupScores.sort((a, b) => b.groupTotal - a.groupTotal)
		const rankMap = new Map()
		groupScores.forEach((item, idx) => rankMap.set(item.groupName, idx + 1))
		const data = []
		groupsStore.value.forEach(group => {
			const groupRows = []
			const days = group.days || []
			days.forEach(dayData => {
				const scores = dayData.scores || Array(7).fill(null)
				const row = {
					groupName: group.name,
					day: dayData.day,
					member1: scores[0] ?? null,
					member2: scores[1] ?? null,
					member3: scores[2] ?? null,
					member4: scores[3] ?? null,
					member5: scores[4] ?? null,
					member6: scores[5] ?? null,
					member7: scores[6] ?? null,
					groupTotal: '',
					avgScore: '',
					rank: '',
					isSummary: false,
					groupId: group.name
				}
				groupRows.push(row)
			})
			const totals = group.summary?.totals || Array(7).fill(null)
			const summaryRow = {
				groupName: group.name,
				day: '合计',
				member1: totals[0] ?? '',
				member2: totals[1] ?? '',
				member3: totals[2] ?? '',
				member4: totals[3] ?? '',
				member5: totals[4] ?? '',
				member6: totals[5] ?? '',
				member7: totals[6] ?? '',
				groupTotal: '',
				avgScore: '',
				rank: '',
				isSummary: true,
				groupId: group.name
			}
			groupRows.push(summaryRow)
			data.push(...groupRows)
		})
		groupsStore.value.forEach(group => {
			const groupTotal = groupScores.find(g => g.groupName === group.name)?.groupTotal ?? 0
			const avgScore = groupScores.find(g => g.groupName === group.name)?.avgScore ?? '0.00'
			const rank = rankMap.get(group.name) ?? ''
			const firstRowIndex = data.findIndex(row => row.groupId === group.name && row.day === '周一')
			if (firstRowIndex !== -1) {
				data[firstRowIndex].groupTotal = groupTotal
				data[firstRowIndex].avgScore = avgScore
				data[firstRowIndex].rank = rank
			}
		})
		tableData.value = data
	}

	const spanMethod = ({ row, column, rowIndex, columnIndex }) => {
		if (columnIndex === 0) {
			const groupRows = tableData.value.filter(r => r.groupId === row.groupId)
			const firstIndex = tableData.value.findIndex(r => r.groupId === row.groupId)
			if (firstIndex === rowIndex) return { rowspan: groupRows.length, colspan: 1 }
			return { rowspan: 0, colspan: 0 }
		}
		if (columnIndex === 9 || columnIndex === 10 || columnIndex === 11) {
			const groupRows = tableData.value.filter(r => r.groupId === row.groupId)
			const firstRow = groupRows[0]
			const firstIndex = tableData.value.findIndex(r => r.groupId === row.groupId && r.day === firstRow.day)
			if (firstIndex === rowIndex) return { rowspan: groupRows.length, colspan: 1 }
			return { rowspan: 0, colspan: 0 }
		}
		return { rowspan: 1, colspan: 1 }
	}

	const getRankType = (rank) => {
		if (rank === 1) return 'danger'
		if (rank === 2) return 'warning'
		if (rank === 3) return 'success'
		return 'info'
	}

	const refreshData = () => {
		fetchDataFromAPI()
	}

	const handleGroupClick = (groupName) => {
		ElMessageBox.prompt('请输入要操作的星期 (周一~周五)', '选择星期', {
			confirmButtonText: '下一步',
			cancelButtonText: '取消',
			inputValue: '周一',
			inputValidator: (val) => {
				if (!['周一', '周二', '周三', '周四', '周五'].includes(val)) return '请输入正确的星期（周一~周五）'
				return true
			}
		}).then(({ value: targetDay }) => {
			groupDialog.value = { visible: true, groupName, targetDay }
		}).catch(() => { })
	}

	const confirmGroupChange = async (change) => {
		const { groupName, targetDay } = groupDialog.value
		const group = groupsStore.value.find(g => g.name === groupName)
		if (!group) return
		const dayData = group.days.find(d => d.day === targetDay)
		if (!dayData) {
			ElMessage.warning('该小组没有此天的数据')
			groupDialog.value.visible = false
			return
		}
		for (let i = 0; i < 7; i++) {
			if (dayData.scores[i] !== null) {
				const oldVal = dayData.scores[i] || 0
				dayData.scores[i] = oldVal + change
			}
		}
		normalizeGroupData(group)
		buildTableFromGroups()
		await saveCurrentData()
		ElMessage.success(`已为${groupName}的${targetDay}所有存在成员${change > 0 ? '+' : ''}${change}分`)
		groupDialog.value.visible = false
	}

	const openStudentScoreEditor = (row, memberNumber) => {
		if (row.isSummary) {
			ElMessage.warning('合计行不能修改')
			return
		}
		const group = groupsStore.value.find(g => g.name === row.groupName)
		if (!group) return
		const dayData = group.days.find(d => d.day === row.day)
		if (!dayData) return
		const currentScore = dayData.scores[memberNumber - 1]
		if (currentScore === null) {
			ElMessage.warning('该成员不存在，请点击 x 添加')
			return
		}
		personalDialog.value = { visible: true, row, memberNumber, currentScore }
	}

	const confirmPersonalChange = async (delta) => {
		const { row, memberNumber, currentScore } = personalDialog.value
		const group = groupsStore.value.find(g => g.name === row.groupName)
		if (!group) return
		const dayData = group.days.find(d => d.day === row.day)
		if (!dayData) return
		const newScore = currentScore + delta
		dayData.scores[memberNumber - 1] = newScore
		normalizeGroupData(group)
		buildTableFromGroups()
		await saveCurrentData()
		ElMessage.success(`已将${row.groupName} ${row.day} ${memberNumber}号组员分数调整为 ${newScore}`)
		personalDialog.value.visible = false
	}

	onMounted(() => {
		uni.getStorage({key:'teacherInfo',success(res) {
			schoolInfo.value =res.data.school
		}})
		fetchDataFromAPI()
	})
</script>

<style scoped>
	/* 样式保持原有不变 */
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

	.title {
		font-size: 1.4rem;
		font-weight: 600;
		color: #1e293b;
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
		color: #aaa;
		font-style: italic;
		cursor: pointer;
	}

	.null-score:hover {
		background-color: #f0f9eb;
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