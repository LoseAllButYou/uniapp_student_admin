<template>
	<el-dialog v-model="visible" title="小组花名设置" width="600px">
		<el-form label-width="160px">
			<div v-for="group in editableGroups" :key="group.id" class="group-naming-item">
				<el-form-item :label="`${group.name}（编号${group.code}）`">
					<el-input v-model="group.description" placeholder="请输入小组花名（如：星辰组）" clearable />
				</el-form-item>
			</div>
		</el-form>
		<template #footer>
			<el-button @click="visible = false">取消</el-button>
			<el-button type="primary" :loading="loading" @click="submit">保存</el-button>
		</template>
	</el-dialog>
</template>

<script setup lang="ts">
	import { ref, computed, watch } from 'vue'
	import { ElMessage } from 'element-plus'
	import { updateGroup, getGroupList } from '@/api/request'

	const props = defineProps<{
		modelValue : boolean
		groups : any[]
		classId : number
	}>()

	const emit = defineEmits(['update:modelValue', 'success'])

	const visible = computed({
		get: () => props.modelValue,
		set: (val) => emit('update:modelValue', val)
	})

	const editableGroups = ref<any[]>([])
	const loading = ref(false)

	watch(() => props.groups, (newGroups) => {
		editableGroups.value = newGroups.map(g => ({ ...g, description: g.description || '' }))
	}, { immediate: true })

	const submit = async () => {
		loading.value = true
		try {
			const promises = editableGroups.value.map(group => {
				const original = props.groups.find(g => g.id === group.id)
				if (original && original.description === group.description) return Promise.resolve(null)
				return updateGroup({ id: group.id, description: group.description })
			})
			const results = await Promise.allSettled(promises)
			const succeeded = results.filter(r => r.status === 'fulfilled' && r.value !== null && r.value?.code === 1).length
			if (succeeded > 0) {
				ElMessage.success(`成功更新 ${succeeded} 个小组的花名`)
				// 刷新小组列表
				const res = await getGroupList({ class_id: props.classId })
				if (res.code === 1) {
					// 通知父组件刷新（父组件可重新加载小组和学生的关联数据）
					emit('success')
				}
				visible.value = false
			} else {
				ElMessage.info('未检测到修改')
				visible.value = false
			}
		} catch (error) {
			ElMessage.error('操作失败')
		} finally {
			loading.value = false
		}
	}
</script>

<style scoped>
	.group-naming-item {
		margin-bottom: 16px;
	}
</style>