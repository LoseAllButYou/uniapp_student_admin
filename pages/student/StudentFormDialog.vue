<template>
	<el-dialog v-model="visible" :title="title" width="500px" @close="resetForm">
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
			<el-form-item label="小组" prop="stu_group_info_id">
				<el-select v-model="form.stu_group_info_id" placeholder="请选择小组" clearable @change="availableNumbers">
					<el-option v-for="item in groupList" :key="item.id" :label="item.name + item.description"
						:value="item.id" />
				</el-select>
			</el-form-item>
			<el-form-item label="组内编号" prop="member_number">
				<el-select v-model="form.member_number" :placeholder="availableNumbers.length?'请选择编号':'小组7人已满，选择其他小组'" clearable
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
			<el-button @click="visible = false">取消</el-button>
			<el-button type="primary" :loading="submitLoading" @click="submitForm">确定</el-button>
		</template>
	</el-dialog>
</template>

<script setup lang="ts">
	import { ref, computed, watch } from 'vue'
	import { ElMessage } from 'element-plus'
	import { addStudent, updateStudent } from '@/api/request'

	const props = defineProps<{
		modelValue : boolean
		title : string
		classId : number
		schoolId : number
		groupList : any[]
		existingStudents : any[]
		student ?: any  // 编辑时传入的学生对象
	}>()

	const emit = defineEmits(['update:modelValue', 'success'])

	const visible = computed({
		get: () => props.modelValue,
		set: (val) => emit('update:modelValue', val)
	})

	const formRef = ref(null)
	const submitLoading = ref(false)

	const form = ref({
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

	const rules = {
		student_no: [{ required: true, message: '请输入学号', trigger: 'blur' }],
		name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
	}

	const availableNumbers = computed(() => {
		if (!form.value.stu_group_info_id) return []
		console.log(form.value.stu_group_info_id)
		const occupied = props.existingStudents
			.filter(s => s.stu_group_info_id === form.value.stu_group_info_id)
			.map(s => s.member_number)
			.filter(n => n)
		return [1, 2, 3, 4, 5, 6, 7].filter(n => !occupied.includes(n))
	})
	

	watch(() => props.student, (newVal) => {
		if (newVal) {
			form.value = { ...newVal }
		} else {
			if (form.value) resetForm()
		}
	}, { immediate: true })

	const resetForm = () => {
		form.value = {
			id: null,
			student_no: '',
			name: '',
			gender: '未知',
			stu_group_info_id: null,
			member_number: null,
			height: null,
			vision: null,
			score_rank: null,
		}
		if (formRef.value) (formRef.value as any).resetFields()
	}

	const submitForm = async () => {
		if (!formRef.value) return
		await (formRef.value as any).validate()
		submitLoading.value = true
		try {
			const payload = {
				...form.value,
				stu_class_id: props.classId,
				stu_school_id: props.schoolId
			}
			let res
			if (payload.id) {
				res = await updateStudent(payload)
			} else {
				res = await addStudent(payload)
			}
			if (res.code === 1) {
				ElMessage.success('操作成功')
				visible.value = false
				emit('success')
			} else {
				ElMessage.error(res.msg || '操作失败')
			}
		} catch (error) {
			ElMessage.error('网络错误')
		} finally {
			submitLoading.value = false
		}
	}
</script>

<style scoped>
	.form-tip {
		font-size: 12px;
		color: #909399;
		margin-left: 8px;
	}
</style>