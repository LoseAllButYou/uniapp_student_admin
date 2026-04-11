<template>
  <el-dialog v-model="visible" :title="`${studentName} - 积分变动记录`" width="80%" top="5vh" :close-on-click-modal="false">
    <el-form :inline="true" :model="filter" class="mb-3">
      <el-form-item label="筛选周次">
        <el-select v-model="filter.week" placeholder="全部" style="width: 120px" clearable @change="fetchRecords">
          <el-option label="全部" :value="null" />
          <el-option v-for="w in 22" :key="w" :label="`第${w}周`" :value="w" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="fetchRecords">查询</el-button>
        <el-button @click="resetFilter">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="recordList" border stripe v-loading="loading" height="400">
      <el-table-column prop="week" label="周次" width="80" />
      <el-table-column prop="day_of_week" label="星期" width="80">
        <template #default="{ row }">周{{ ['一','二','三','四','五','六','日'][row.day_of_week - 1] }}</template>
      </el-table-column>
      <el-table-column prop="score" label="变动分数" width="120">
        <template #default="{ row }">
          <span :class="row.score > 0 ? 'score-add' : 'score-reduce'">{{ row.score > 0 ? '+' : '' }}{{ row.score }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="变动原因" min-width="200" />
      <el-table-column prop="create_time" label="操作时间" width="180" />
    </el-table>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getStudentScoreRecords } from '@/api/request'

const props = defineProps<{
  modelValue: boolean
  studentId: number | null
  studentName: string
}>()

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const filter = ref({ week: null as number | null })
const recordList = ref<any[]>([])
const loading = ref(false)

const fetchRecords = async () => {
  if (!props.studentId) return
  loading.value = true
  try {
    const params: any = { studentId: props.studentId }
    if (filter.value.week) params.week = filter.value.week
    const res = await getStudentScoreRecords(params)
    if (res.code === 1) {
      recordList.value = res.data
    } else {
      ElMessage.error(res.msg || '获取记录失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filter.value.week = null
  fetchRecords()
}

watch(() => props.modelValue, (val) => {
  if (val && props.studentId) {
    fetchRecords()
  }
})
</script>

<style scoped>
.score-add { color: #67c23a; font-weight: bold; }
.score-reduce { color: #f56c6c; font-weight: bold; }
.mb-3 { margin-bottom: 16px; }
</style>