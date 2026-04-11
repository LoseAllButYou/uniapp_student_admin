<template>
  <el-dialog v-model="visible" title="个人加减分" width="500px">
    <el-form :model="form" label-width="100px">
      <el-form-item label="学生姓名">
        <span>{{ student?.name }}</span>
      </el-form-item>
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
      <el-form-item label="加减分原因">
        <el-select v-model="reasonId" placeholder="请选择加减分项" clearable style="width: 100%">
          <el-option v-for="item in reasonOptions" :key="item.id" :label="`${item.score}分：${item.reason}`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注（可选）">
        <el-input v-model="remark" placeholder="可补充说明" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { addStudentScore } from '@/api/request'

const props = defineProps<{
  modelValue: boolean
  student: any
  classId: number
  grade: string
  semester: number
  week: number
  reasonOptions: any[]
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const dayOfWeek = ref(1)
const reasonId = ref<number | null>(null)
const remark = ref('')
const submitting = ref(false)

const setTodayWeek = () => {
  const today = new Date().getDay()
  let day = today === 0 ? 7 : today
  if (day > 5) day = 1
  dayOfWeek.value = day
  ElMessage.success(`已设为周${['一', '二', '三', '四', '五'][day - 1]}`)
}

const submit = async () => {
  if (!reasonId.value) {
    ElMessage.warning('请选择加减分原因')
    return
  }
  const selectedReason = props.reasonOptions.find(r => r.id === reasonId.value)
  if (!selectedReason) return

  const finalReason = remark.value ? `${selectedReason.reason}（${remark.value}）` : selectedReason.reason

  submitting.value = true
  try {
    const res = await addStudentScore({
      studentId: props.student.id,
      classId: props.classId,
      grade: props.grade,
      semester: props.semester,
      week: props.week,
      dayOfWeek: dayOfWeek.value,
      score: selectedReason.score,
      reason: finalReason
    })
    if (res.code === 1) {
      ElMessage.success(`已为 ${props.student.name} ${selectedReason.score > 0 ? '+' : ''}${selectedReason.score} 分`)
      visible.value = false
      emit('success')
    } else {
      ElMessage.error(res.msg || '操作失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
  } finally {
    submitting.value = false
  }
}
</script>