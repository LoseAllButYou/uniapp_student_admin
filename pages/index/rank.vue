<template>
  <div class="rank-container">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="个人荣誉榜" name="student">
        <el-table :data="studentRank" stripe v-loading="loading">
          <el-table-column type="index" label="排名" width="60" />
          <el-table-column prop="name" label="姓名" />
          <el-table-column prop="total_points" label="总积分" sortable />
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="小组荣誉榜" name="group">
        <el-table :data="groupRank" stripe v-loading="loading">
          <el-table-column type="index" label="排名" width="60" />
          <el-table-column prop="group_name" label="小组" />
          <el-table-column prop="total_points" label="总积分" sortable />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getStudentRank, getGroupRank } from '@/api/request'

const activeTab = ref('student')
const studentRank = ref([])
const groupRank = ref([])
const loading = ref(false)

const fetchRanks = async () => {
  loading.value = true
  try {
    const [studentRes, groupRes] = await Promise.all([
      getStudentRank(),
      getGroupRank()
    ])
    if (studentRes.code === 1) studentRank.value = studentRes.data
    else ElMessage.error(studentRes.msg || '获取个人榜失败')
    if (groupRes.code === 1) groupRank.value = groupRes.data
    else ElMessage.error(groupRes.msg || '获取小组榜失败')
  } catch (error) {
    console.error(error)
    ElMessage.error('网络错误')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRanks()
})
</script>

<style scoped>
.rank-container {
  padding: 20px;
  background: #f0f2f5;
  min-height: calc(100vh - 60px);
}
:deep(.el-tabs__header) {
  background: #fff;
  margin: 0;
  padding: 0 20px;
}
:deep(.el-table) {
  background: #fff;
}
</style>