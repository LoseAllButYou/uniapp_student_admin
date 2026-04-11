<template>
  <el-dialog v-model="visible" title="排座位" width="90%" top="5vh" :close-on-click-modal="false" class="seat-dialog">
    <div class="seat-layout">
      <div class="seat-grid">
        <div v-for="(row, rIdx) in seatMatrix" :key="rIdx" class="seat-row">
          <div v-for="(seat, cIdx) in row" :key="cIdx" class="seat-cell" :class="{ occupied: seat.student }"
               @dragover.prevent @drop="handleDrop($event, rIdx, cIdx)">
            <div v-if="seat.student" class="student-info" draggable="true" @dragstart="handleDragStart($event, seat.student)">
              {{ seat.student.name }}
            </div>
            <div v-else class="empty-seat">空</div>
          </div>
        </div>
      </div>
      <div class="unassigned-list">
        <h4>待安排学生</h4>
        <div v-for="stu in unassignedStudents" :key="stu.id" class="unassigned-item" draggable="true"
             @dragstart="handleDragStart($event, stu)">
          {{ stu.name }} ({{ stu.gender }})
        </div>
        <el-empty v-if="unassignedStudents.length === 0" description="所有学生已安排" />
      </div>
    </div>
    <div class="seat-actions">
      <el-button type="primary" @click="autoArrangeSeats">一键排座（权重算法）</el-button>
      <el-button @click="resetSeats">重置座位</el-button>
      <el-button type="success" @click="exportSeatTable">导出座位表</el-button>
      <el-button @click="saveSeats">保存座位安排</el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'

const props = defineProps<{
  modelValue: boolean
  students: any[]
}>()

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const seatMatrix = ref<any[][]>([])
const unassignedStudents = ref<any[]>([])
let draggingStudent: any = null

const initSeats = () => {
  seatMatrix.value = Array(8).fill(null).map(() => Array(8).fill(null).map(() => ({ student: null })))
  unassignedStudents.value = [...props.students]
}

const handleDragStart = (event: DragEvent, student: any) => {
  draggingStudent = student
  event.dataTransfer!.setData('text/plain', student.id)
}

const handleDrop = (event: DragEvent, row: number, col: number) => {
  event.preventDefault()
  if (!draggingStudent) return
  const targetSeat = seatMatrix.value[row][col]
  if (targetSeat.student) {
    unassignedStudents.value.push(targetSeat.student)
    targetSeat.student = draggingStudent
    const idx = unassignedStudents.value.findIndex(s => s.id === draggingStudent.id)
    if (idx !== -1) unassignedStudents.value.splice(idx, 1)
  } else {
    targetSeat.student = draggingStudent
    const idx = unassignedStudents.value.findIndex(s => s.id === draggingStudent.id)
    if (idx !== -1) unassignedStudents.value.splice(idx, 1)
  }
  draggingStudent = null
}

const resetSeats = () => {
  const allStudents: any[] = []
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (seatMatrix.value[i][j].student) {
        allStudents.push(seatMatrix.value[i][j].student)
        seatMatrix.value[i][j].student = null
      }
    }
  }
  unassignedStudents.value = allStudents
}

const autoArrangeSeats = () => {
  let allStudents = [...unassignedStudents.value]
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (seatMatrix.value[i][j].student) {
        allStudents.push(seatMatrix.value[i][j].student)
      }
    }
  }
  const unique = new Map()
  allStudents.forEach(s => unique.set(s.id, s))
  allStudents = Array.from(unique.values())

  const scored = allStudents.map(s => {
    let score = 0
    score += (200 - (s.height || 150)) * 0.1
    score += (s.vision || 40) * 0.5
    score -= (s.score_rank || 100) * 0.2
    if (s.gender === '女') score += 10
    return { student: s, score }
  })
  scored.sort((a, b) => b.score - a.score)

  let idx = 0
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      seatMatrix.value[i][j].student = idx < scored.length ? scored[idx].student : null
      idx++
    }
  }
  unassignedStudents.value = []
  ElMessage.success('排座完成')
}

const exportSeatTable = () => {
  const seatData: string[][] = []
  for (let i = 0; i < 8; i++) {
    const row: string[] = []
    for (let j = 0; j < 8; j++) {
      const student = seatMatrix.value[i][j].student
      row.push(student ? student.name : '空')
    }
    seatData.push(row)
  }
  const exportSheet = seatData.map((row, idx) => [`第${idx + 1}排`, ...row])
  exportSheet.unshift(['座位排', '列1', '列2', '列3', '列4', '列5', '列6', '列7', '列8'])
  const ws = XLSX.utils.aoa_to_sheet(exportSheet)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '座位表')
  XLSX.writeFile(wb, `座位表_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`)
  ElMessage.success('座位表已导出')
}

const saveSeats = () => {
  ElMessage.info('保存功能暂未实现，座位安排仅用于展示')
}

watch(() => props.modelValue, (val) => {
  if (val) initSeats()
})
</script>

<style scoped>
.seat-dialog :deep(.el-dialog__body) { padding: 20px; max-height: 70vh; overflow-y: auto; }
.seat-layout { display: flex; gap: 30px; justify-content: space-between; }
.seat-grid { flex: 2; display: flex; flex-direction: column; gap: 8px; }
.seat-row { display: flex; gap: 8px; }
.seat-cell { width: 70px; height: 70px; border: 1px solid #dcdfe6; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #fafafa; transition: 0.2s; }
.seat-cell.occupied { background: #e6f7ff; border-color: #409eff; }
.student-info { cursor: grab; text-align: center; font-size: 12px; padding: 4px; }
.empty-seat { color: #c0c4cc; font-size: 12px; }
.unassigned-list { flex: 1; border-left: 1px solid #e4e7ed; padding-left: 20px; max-height: 500px; overflow-y: auto; }
.unassigned-list h4 { margin: 0 0 12px 0; }
.unassigned-item { padding: 8px; margin-bottom: 8px; background: #f5f7fa; border-radius: 4px; cursor: grab; transition: 0.2s; }
.unassigned-item:hover { background: #ecf5ff; }
.seat-actions { margin-top: 20px; text-align: center; }
</style>