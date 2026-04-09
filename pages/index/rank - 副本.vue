<template>
	<div class="rank-container">
		<!-- 班级信息卡片 -->
		<el-card class="class-info-card" shadow="never">
			<div class="class-header">
				<div class="class-name">{{ className }}</div>
				<div class="class-meta">{{ semesterText }} · 共 {{ totalStudents }} 名学生</div>
			</div>
		</el-card>

		<!-- 筛选栏 -->
		<el-card class="filter-card" shadow="never">
			<div class="filter-bar">
				<el-select v-model="selectedWeek" placeholder="选择周次" style="width: 160px" clearable
					:disabled="!availableWeeks.length" @change="onWeekChange" @clear="handleClear">
					<el-option label="全部周次" :value="0" />
					<el-option v-for="w in availableWeeks" :key="w" :label="`第${w}周`" :value="w" />
				</el-select>
				<el-button type="primary" @click="refreshData" :loading="loading">
					刷新
				</el-button>
				<el-button type="success" plain @click="exportRanking" :disabled="!studentRank.length">
					导出排名
				</el-button>
			</div>
		</el-card>

		<!-- 切换按钮 -->
		<div class="tab-switch">
			<el-button-group>
				<el-button :type="activeTab === 'student' ? 'primary' : 'default'" @click="activeTab = 'student'">
					个人荣誉榜
				</el-button>
				<el-button :type="activeTab === 'group' ? 'primary' : 'default'" @click="activeTab = 'group'">
					小组荣誉榜
				</el-button>
			</el-button-group>
		</div>

		<!-- 个人荣誉榜（卡片布局） -->
		<div class="rank-section" v-if="activeTab === 'student'">
			<div class="rank-list">
				<div v-for="(student, idx) in studentRank" :key="student.id" class="rank-card student-card"
					:class="getStudentCardClass(idx)">
					<div class="rank-badge">
						<span v-if="idx === 0" class="medal gold">👑</span>
						<span v-else-if="idx === 1" class="medal silver">🥈</span>
						<span v-else-if="idx === 2" class="medal bronze">🥉</span>
						<span v-else class="rank-number">{{ idx + 1 }}</span>
					</div>
					<div class="rank-info">
						<div class="student-name">{{ student.name }}</div>
						<div class="student-meta">
							<el-tag size="small" type="info">{{ student.group_name || '未分组' }}</el-tag>
						</div>
					</div>
					<div class="rank-points">
						<span class="points">{{ student.total }}</span>
						<span class="unit">分</span>
					</div>
				</div>
			</div>
			<div v-if="!studentRank.length && !loading" class="empty-placeholder">
				<el-empty description="暂无学生数据，请先添加学生" />
			</div>
		</div>

		<!-- 小组荣誉榜（优化后的卡片布局） -->
		<div class="rank-section" v-else>
			<div class="rank-list group-rank">
				<div v-for="(group, idx) in groupRank" :key="group.id" class="rank-card group-card"
					:class="getGroupCardClass(idx)">
					<!-- 左侧排名徽章 -->
					<div class="rank-badge">
						<span v-if="idx === 0" class="medal gold">👑</span>
						<span v-else-if="idx === 1" class="medal silver">🌟</span>
						<span v-else-if="idx === 2" class="medal bronze">🌙</span>
						<span v-else class="rank-number">{{ idx + 1 }}</span>
					</div>

					<!-- 中间小组信息 -->
					<div class="rank-info group-info">
						<div class="group-header">
							<span class="group-icon">👥</span>
							<div>
								<div class="group-name">{{ group.name }}</div>
								<div class="group-description">{{ group.description || '暂无花名' }}</div>
							</div>
						</div>
						<!-- 成员网格列表 -->
						<div class="member-grid">
							<div v-for="member in group.members" :key="member.id" class="member-card">
								<span class="member-name">{{ member.name }}</span>
								<span class="member-score">{{ member.score }}分</span>
							</div>
						</div>
					</div>

					<!-- 右侧积分区域 -->
					<div class="rank-points group-stats">
						<div class="stat-item">
							<span class="stat-value">{{ group.total }}</span>
							<span class="stat-label">总分</span>
						</div>
						<div class="stat-divider"></div>
						<div class="stat-item">
							<span class="stat-value avg">{{ group.avg }}</span>
							<span class="stat-label">平均分</span>
						</div>
					</div>
				</div>
			</div>
			<div v-if="!groupRank.length && !loading" class="empty-placeholder">
				<el-empty description="暂无小组数据" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { ref, onMounted ,onUnmounted} from 'vue'
	import { ElMessage } from 'element-plus'
	import * as XLSX from 'xlsx'
	import { getCompalteScores } from '@/api/request'

	// ---------- 类型定义 ----------
	interface ScoreRecord {
		student_id : number
		student_name : string
		group_id : number
		group_name : string
		week : number
		score : number
	}

	interface StudentAgg {
		id : number
		name : string
		total : number
		group_id : number
		group_name : string
	}

	interface MemberScore {
		id : number
		name : string
		score : number
	}

	interface GroupAgg {
		id : number
		name : string
		description : string
		total : number
		avg : number
		members : MemberScore[]
	}

	// ---------- 响应式数据 ----------
	const currentClass = ref<any>(null)
	const className = ref('')
	const semesterText = ref('')
	const totalStudents = ref(0)

	const selectedWeek = ref<number>(0)      // 0 表示全部周次
	const availableWeeks = ref<number[]>([])
	const activeTab = ref<'student' | 'group'>('student')

	const studentRank = ref<StudentAgg[]>([])
	const groupRank = ref<GroupAgg[]>([])
	const loading = ref(false)

	// 本地数据（从 storage 读取）
	const localStudents = ref<any[]>([])
	const localGroups = ref<any[]>([])

	// ---------- 辅助函数 ----------
	// 加载班级信息
	const loadClassInfo = () : Promise<boolean> => {
		return new Promise((resolve) => {
			uni.getStorage({
				key: 'teacherInfo',
				success(teacherRes) {
					const teacherInfo = teacherRes.data
					const classes = teacherInfo?.classes || []
					if (!classes.length) {
						ElMessage.warning('请先在个人信息中创建或关联班级')
						resolve(false)
						return
					}
					uni.getStorage({
						key: 'currentClassId',
						success(idRes) {
							const classId = idRes.data
							const found = classes.find((c : any) => c.id == classId)
							if (found) {
								currentClass.value = found
								className.value = found.name
								let semester = found.semester
								if (!semester) {
									const month = new Date().getMonth() + 1
									semester = month >= 3 && month <= 8 ? 2 : 1
								}
								semesterText.value = semester === 1 ? '上学期' : '下学期'
								resolve(true)
							} else {
								ElMessage.error('未找到对应的班级信息')
								resolve(false)
							}
						},
						fail() {
							ElMessage.error('未找到当前班级ID，请先进入学生管理页面')
							resolve(false)
						}
					})
				},
				fail() {
					ElMessage.error('未找到教师信息，请重新登录')
					resolve(false)
				}
			})
		})
	}

	// 加载本地学生和小组数据
	const loadLocalData = () : Promise<void> => {
		return new Promise((resolve) => {
			uni.getStorage({
				key: 'student',
				success(res) {
					localStudents.value = Array.isArray(res.data.list) ? res.data.list : []
					totalStudents.value = localStudents.value.length
					uni.getStorage({
						key: 'group',
						success(groupRes) {
							localGroups.value = Array.isArray(groupRes.data) ? groupRes.data : []
							resolve()
						},
						fail() {
							localGroups.value = []
							resolve()
						}
					})
				},
				fail() {
					localStudents.value = []
					totalStudents.value = 0
					uni.getStorage({
						key: 'group',
						success(groupRes) {
							localGroups.value = Array.isArray(groupRes.data) ? groupRes.data : []
							resolve()
						},
						fail() {
							localGroups.value = []
							resolve()
						}
					})
				}
			})
		})
	}

	// 核心聚合函数：根据 selectedWeek 计算学生和小组积分
	const aggregateScores = (records : ScoreRecord[]) => {
		console.log('开始聚合，周次筛选:', selectedWeek.value)
		console.log('原始积分记录数:', records.length)

		// 1. 根据周次过滤积分记录
		let filteredRecords = records
		if (selectedWeek.value !== 0) {
			filteredRecords = records.filter(r => r.week === selectedWeek.value)
		}
		console.log('过滤后记录数:', filteredRecords.length)

		// 2. 构建学生总分映射（基于本地所有学生，初始总分为0）
		const studentMap = new Map<number, StudentAgg>()
		const students = Array.isArray(localStudents.value) ? localStudents.value : []
		students.forEach((stu : any) => {
			studentMap.set(stu.id, {
				id: stu.id,
				name: stu.name,
				total: 0,
				group_id: stu.stu_group_info_id,
				group_name: stu.group_name || ''
			})
		})
		console.log('本地学生数:', studentMap.size)

		// 3. 累加积分记录到学生
		for (const r of filteredRecords) {
			const sid = r.student_id
			if (!sid) continue
			if (studentMap.has(sid)) {
				const scoreValue = typeof r.score === 'number' ? r.score : 0
				studentMap.get(sid)!.total += scoreValue
			} else {
				// 如果本地没有该学生，但记录中有，则创建临时学生
				studentMap.set(sid, {
					id: sid,
					name: r.student_name || '未知',
					total: r.score,
					group_id: r.group_id,
					group_name: r.group_name || ''
				})
			}
		}

		// 4. 学生排名：正分（>0）降序在前，非正分（<=0）按 id 升序在后
		const studentList = Array.from(studentMap.values())
		const positiveStudents = studentList.filter(s => s.total > 0)
		const nonPositiveStudents = studentList.filter(s => s.total <= 0)
		positiveStudents.sort((a, b) => b.total - a.total)
		nonPositiveStudents.sort((a, b) => a.id - b.id)
		studentRank.value = [...positiveStudents, ...nonPositiveStudents]
		console.log('学生排名数量:', studentRank.value.length)

		// 5. 构建小组排名
		// 首先确保有小组列表：优先使用 localGroups，如果为空则从学生数据中提取 group_id 并生成默认小组
		let groups = Array.isArray(localGroups.value) ? localGroups.value : []
		if (groups.length === 0) {
			// 从学生中提取所有不同的 group_id
			const groupIdSet = new Set<number>()
			students.forEach(stu => {
				if (stu.stu_group_info_id) groupIdSet.add(stu.stu_group_info_id)
			})
			groups = Array.from(groupIdSet).map(gid => ({
				id: gid,
				name: `第${gid}组`,
				description: ''
			}))
			console.log('从学生数据生成的小组:', groups)
		}

		const groupList : GroupAgg[] = []
		for (const g of groups) {
			// 找出该小组的所有学生（从本地学生列表中筛选）
			const members : MemberScore[] = students
				.filter(stu => stu.stu_group_info_id === g.id)
				.map(stu => {
					const score = studentMap.get(stu.id)?.total ?? 0
					return { id: stu.id, name: stu.name, score }
				})
			if (members.length === 0) {
				// 没有成员的小组跳过（也可以选择展示，但无意义）
				continue
			}
			// 小组成员按个人总分降序排序（正分在前，负分在后）
			members.sort((a, b) => b.score - a.score)

			// 计算小组总分
			const total = members.reduce((sum, m) => sum + m.score, 0)
			const avg = parseFloat((total / members.length).toFixed(2))

			groupList.push({
				id: g.id,
				name: g.name,
				description: g.description || '',
				total,
				avg,
				members
			})
		}

		// 小组排名：平均分 > 0 的按平均分降序在前，平均分 <= 0 的按 id 升序在后
		const positiveAvgGroups = groupList.filter(g => g.avg > 0)
		const nonPositiveAvgGroups = groupList.filter(g => g.avg <= 0)
		positiveAvgGroups.sort((a, b) => b.avg - a.avg)
		nonPositiveAvgGroups.sort((a, b) => a.id - b.id)
		groupRank.value = [...positiveAvgGroups, ...nonPositiveAvgGroups]
		console.log('小组排名数量:', groupRank.value.length)
	}

	// 获取积分数据并计算排名
	const fetchRanks = async () => {
		if (!currentClass.value) return
		loading.value = true
		try {
			let semester = currentClass.value.semester
			if (!semester) {
				const month = new Date().getMonth() + 1
				semester = month >= 3 && month <= 8 ? 2 : 1
			}
			const params = {
				classId: currentClass.value.id,
				grade: currentClass.value.grade || '',
				semester: semester,
				week: selectedWeek.value
			}
			const res = await getCompalteScores(params)
			if (res.code !== 1) throw new Error(res.msg || '获取积分数据失败')
			const records : ScoreRecord[] = Array.isArray(res.data) ? res.data : []
			console.log('获取到的原始积分记录:', records)

			// 提取有效周次（仅当选择全部周次时更新下拉选项）
			if (selectedWeek.value === 0) {
				const weeksSet = new Set<number>()
				records.forEach(r => {
					if (r.week && typeof r.week === 'number') weeksSet.add(r.week)
				})
				availableWeeks.value = Array.from(weeksSet).sort((a, b) => a - b)
				console.log('有效周次:', availableWeeks.value)
			}

			// 聚合积分
			aggregateScores(records)
		} catch (error : any) {
			console.error(error)
			ElMessage.error(error.message || '获取排名失败')
			// 即使请求失败，也要基于本地数据展示（所有学生总分0）
			aggregateScores([])
		} finally {
			loading.value = false
		}
	}

	// 卡片样式类
	const getStudentCardClass = (idx : number) => {
		if (idx === 0) return 'rank-gold'
		if (idx === 1) return 'rank-silver'
		if (idx === 2) return 'rank-bronze'
		return ''
	}

	const getGroupCardClass = (idx : number) => {
		if (idx === 0) return 'rank-gold'
		if (idx === 1) return 'rank-silver'
		if (idx === 2) return 'rank-bronze'
		return ''
	}

	// 事件处理
	const onWeekChange = () => {
		fetchRanks()
	}

	const handleClear = () => {
		selectedWeek.value = 0
		fetchRanks()
	}

	const refreshData = () => {
		fetchRanks()
	}

	// 导出排名为 Excel
	const exportRanking = () => {
		if (activeTab.value === 'student' && !studentRank.value.length) {
			ElMessage.warning('暂无学生排名数据')
			return
		}
		if (activeTab.value === 'group' && !groupRank.value.length) {
			ElMessage.warning('暂无小组排名数据')
			return
		}

		const wb = XLSX.utils.book_new()
		const weekSuffix = selectedWeek.value === 0 ? '全部周次' : `第${selectedWeek.value}周`
		if (activeTab.value === 'student') {
			const wsData = [['排名', '姓名', '积分', '所属小组']]
			studentRank.value.forEach((stu, idx) => {
				wsData.push([idx + 1, stu.name, stu.total, stu.group_name || '未分组'])
			})
			const ws = XLSX.utils.aoa_to_sheet(wsData)
			XLSX.utils.book_append_sheet(wb, ws, `个人排名_${weekSuffix}`)
		} else {
			const wsData = [['排名', '小组名称', '小组花名', '总积分', '平均分', '成员列表（姓名:积分）']]
			groupRank.value.forEach((group, idx) => {
				const membersStr = group.members.map(m => `${m.name}:${m.score}`).join('，')
				wsData.push([
					idx + 1,
					group.name,
					group.description || '',
					group.total,
					group.avg,
					membersStr
				])
			})
			const ws = XLSX.utils.aoa_to_sheet(wsData)
			XLSX.utils.book_append_sheet(wb, ws, `小组排名_${weekSuffix}`)
		}
		XLSX.writeFile(wb, `积分排名_${className.value}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`)
		ElMessage.success('导出成功')
	}

	// 初始化
	onMounted(async () => {
		uni.$on('storage',async () => {
			await loadClassInfo()
			if (!hasClass) return
			await loadLocalData()
			await fetchRanks()
		})
		const hasClass = await loadClassInfo()
		if (!hasClass) return
		await loadLocalData()
		await fetchRanks()
	})
	onUnmounted(async () => {
		uni.$off('storage', loadClassInfo)
	})
