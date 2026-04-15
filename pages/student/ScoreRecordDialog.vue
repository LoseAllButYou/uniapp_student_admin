<template>
	<el-dialog v-model="visible" title="积分记录查看" width="85%" top="5vh" :close-on-click-modal="false">
		<div class="toolbar">
			<div class="group-by-select">
				<span>归类方式：</span>
				<el-select v-model="groupByType" placeholder="请选择归类方式" style="width: 220px"
					@change="handleGroupByChange">
					<el-option label="按顺序展示（默认）" value="default" />
					<el-option label="按学生归类" value="student" />
					<el-option label="按小组归类" value="group" />
					<el-option label="按周次归类" value="week" />
				</el-select>
			</div>
			<div class="search-box">
				<el-input v-model="searchText" placeholder="搜索学生、小组、原因..." clearable @input="handleSearch"
					style="width: 240px" />
			</div>
		</div>

		<!-- 树形展示积分记录 -->
		<div class="tree-container" v-loading="loading">
			<el-tree ref="treeRef" :data="treeData" :props="treeProps" show-checkbox node-key="id" default-expand-all
				:filter-node-method="filterNode" @check="handleCheckChange">
				<template #default="{ node, data }">
					<span :class="{ 'record-node': data.isRecord }">
						<span v-if="!data.isRecord">{{ node.label }}</span>
						<span v-else>
							<span>{{ data.student_name }} · {{ data.score > 0 ? '+' : '' }}{{ data.score }}分 ·
								{{ data.reason }}</span>
							<span
								style="color: #909399; font-size: 12px; margin-left: 12px;">{{ data.create_time }}</span>
						</span>
					</span>
				</template>
			</el-tree>
			<el-empty v-if="treeData.length === 0 && !loading" description="暂无积分记录" />
		</div>

		<template #footer>
			<el-button type="danger" :disabled="selectedRecordIds.length === 0"
				@click="batchDeleteRecords">撤销选中记录</el-button>
			<el-button @click="visible = false">关闭</el-button>
		</template>
	</el-dialog>
</template>

