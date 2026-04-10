<template>
	<div class="reward-container">
		<!-- 班级信息卡片 -->
		<el-card class="class-info-card" shadow="never">
			<div class="class-header">
				<div class="class-name">{{ className }}</div>
				<div class="class-meta">{{ semesterText }} · 共 {{ totalStudents }} 名学生</div>
				<el-button type="primary" plain @click="openRewardManager">
					<el-icon>
						<Setting />
					</el-icon> 商品管理
				</el-button>
			</div>
		</el-card>

		<!-- 筛选栏 -->
		<el-card class="filter-card" shadow="never">
			<div class="filter-bar">
				<el-select v-model="selectedWeek" placeholder="选择周次" style="width: 160px" clearable
					:disabled="!availableWeeks.length" @change="onWeekChange">
					<el-option label="全部周次" :value="0" />
					<el-option v-for="w in availableWeeks" :key="w" :label="`第${w}周`" :value="w" />
				</el-select>
				<el-button type="primary" @click="refreshData" :loading="loading">刷新</el-button>
				<el-button type="success" plain @click="openExchangeRecordDialog">兑换记录管理</el-button>
			</div>
		</el-card>

		<!-- 奖品网格 -->
		<div v-loading="loading" class="reward-grid">
			<el-card v-for="item in rewardList" :key="item.id" class="reward-item" shadow="hover">
				<img :src="item.image || defaultImage" class="reward-image" @error="handleImageError" />
				<div class="reward-name">{{ item.name }}</div>
				<div class="reward-type">
					<el-tag :type="getTypeTagType(item.type)" size="small">{{ getTypeName(item.type) }}</el-tag>
				</div>
				<div class="reward-points">{{ item.points }} 积分</div>
				<div class="reward-stock">库存：{{ item.stock }}</div>

				<!-- 根据类型显示不同按钮 -->
				<el-button v-if="item.type === 1 || item.type === 2" type="primary" size="small"
					@click="openExchangeDialog(item)">
					兑换
				</el-button>
				<el-button v-else-if="item.type === 3 || item.type === 4" type="success" size="small"
					@click="openGrantDialog(item)">
					发放
				</el-button>
			</el-card>
			<el-empty v-if="rewardList.length === 0 && !loading" description="暂无奖品" />
		</div>

		<!-- 兑换弹窗（类型1、2） -->
		<el-dialog v-model="exchangeDialog.visible" :title="exchangeDialog.title" width="800px" top="5vh"
			:close-on-click-modal="false">
			<div class="exchange-dialog-content">
				<!-- 周次选择（仅周奖类型显示） -->
				<div v-if="exchangeDialog.reward?.type === 2" class="week-selector">
					<el-select v-model="exchangeWeek" placeholder="选择周次" style="width: 200px"
						@change="refreshEligibleStudents">
						<el-option v-for="w in availableWeeks" :key="w" :label="`第${w}周`" :value="w" />
					</el-select>
					<el-alert title="提示：仅显示当周积分满足条件的学生" type="info" :closable="false" show-icon />
				</div>

				<!-- 学生列表（支持多选） -->
				<div class="eligible-list">
					<div class="list-header">
						<el-checkbox :model-value="isAllSelected" @change="toggleSelectAll" />
						<span>学生姓名</span>
						<span>{{ exchangeDialog.reward?.type === 2 ? '当周积分' : '当前总积分' }}</span>
					</div>
					<div v-for="student in eligibleStudents" :key="student.id" class="list-item">
						<el-checkbox v-model="selectedStudentIds" :value="student.id" />
						<span class="item-name">{{ student.name }}</span>
						<span class="item-points">{{ student.currentPoints }} 分</span>
					</div>
					<el-empty v-if="eligibleStudents.length === 0 && !eligibleLoading" description="暂无满足条件的学生" />
				</div>

				<div class="exchange-summary" v-if="selectedStudentIds.length > 0">
					<el-alert
						:title="`已选择 ${selectedStudentIds.length} 名学生，共需消耗 ${selectedStudentIds.length * (exchangeDialog.reward?.points || 0)} 积分`"
						type="info" />
				</div>
			</div>
			<template #footer>
				<el-button @click="exchangeDialog.visible = false">取消</el-button>
				<el-button type="primary" :loading="exchangeLoading" @click="submitExchange"
					:disabled="selectedStudentIds.length === 0">
					确认兑换 ({{ selectedStudentIds.length }})
				</el-button>
			</template>
		</el-dialog>

		<!-- 小组发放弹窗（类型3、4） -->
		<el-dialog v-model="grantDialog.visible" :title="grantDialog.title" width="900px" top="5vh">
			<div class="grant-dialog-content">
				<!-- 周次选择（仅周奖类型显示） -->
				<div v-if="grantDialog.reward?.type === 4" class="week-selector">
					<el-select v-model="grantWeek" placeholder="选择周次" style="width: 200px" @change="refreshGroupRank">
						<el-option v-for="w in availableWeeks" :key="w" :label="`第${w}周`" :value="w" />
					</el-select>
				</div>

				<!-- 小组排名列表 -->
				<div class="group-rank-list" v-loading="groupRankLoading">
					<div class="list-header">
						<span>排名</span>
						<span>小组名称</span>
						<span>{{ grantDialog.reward?.type === 4 ? '当周总分' : '总积分' }}</span>
						<span>平均分</span>
						<span>发放数量</span>
					</div>
					<div v-for="(group, idx) in groupRankList" :key="group.id" class="list-item">
						<span class="rank-badge">
							<span v-if="idx === 0" class="medal">🥇</span>
							<span v-else-if="idx === 1" class="medal">🥈</span>
							<span v-else-if="idx === 2" class="medal">🥉</span>
							<span v-else>{{ idx + 1 }}</span>
						</span>
						<span class="group-name">{{ group.name }}</span>
						<span class="group-points">{{ group.total }} 分</span>
						<span class="group-avg">{{ group.avg }} 分</span>
						<span class="grant-quantity">
							<el-tag :type="getQuantityTagType(getGrantQuantity(idx))" size="small">
								{{ getGrantQuantity(idx) }} 份
							</el-tag>
						</span>
					</div>
				</div>

				<div class="grant-summary">
					<el-alert :title="`本次发放共需消耗 ${totalGrantQuantity} 份库存，当前商品库存：${grantDialog.reward?.stock || 0}`"
						:type="totalGrantQuantity <= (grantDialog.reward?.stock || 0) ? 'success' : 'error'" />
				</div>
			</div>
			<template #footer>
				<el-button @click="grantDialog.visible = false">取消</el-button>
				<el-button type="primary" :loading="grantLoading" @click="submitGrant"
					:disabled="totalGrantQuantity === 0 || totalGrantQuantity > (grantDialog.reward?.stock || 0)">
					确认发放
				</el-button>
			</template>
		</el-dialog>

		<!-- 兑换记录管理弹窗 -->
		<el-dialog v-model="exchangeRecordDialog.visible" title="兑换记录管理" width="90%" top="5vh">
			<el-table :data="exchangeRecordList" stripe v-loading="recordLoading" border>
				<el-table-column prop="reward_name" label="奖品名称" width="150" />
				<el-table-column prop="reward_type" label="奖品类型" width="120" :formatter="formatType" />
				<el-table-column prop="target_type" label="对象类型" width="100">
					<template #default="{ row }">
						<el-tag :type="row.target_type === 'student' ? 'success' : 'primary'" size="small">
							{{ row.target_type === 'student' ? '学生' : '小组' }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="target_name" label="对象名称" width="120" />
				<el-table-column prop="points" label="消耗积分" width="100" />
				<el-table-column prop="week" label="周次" width="80" />
				<el-table-column prop="exchange_time" label="兑换时间" width="180" />
				<el-table-column prop="status" label="状态" width="120">
					<template #default="{ row }">
						<el-tag :type="row.status === 1 ? 'success' : 'warning'">
							{{ row.status === 1 ? '已发放' : '待处理' }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="操作" width="120" fixed="right">
					<template #default="{ row }">
						<el-button v-if="row.status === 2" type="primary" size="small"
							@click="updateExchangeStatus(row)">
							{{ row.reward_type === 1 || row.reward_type === 2 ? '发放' : '使用' }}
						</el-button>
						<span v-else class="done-text">已完成</span>
					</template>
				</el-table-column>
			</el-table>
			<template #footer>
				<el-button @click="exchangeRecordDialog.visible = false">关闭</el-button>
			</template>
		</el-dialog>

		<!-- 商品管理大弹窗 -->
		<el-dialog v-model="rewardManagerVisible" title="商品管理" width="90%" top="5vh" :close-on-click-modal="false">
			<RewardManager ref="rewardManagerRef" :classId="currentClass?.id" @refresh="onRewardManagerRefresh" />
			<template #footer>
				<el-button @click="rewardManagerVisible = false">关闭</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
	import { ref, onMounted, computed ,onUnmounted} from 'vue'
	import { ElMessage, ElMessageBox } from 'element-plus'
	import { Setting } from '@element-plus/icons-vue'
	import { getRewardList, batchExchange, batchGrantGroup, getExchangeList, updateExchangeStatus as updateStatus } from '@/api/request'
	import RewardManager from './rewardManage'
	import { useClassData } from '@/api/useClassData'
	import { useScoreCalculator } from '@/api/useScoreCalculator'

	// ---------- 复用 composables ----------
	const { currentClass, className, semesterText, totalStudents, localStudents, localGroups, loadClassInfo, loadLocalData } = useClassData()
	const {
		fetchScoreRecords,
		calculateStudentTotalScores,
		calculateStudentWeekScores,
		getGroupTotalRank,
		getGroupWeekRank
	} = useScoreCalculator()

	// ---------- 响应式数据 ----------
	const defaultImage = '/static/reward-default.png'
	const selectedWeek = ref<number>(0)
	const availableWeeks = ref<number[]>([])
	const rewardList = ref<any[]>([])
	const loading = ref(false)

	// 积分相关数据
	const studentTotalScores = ref<any[]>([])
	const studentWeekScores = ref<any[]>([])

	// 兑换弹窗（类型1、2）
	const exchangeDialog = ref({
		visible: false,
		title: '',
		reward: null as any
	})
	const exchangeWeek = ref<number>(0)
	const eligibleStudents = ref<any[]>([])
	const selectedStudentIds = ref<number[]>([])
	const eligibleLoading = ref(false)
	const exchangeLoading = ref(false)

	// 发放弹窗（类型3、4）
	const grantDialog = ref({
		visible: false,
		title: '',
		reward: null as any
	})
	const grantWeek = ref<number>(0)
	const groupRankList = ref<any[]>([])
	const groupRankLoading = ref(false)
	const grantLoading = ref(false)

	// 兑换记录
	const exchangeRecordDialog = ref({ visible: false })
	const exchangeRecordList = ref<any[]>([])
	const recordLoading = ref(false)

	// 商品管理
	const rewardManagerVisible = ref(false)
	const rewardManagerRef = ref()

	// ---------- 辅助函数 ----------
	const getTypeName = (type : number) => {
		const map : Record<number, string> = { 1: '学生奖励', 2: '学生周奖', 3: '小组奖励', 4: '小组周奖' }
		return map[type] || '未知'
	}

	const getTypeTagType = (type : number) => {
		const map : Record<number, string> = { 1: 'success', 2: 'warning', 3: 'primary', 4: 'info' }
		return map[type] || ''
	}

	const getQuantityTagType = (quantity : number) => {
		if (quantity >= 5) return 'danger'
		if (quantity >= 3) return 'warning'
		return 'info'
	}

	const handleImageError = (e : Event) => {
		(e.target as HTMLImageElement).src = defaultImage
	}

	// 获取发放数量（根据排名）
	const getGrantQuantity = (rank : number) : number => {
		if (rank === 0) return 5
		if (rank === 1) return 4
		if (rank === 2) return 3
		return 1
	}

	const totalGrantQuantity = computed(() => {
		return groupRankList.value.reduce((sum, _, idx) => sum + getGrantQuantity(idx), 0)
	})

	// 刷新兑换学生列表
	const refreshEligibleStudents = async () => {
		const reward = exchangeDialog.value.reward
		if (!reward) return

		eligibleLoading.value = true
		try {
			let list : any[] = []
			const requiredPoints = reward.points

			if (reward.type === 1) {
				// 学生总积分筛选
				list = studentTotalScores.value
					.filter(s => s.total >= requiredPoints)
					.map(s => ({ id: s.id, name: s.name, currentPoints: s.total }))
			} else if (reward.type === 2) {
				// 学生周积分筛选
				if (!exchangeWeek.value) {
					ElMessage.warning('请选择周次')
					return
				}
				// 重新获取当周积分
				const records = await fetchScoreRecords(currentClass.value!.id, currentClass.value!.grade || '',
					currentClass.value!.semester || 1, exchangeWeek.value)
				const weekScores = calculateStudentWeekScores(records, exchangeWeek.value, localStudents.value)
				list = weekScores
					.filter(s => s.total >= requiredPoints)
					.map(s => ({ id: s.id, name: s.name, currentPoints: s.total }))
			}

			list.sort((a, b) => b.currentPoints - a.currentPoints)
			eligibleStudents.value = list
			selectedStudentIds.value = []
		} catch (error) {
			console.error(error)
			ElMessage.error('获取学生列表失败')
		} finally {
			eligibleLoading.value = false
		}
	}

	// 刷新小组排名
	const refreshGroupRank = async () => {
		const reward = grantDialog.value.reward
		if (!reward || !currentClass.value) return

		groupRankLoading.value = true
		try {
			const semester = currentClass.value.semester || 1
			const grade = currentClass.value.grade || ''

			if (reward.type === 3) {
				// 小组总积分排名
				groupRankList.value = await getGroupTotalRank(
					currentClass.value.id, grade, semester,
					localStudents.value, localGroups.value
				)
			} else if (reward.type === 4) {
				// 小组周积分排名
				if (!grantWeek.value) {
					ElMessage.warning('请选择周次')
					return
				}
				groupRankList.value = await getGroupWeekRank(
					currentClass.value.id, grade, semester, grantWeek.value,
					localStudents.value, localGroups.value
				)
			}
		} catch (error) {
			console.error(error)
			ElMessage.error('获取小组排名失败')
		} finally {
			groupRankLoading.value = false
		}
	}

	// 打开兑换弹窗（类型1、2）
	const openExchangeDialog = async (reward : any) => {
		if (reward.stock <= 0) {
			ElMessage.warning('该奖品库存不足')
			return
		}
		exchangeDialog.value = {
			visible: true,
			title: `兑换 ${reward.name}`,
			reward
		}
		exchangeWeek.value = availableWeeks.value.length ? availableWeeks.value[availableWeeks.value.length - 1] : 0
		await refreshEligibleStudents()
	}

	// 提交兑换
	const submitExchange = async () => {
		const reward = exchangeDialog.value.reward
		if (!reward) return
		if (selectedStudentIds.value.length === 0) {
			ElMessage.warning('请至少选择一名学生')
			return
		}
		if (selectedStudentIds.value.length > reward.stock) {
			ElMessage.error(`库存不足，当前库存仅剩 ${reward.stock} 份`)
			return
		}

		try {
			await ElMessageBox.confirm(
				`确定消耗 ${selectedStudentIds.value.length * reward.points} 积分兑换 ${selectedStudentIds.value.length} 份“${reward.name}”吗？`,
				'确认兑换',
				{ type: 'warning' }
			)
		} catch {
			return
		}

		exchangeLoading.value = true
		try {
			const exchanges = selectedStudentIds.value.map(studentId => ({
				reward_id: reward.id,
				target_id: studentId,
				class_id:currentClass.value.id,
				target_type: 'student',
				week: reward.type === 2 ? exchangeWeek.value : null,
				points: reward.points
			}))

			const res = await batchExchange({ exchanges })
			if (res.code === 1) {
				ElMessage.success(`成功兑换 ${selectedStudentIds.value.length} 份奖品`)
				exchangeDialog.value.visible = false
				await refreshData()
			} else {
				ElMessage.error(res.msg || '兑换失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		} finally {
			exchangeLoading.value = false
		}
	}

	// 打开发放弹窗（类型3、4）
	const openGrantDialog = async (reward : any) => {
		if (reward.stock <= 0) {
			ElMessage.warning('该奖品库存不足')
			return
		}
		grantDialog.value = {
			visible: true,
			title: `发放 ${reward.name}`,
			reward
		}
		grantWeek.value = availableWeeks.value.length ? availableWeeks.value[availableWeeks.value.length - 1] : 0
		await refreshGroupRank()
	}

	// 提交发放
	const submitGrant = async () => {
		const reward = grantDialog.value.reward
		if (!reward) return
		if (totalGrantQuantity.value > reward.stock) {
			ElMessage.error(`库存不足，本次发放需要 ${totalGrantQuantity.value} 份，当前库存 ${reward.stock} 份`)
			return
		}

		try {
			await ElMessageBox.confirm(
				`确定按照排名发放 ${totalGrantQuantity.value} 份“${reward.name}”吗？\n第一名：5份，第二名：4份，第三名：3份，其他：1份`,
				'确认发放',
				{ type: 'warning' }
			)
		} catch {
			return
		}

		grantLoading.value = true
		try {
			const grants = groupRankList.value.map((group, idx) => ({
				reward_id: reward.id,
				group_id: group.id,
				class_id:currentClass.value.id,
				quantity: getGrantQuantity(idx),
				week: reward.type === 4 ? grantWeek.value : null,
				points: reward.points
			}))

			const res = await batchGrantGroup({ grants })
			if (res.code === 1) {
				ElMessage.success(`成功发放 ${totalGrantQuantity.value} 份奖品`)
				grantDialog.value.visible = false
				await refreshData()
			} else {
				ElMessage.error(res.msg || '发放失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		} finally {
			grantLoading.value = false
		}
	}

	// 打开兑换记录管理
	const openExchangeRecordDialog = async () => {
		recordLoading.value = true
		try {
			const res = await getExchangeList({ class_id: currentClass.value?.id })
			if (res.code === 1) {
				exchangeRecordList.value = res.data
				exchangeRecordDialog.value.visible = true
			} else {
				ElMessage.error(res.msg || '获取记录失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		} finally {
			recordLoading.value = false
		}
	}

	// 更新兑换记录状态
	const updateExchangeStatus = async (row : any) => {
		try {
			await ElMessageBox.confirm(`确定将“${row.reward_name}”标记为已发放吗？`, '确认', { type: 'info' })
		} catch {
			return
		}
		try {
			const res = await updateStatus({ id: row.id, status: 1 })
			if (res.code === 1) {
				ElMessage.success('状态更新成功')
				await openExchangeRecordDialog()
			} else {
				ElMessage.error(res.msg || '更新失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		}
	}

	const formatType = (row : any) => getTypeName(row.reward_type)

	const onWeekChange = () => {
		refreshData()
	}

	const refreshData = async () => {
		if (!currentClass.value) return
		loading.value = true
		try {
			// 刷新积分数据
			const semester = currentClass.value.semester || 1
			const grade = currentClass.value.grade || ''
			const records = await fetchScoreRecords(currentClass.value.id, grade, semester, 0)
			studentTotalScores.value = calculateStudentTotalScores(records, localStudents.value)

			// 提取有效周次
			const weeksSet = new Set<number>()
			records.forEach(r => {
				if (r.week && typeof r.week === 'number') weeksSet.add(r.week)
			})
			availableWeeks.value = Array.from(weeksSet).sort((a, b) => a - b)

			// 刷新奖品列表
			const rewardRes = await getRewardList({ class_id: currentClass.value.id })
			if (rewardRes.code === 1) {
				rewardList.value = rewardRes.data.filter((item : any) => item.status === 1)
			}
		} catch (error) {
			console.error(error)
		} finally {
			loading.value = false
		}
	}

	const openRewardManager = () => {
		if (!currentClass.value?.id) {
			ElMessage.warning('请先选择班级')
			return
		}
		rewardManagerVisible.value = true
	}

	const onRewardManagerRefresh = () => {
		refreshData()
	}

	// 全选逻辑
	const isAllSelected = computed(() => {
		return eligibleStudents.value.length > 0 && selectedStudentIds.value.length === eligibleStudents.value.length
	})

	const toggleSelectAll = (checked : boolean) => {
		if (checked) {
			selectedStudentIds.value = eligibleStudents.value.map(s => s.id)
		} else {
			selectedStudentIds.value = []
		}
	}

	// 初始化
	onMounted(async () => {
		// 监听 storage 变化事件（班级切换时重新加载）
		uni.$on('storage',async ()=>{
			await loadClassInfo()
			await loadLocalData()
		})
		const hasClass = await loadClassInfo()
		if (!hasClass) return
		const isValid = await loadLocalData()
		if (isValid) {
			await refreshData()
		}
	})
	
	onUnmounted(() => {
		uni.$off('storage')
	})
</script>

<style scoped>
	.reward-container {
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
		gap: 12px;
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

	.reward-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 20px;
	}

	.reward-item {
		text-align: center;
		cursor: pointer;
		transition: transform 0.2s;
	}

	.reward-item:hover {
		transform: translateY(-5px);
	}

	.reward-image {
		width: 100%;
		height: 160px;
		object-fit: cover;
		border-radius: 12px;
	}

	.reward-name {
		font-weight: bold;
		font-size: 1.1rem;
		margin: 12px 0 6px;
	}

	.reward-type {
		margin-bottom: 8px;
	}

	.reward-points {
		color: #f59e0b;
		font-weight: 600;
		margin-bottom: 4px;
	}

	.reward-stock {
		font-size: 12px;
		color: #909399;
		margin-bottom: 12px;
	}

	.exchange-dialog-content,
	.grant-dialog-content {
		max-height: 60vh;
		overflow-y: auto;
	}

	.week-selector {
		display: flex;
		gap: 16px;
		align-items: center;
		margin-bottom: 20px;
		flex-wrap: wrap;
	}

	.eligible-list {
		margin-top: 16px;
	}

	.list-header {
		display: grid;
		grid-template-columns: 40px 2fr 1fr;
		padding: 12px 0;
		font-weight: bold;
		border-bottom: 1px solid #eef2f6;
	}

	.list-item {
		display: grid;
		grid-template-columns: 40px 2fr 1fr;
		align-items: center;
		padding: 12px 0;
		border-bottom: 1px solid #f0f2f5;
	}

	.item-name {
		font-weight: 500;
	}

	.item-points {
		color: #f59e0b;
		font-weight: 500;
	}

	.group-rank-list {
		margin-top: 16px;
	}

	.group-rank-list .list-header {
		display: grid;
		grid-template-columns: 60px 2fr 1fr 1fr 100px;
	}

	.group-rank-list .list-item {
		display: grid;
		grid-template-columns: 60px 2fr 1fr 1fr 100px;
		align-items: center;
		padding: 12px 0;
	}

	.rank-badge {
		font-size: 1.2rem;
		font-weight: bold;
	}

	.medal {
		font-size: 1.3rem;
	}

	.group-name {
		font-weight: 500;
	}

	.group-points,
	.group-avg {
		color: #f59e0b;
	}

	.grant-quantity {
		text-align: center;
	}

	.exchange-summary,
	.grant-summary {
		margin-top: 20px;
		padding: 12px;
		background: #f0f9ff;
		border-radius: 8px;
	}

	.done-text {
		color: #909399;
		font-size: 12px;
	}

	@media (max-width: 768px) {
		.reward-grid {
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		}

		.list-header,
		.list-item {
			font-size: 12px;
		}

		.group-rank-list .list-header,
		.group-rank-list .list-item {
			grid-template-columns: 40px 1.5fr 0.8fr 0.8fr 60px;
		}
	}
</style>