<template>
	<el-dialog v-model="visible" title="积分操作" width="80%" top="5vh" :close-on-click-modal="false" class="score-dialog">
		<div class="score-dialog-header">
			<el-form inline>
				<el-form-item label="选择星期">
					<el-select v-model="dayOfWeek" placeholder="请选择星期" style="width: 120px">
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
		<div class="groups-score-container" v-loading="groupLoading">
			<el-collapse v-model="activeGroups">
				<el-collapse-item v-for="group in groupMembers" :key="group.id" :name="group.id">
					<template #title>
						<div class="group-title">
							<span>{{ group.name }} ({{ group.members.length }}人)</span>
							<div class="group-batch-buttons" @click.stop>
								<el-select v-model="batchReasonId" placeholder="选择加减分" size="small"
									style="width: 160px">
									<el-option v-for="item in reasonOptions" :key="item.id"
										:label="`${item.score}分：${item.reason}`" :value="item.id" />
								</el-select>
								<el-button type="primary" size="small" @click="submitBatchAdjust(group)">提交</el-button>
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
								<el-button type="primary" size="small" @click="openPersonalScore(row)">加减分</el-button>
							</template>
						</el-table-column>
					</el-table>
				</el-collapse-item>
			</el-collapse>
		</div>
		<template #footer>
			<el-button @click="visible = false">关闭</el-button>
		</template>

		<!-- 个人加减分子弹窗 -->
		<PersonalScoreDialog v-model="personalDialogVisible" :student="currentStudent" :class-id="classId"
			:grade="grade" :semester="semester" :week="week" :reason-options="reasonOptions"
			@success="onPersonalSuccess" />
	</el-dialog>
</template>

<script setup lang="ts">
	import { ref, computed, watch } from 'vue'
	import { ElMessage, ElMessageBox } from 'element-plus'
	import { batchAddStudentScore, getGroupsScores } from '@/api/request'
	import PersonalScoreDialog from './PersonalScoreDialog.vue'

	const props = defineProps<{
		modelValue : boolean
		classId : number
		grade : string
		semester : number
		week : number
		groupList : any[]
		students : any[]
		reasonOptions : any[]
	}>()

	const emit = defineEmits(['update:modelValue', 'refresh'])

	const visible = computed({
		get: () => props.modelValue,
		set: (val) => emit('update:modelValue', val)
	})

	const week = ref(props.week)
	const dayOfWeek = ref(1)
	const groupLoading = ref(false)
	const groupMembers = ref<any[]>([])
	const activeGroups = ref<number[]>([])
	const batchReasonId = ref<number | null>(null)

	const personalDialogVisible = ref(false)
	const currentStudent = ref<any>(null)

	const loadGroupMembers = () => {
		// 根据 props.students 和 props.groupList 构建小组及成员
		const membersMap : Record<number, any[]> = {}
		props.students.forEach(stu => {
			const gid = stu.stu_group_info_id
			if (gid) {
				if (!membersMap[gid]) membersMap[gid] = []
				membersMap[gid].push(stu)
			}
		})
		groupMembers.value = props.groupList
			.map(g => ({
				id: g.id,
				name: g.name,
				members: (membersMap[g.id] || []).sort((a, b) => (a.member_number || 0) - (b.member_number || 0))
			}))
			.filter(g => g.members.length > 0)
		activeGroups.value = groupMembers.value.map(g => g.id)
	}

	const getStudentWeekScore = (student : any) => {
		// 可调用接口获取，简化返回总积分
		return student.total_points || 0
	}

	const setTodayWeek = () => {
		const today = new Date().getDay()
		let day = today === 0 ? 7 : today
		if (day > 5) day = 1
		dayOfWeek.value = day
		ElMessage.success(`已设为周${['一', '二', '三', '四', '五'][day - 1]}`)
	}

	const submitBatchAdjust = async (group : any) => {
		if (!batchReasonId.value) {
			ElMessage.warning('请选择加减分项')
			return
		}
		const selectedReason = props.reasonOptions.find(r => r.id === batchReasonId.value)
		if (!selectedReason) return

		const delta = selectedReason.score
		const reasonText = selectedReason.reason
		const members = group.members
		if (members.length === 0) {
			ElMessage.warning('该小组暂无成员')
			return
		}

		try {
			await ElMessageBox.confirm(`确定为小组【${group.name}】所有成员 ${delta > 0 ? '+' : ''}${delta} 分，原因：${reasonText}？`, '确认操作', { type: 'warning' })
		} catch {
			return
		}

		const records = members.map((stu : any) => ({
			studentId: stu.id,
			classId: props.classId,
			grade: props.grade,
			semester: props.semester,
			week: week.value,
			dayOfWeek: dayOfWeek.value,
			score: delta,
			reason: reasonText
		}))

		try {
			const res = await batchAddStudentScore({ records })
			if (res.code === 1) {
				ElMessage.success(`已为小组 ${group.name} 所有成员 ${delta > 0 ? '+' : ''}${delta} 分`)
				emit('refresh')
				loadGroupMembers()
				batchReasonId.value = null
			} else {
				ElMessage.error(res.msg || '操作失败')
			}
		} catch (error) {
			ElMessage.error('提交失败')
		}
	}

	const openPersonalScore = (student : any) => {
		currentStudent.value = student
		personalDialogVisible.value = true
	}

	const onPersonalSuccess = () => {
		emit('refresh')
		loadGroupMembers()
	}

	watch(() => props.modelValue, (val) => {
		if (val) {
			loadGroupMembers()
		}
	})
</script>

<style scoped>
	.score-dialog :deep(.el-dialog__body) {
		padding: 20px;
		max-height: 70vh;
		overflow-y: auto;
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
</style>