<script setup lang="ts">
	import { ref, computed, watch, onMounted } from 'vue'
	import { ElMessage, ElMessageBox } from 'element-plus'
	import { getAllClassScoresList, batchDeleteScoreRecords } from '@/api/request'

	const props = defineProps<{
		modelValue : boolean
		classId : number
	}>()

	const emit = defineEmits(['update:modelValue'])

	const visible = computed({
		get: () => props.modelValue,
		set: (val) => emit('update:modelValue', val)
	})

	// ---------- 数据 ----------
	const teacherName = ref('')
	const groupList = ref<any[]>([])
	const allStudents = ref<any[]>([])
	const studentMap = ref<Map<number, any>>(new Map())
	const rawRecords = ref<any[]>([])
	const fullRecords = ref<any[]>([])
	const loading = ref(false)

	// 归类方式（仅保留四种）
	const groupByType = ref<'default' | 'student' | 'group' | 'week'>('default')

	// 搜索文本
	const searchText = ref('')
	const treeRef = ref()

	// 树形配置
	const treeProps = {
		children: 'children',
		label: 'label'
	}

	// 当前选中的记录ID列表（仅叶子节点）
	const selectedRecordIds = ref<number[]>([])

	// ---------- 辅助函数 ----------
	const loadLocalData = async () => {
		const teacherInfo = uni.getStorageSync('teacherInfo')
		if (teacherInfo?.name) teacherName.value = teacherInfo.name

		const groupStorage = uni.getStorageSync('group')
		groupList.value = Array.isArray(groupStorage) ? groupStorage : []

		const studentStorage = uni.getStorageSync('student')
		const students = studentStorage?.list || []
		allStudents.value = students
		students.forEach((s : any) => {
			const group = groupList.value.find(g => g.id === s.stu_group_info_id)
			studentMap.value.set(s.id, {
				name: s.name,
				group_id: s.stu_group_info_id,
				group_name: group?.name || s.group_name || `第${s.stu_group_info_id}组`,
				member_number: s.member_number || ''
			})
		})
	}

	const combineRecords = () => {
		const combined : any[] = []
		for (const record of rawRecords.value) {
			const student = studentMap.value.get(record.student_id)
			if (!student) continue
			combined.push({
				...record,
				student_name: student.name,
				group_id: student.group_id,
				group_name: student.group_name,
				member_number: student.member_number,
				teacher_name: record.teacher_name || teacherName.value || '系统',
				score: record.score,
				reason: record.reason,
				week: record.week,
				day_of_week: record.day_of_week,
				create_time: record.create_time,
				_id: record.id,
				// 树节点唯一标识
				id: `record_${record.id}`
			})
		}
		combined.sort((a, b) => (b._id || 0) - (a._id || 0))
		fullRecords.value = combined
	}

	// 生成树形数据（仅四种归类方式）
	const treeData = computed(() => {
		const records = fullRecords.value
		if (records.length === 0) return []

		// 辅助：生成分组节点
		const createGroupNode = (label : string, children : any[]) => ({
			id: `group_${label.replace(/\s/g, '_')}`,
			label,
			children,
			isGroup: true
		})

		const createRecordNode = (record : any) => ({
			id: record.id,
			label: `${record.student_name} ${record.score > 0 ? '+' : ''}${record.score}分 ${record.reason}`,
			isRecord: true,
			...record
		})

		let rootNodes : any[] = []

		switch (groupByType.value) {
			case 'default': {
				const recordNodes = records.map(r => createRecordNode(r))
				rootNodes = [createGroupNode('全部记录', recordNodes)]
				break
			}
			case 'student': {
				const groupMap = new Map<number, any[]>()
				records.forEach(r => {
					const key = r.student_id
					if (!groupMap.has(key)) groupMap.set(key, [])
					groupMap.get(key)!.push(r)
				})
				rootNodes = Array.from(groupMap.entries()).map(([_, items]) => {
					const recordNodes = items.map(r => createRecordNode(r))
					return createGroupNode(`学生：${items[0].student_name}`, recordNodes)
				})
				break
			}
			case 'group': {
				const groupMap = new Map<number, any[]>()
				records.forEach(r => {
					const key = r.group_id
					if (!groupMap.has(key)) groupMap.set(key, [])
					groupMap.get(key)!.push(r)
				})
				rootNodes = Array.from(groupMap.entries()).map(([_, items]) => {
					const recordNodes = items.map(r => createRecordNode(r))
					return createGroupNode(`小组：${items[0].group_name}`, recordNodes)
				})
				break
			}
			case 'week': {
				const weekMap = new Map<number, any[]>()
				records.forEach(r => {
					const key = r.week
					if (!weekMap.has(key)) weekMap.set(key, [])
					weekMap.get(key)!.push(r)
				})
				const sortedWeeks = Array.from(weekMap.keys()).sort((a, b) => b - a)
				rootNodes = sortedWeeks.map(week => {
					const items = weekMap.get(week)!
					const recordNodes = items.map(r => createRecordNode(r))
					return createGroupNode(`第${week}周`, recordNodes)
				})
				break
			}
			default:
				rootNodes = []
		}

		return rootNodes
	})

	// 搜索过滤节点（匹配分组label或记录中的学生姓名、小组、原因）
	const filterNode = (value : string, data : any) => {
		if (!value) return true
		const lowerValue = value.toLowerCase()
		if (data.isRecord) {
			const matchText = `${data.student_name} ${data.group_name} ${data.reason} ${data.score}`.toLowerCase()
			return matchText.includes(lowerValue)
		} else {
			return data.label.toLowerCase().includes(lowerValue)
		}
	}

	const handleSearch = () => {
		treeRef.value?.filter(searchText.value)
	}

	// 获取所有选中的叶子节点（记录节点）的ID
	const updateSelectedRecordIds = () => {
		const checkedNodes = treeRef.value?.getCheckedNodes(false, false) || []
		const recordIds = checkedNodes
			.filter((node : any) => node.isRecord && node._id)
			.map((node : any) => node._id)
		selectedRecordIds.value = recordIds
	}

	const handleCheckChange = () => {
		updateSelectedRecordIds()
	}

	// 批量伪删除
	const batchDeleteRecords = async () => {
		if (selectedRecordIds.value.length === 0) return
		try {
			await ElMessageBox.confirm(`确定撤销选中的 ${selectedRecordIds.value.length} 条积分记录吗？`, '提示', { type: 'warning' })
		} catch {
			return
		}
		loading.value = true
		try {
			const res = await batchDeleteScoreRecords({ ids: selectedRecordIds.value })
			if (res.code === 1) {
				ElMessage.success(`成功撤销 ${selectedRecordIds.value.length} 条记录`)
				await fetchRecords()
				selectedRecordIds.value = []
				treeRef.value?.setCheckedKeys([])
			} else {
				ElMessage.error(res.msg || '撤销失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		} finally {
			loading.value = false
		}
	}

	// 获取积分记录
	const fetchRecords = async () => {
		if (!props.classId) return
		loading.value = true
		try {
			const res = await getAllClassScoresList({ classId: props.classId })
			if (res.code === 1) {
				rawRecords.value = res.data || []
				combineRecords()
			} else {
				ElMessage.error(res.msg || '获取积分记录失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		} finally {
			loading.value = false
		}
	}

	const handleGroupByChange = () => {
		searchText.value = ''
		if (treeRef.value) {
			treeRef.value.filter('')
			treeRef.value.setCheckedKeys([])
		}
		selectedRecordIds.value = []
	}

	watch(() => props.modelValue, async (val) => {
		if (val) {
			await loadLocalData()
			await fetchRecords()
			selectedRecordIds.value = []
			if (treeRef.value) treeRef.value.setCheckedKeys([])
		}
	})

	onMounted(() => {
		loadLocalData()
	})
</script>

<style scoped>
	.toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		gap: 16px;
		flex-wrap: wrap;
	}

	.group-by-select {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.search-box {
		margin-left: auto;
	}

	.tree-container {
		max-height: 60vh;
		overflow-y: auto;
		border: 1px solid #ebeef5;
		border-radius: 8px;
		padding: 12px;
	}

	.record-node {
		font-size: 13px;
	}
</style>