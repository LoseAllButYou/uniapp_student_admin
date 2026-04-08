<template>
  <div class="reward-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>积分商城</span>
          <el-button type="primary" plain @click="fetchMyExchanges">我的兑换</el-button>
        </div>
      </template>
      <div v-loading="loading" class="reward-grid">
        <el-card v-for="item in rewardList" :key="item.id" class="reward-item" shadow="hover">
          <img :src="item.image || defaultImage" class="reward-image" />
          <div class="reward-name">{{ item.name }}</div>
          <div class="reward-points">{{ item.points }} 积分</div>
          <div class="reward-stock">库存：{{ item.stock }}</div>
          <el-button type="primary" size="small" @click="exchange(item)">兑换</el-button>
        </el-card>
        <el-empty v-if="rewardList.length === 0 && !loading" description="暂无奖品" />
      </div>
    </el-card>
    <!-- 兑换记录弹窗 -->
    <el-dialog v-model="exchangeDialog.visible" title="我的兑换记录" width="600px">
      <el-table :data="exchangeList" stripe v-loading="exchangeLoading">
        <el-table-column prop="reward_name" label="奖品名称" />
        <el-table-column prop="points" label="消耗积分" />
        <el-table-column prop="exchange_time" label="兑换时间" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '已兑换' : '处理中' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRewardList, exchangeReward, getMyExchanges } from '@/api/request'

const defaultImage = 'https://via.placeholder.com/150?text=奖品'
const rewardList = ref([])
const exchangeList = ref([])
const loading = ref(false)
const exchangeLoading = ref(false)
const exchangeDialog = ref({ visible: false })

// 获取当前登录学生ID（从本地存储读取）
const getCurrentStudentId = () => {
  // 根据实际业务调整，可能从 userInfo 中获取
  const userInfo = uni.getStorageSync('userInfo') || {}
  return userInfo.student_id || 1 // 临时 mock
}

const fetchRewardList = async () => {
  loading.value = true
  try {
    const res = await getRewardList()
    if (res.code === 1) {
      rewardList.value = res.data
    } else {
      ElMessage.error(res.msg || '获取奖品列表失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('网络错误')
  } finally {
    loading.value = false
  }
}

const exchange = (item) => {
  ElMessageBox.confirm(`确定消耗 ${item.points} 积分兑换“${item.name}”吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info'
  }).then(async () => {
    try {
      const res = await exchangeReward({
        reward_id: item.id,
        student_id: getCurrentStudentId()
      })
      if (res.code === 1) {
        ElMessage.success('兑换成功')
        fetchRewardList()
      } else {
        ElMessage.error(res.msg || '兑换失败')
      }
    } catch (error) {
      ElMessage.error('网络错误')
    }
  }).catch(() => {})
}

const fetchMyExchanges = async () => {
  exchangeLoading.value = true
  try {
    const res = await getMyExchanges({ student_id: getCurrentStudentId() })
    if (res.code === 1) {
      exchangeList.value = res.data
      exchangeDialog.value.visible = true
    } else {
      ElMessage.error(res.msg || '获取记录失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
  } finally {
    exchangeLoading.value = false
  }
}

onMounted(() => {
  fetchRewardList()
})
</script>

<style scoped>
.reward-container {
  padding: 20px;
  background: #f0f2f5;
  min-height: calc(100vh - 60px);
}
.box-card {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.reward-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.reward-item {
  width: 200px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
}
.reward-item:hover {
  transform: translateY(-5px);
}
.reward-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
}
.reward-name {
  font-weight: bold;
  margin: 8px 0;
}
.reward-points {
  color: #f56c6c;
}
.reward-stock {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}
</style>