</script>

<style scoped>
	.rank-container {
		padding: 20px;
		background: #f5f7fa;
		min-height: calc(100vh - 60px);
	}

	.class-info-card {
		margin-bottom: 20px;
		border-radius: 16px;
	}

	.class-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
	}

	.class-name {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1e293b;
	}

	.class-meta {
		color: #64748b;
		font-size: 0.9rem;
	}

	.filter-card {
		margin-bottom: 20px;
		border-radius: 12px;
	}

	.filter-bar {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
	}

	.tab-switch {
		margin-bottom: 24px;
		text-align: center;
	}

	.rank-section {
		margin-top: 16px;
	}

	.rank-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
		gap: 24px;
	}

	.rank-card {
		background: white;
		border-radius: 24px;
		padding: 20px;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
		border: 1px solid #eef2f6;
	}

	.rank-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1);
	}

	.rank-badge {
		width: 60px;
		text-align: center;
		font-size: 2rem;
		font-weight: bold;
		flex-shrink: 0;
	}

	.rank-number {
		font-size: 1.5rem;
		font-weight: 700;
		color: #94a3b8;
	}

	.medal {
		font-size: 2rem;
	}

	.rank-info {
		flex: 1;
		margin: 0 16px;
	}

	.student-name,
	.group-name {
		font-size: 1.2rem;
		font-weight: 600;
		color: #1e293b;
		margin-bottom: 6px;
	}

	.student-meta,
	.group-description {
		font-size: 0.85rem;
		color: #64748b;
		margin-bottom: 8px;
	}

	/* ========== 小组卡片优化样式 ========== */
	.group-info {
		margin: 0 16px;
	}

	.group-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.group-icon {
		font-size: 2rem;
		background: #eef2ff;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		color: #3b82f6;
	}

	.group-name {
		margin-bottom: 4px;
		font-size: 1.25rem;
	}

	.group-description {
		font-size: 0.8rem;
		color: #64748b;
	}

	/* 成员网格布局 */
	.member-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 10px;
		margin-top: 12px;
		max-height: 280px;
		overflow-y: auto;
		padding-right: 6px;
	}

	/* 自定义滚动条 */
	.member-grid::-webkit-scrollbar {
		width: 4px;
	}

	.member-grid::-webkit-scrollbar-track {
		background: #f1f5f9;
		border-radius: 4px;
	}

	.member-grid::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 4px;
	}

	.member-card {
		background: #f8fafc;
		border-radius: 12px;
		padding: 8px 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: all 0.2s;
		border: 1px solid #eef2f6;
	}

	.member-card:hover {
		background: #f1f5f9;
		transform: translateX(2px);
	}

	.member-name {
		font-weight: 500;
		color: #1e293b;
		font-size: 0.85rem;
	}

	.member-score {
		font-weight: 600;
		color: #f59e0b;
		background: #fef3c7;
		padding: 2px 8px;
		border-radius: 20px;
		font-size: 0.75rem;
	}

	/* 右侧积分统计 */
	.group-stats {
		text-align: center;
		min-width: 90px;
		background: #f8fafc;
		border-radius: 20px;
		padding: 12px 8px;
	}

	.stat-item {
		margin: 8px 0;
	}

	.stat-value {
		font-size: 1.6rem;
		font-weight: 700;
		color: #3b82f6;
		line-height: 1.2;
	}

	.stat-value.avg {
		font-size: 1.2rem;
		color: #8b5cf6;
	}

	.stat-label {
		font-size: 0.7rem;
		color: #94a3b8;
		display: block;
	}

	.stat-divider {
		height: 1px;
		background: #e2e8f0;
		margin: 8px 0;
	}

	.rank-points {
		text-align: right;
		min-width: 80px;
		flex-shrink: 0;
	}

	.points {
		font-size: 1.6rem;
		font-weight: 700;
		color: #f59e0b;
	}

	.avg-points {
		font-size: 1.2rem;
		font-weight: 600;
		color: #3b82f6;
		margin-top: 8px;
	}

	.unit {
		font-size: 0.7rem;
		color: #94a3b8;
	}

	/* 排名特殊样式 */
	.rank-gold {
		background: linear-gradient(135deg, #fff9e6 0%, #fff3d1 100%);
		border-left: 6px solid #fbbf24;
	}

	.rank-silver {
		background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
		border-left: 6px solid #9ca3af;
	}

	.rank-bronze {
		background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
		border-left: 6px solid #d97706;
	}

	.group-card .rank-points .points {
		color: #3b82f6;
	}

	.empty-placeholder {
		margin-top: 60px;
	}

	/* 响应式 */
	@media (max-width: 768px) {
		.rank-list {
			grid-template-columns: 1fr;
		}

		.rank-card {
			flex-direction: column;
			text-align: center;
		}

		.rank-info {
			margin: 12px 0;
		}

		.rank-points {
			text-align: center;
		}

		.member-grid {
			grid-template-columns: 1fr;
		}

		.group-header {
			justify-content: center;
		}
	}
</style>