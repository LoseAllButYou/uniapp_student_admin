<template>
  <div class="register-container">
    <el-card class="register-card" shadow="always">
      <template #header>
        <div class="card-header">
          <h2>班级积分管理系统</h2>
          <span>教师注册</span>
        </div>
      </template>
      <el-form :model="form" :rules="rules" ref="registerFormRef" label-width="100px">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" prefix-icon="User" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入真实姓名" prefix-icon="Postcard" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码（6-20位）" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item label="学校选择" prop="schoolType">
          <el-radio-group v-model="form.schoolType">
            <el-radio label="invite">使用邀请码</el-radio>
            <el-radio label="select">选择学校</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.schoolType === 'invite'" label="邀请码" prop="invite_code">
          <el-input v-model="form.invite_code" placeholder="请输入学校邀请码" />
        </el-form-item>
        <el-form-item v-if="form.schoolType === 'select'" label="学校" prop="school_id">
          <el-select v-model="form.school_id" placeholder="请选择学校" filterable>
            <el-option v-for="school in schoolList" :key="school.id" :label="school.name" :value="school.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleRegister" style="width:100%">注册</el-button>
        </el-form-item>
        <div class="footer-link">
          <span>已有账号？</span>
          <el-link type="primary" @click="goToLogin">立即登录</el-link>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { register, getSchoolList } from '@/api/request'

const router = useRouter()
const registerFormRef = ref(null)
const loading = ref(false)
const schoolList = ref([])

const form = reactive({
  username: '',
  name: '',
  password: '',
  confirmPassword: '',
  schoolType: 'invite',
  invite_code: '',
  school_id: null
})

// 验证确认密码
const validateConfirm = (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 20, message: '账号长度在3到20个字符', trigger: 'blur' }
  ],
  name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在6到20个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ],
  invite_code: [
    { required: true, message: '请输入邀请码', trigger: 'blur' }
  ],
  school_id: [
    { required: true, message: '请选择学校', trigger: 'change' }
  ]
}

// 获取学校列表（用于选择学校）
const fetchSchoolList = async () => {
  try {
    const res = await getSchoolList()
    if (res.code === 1) {
      schoolList.value = res.data
    }
  } catch (error) {
    console.error('获取学校列表失败', error)
  }
}

const handleRegister = async () => {
  if (!registerFormRef.value) return
  await registerFormRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const params = {
        username: form.username,
        password: form.password,
        name: form.name
      }
      if (form.schoolType === 'invite') {
        params.invite_code = form.invite_code
      } else {
        params.school_id = form.school_id
      }
      const result = await register(params)
      if (result.code === 1) {
        ElMessage.success('注册成功，请登录')
        goToLogin()
      } else {
        ElMessage.error(result.msg || '注册失败')
      }
    } catch (error) {
      ElMessage.error('网络错误，请稍后重试')
    } finally {
      loading.value = false
    }
  })
}

const goToLogin = () => {
  uni.redirectTo({
  	url:'/pages/auth/login'
  })
}

onMounted(() => {
  fetchSchoolList()
})
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.register-card {
  width: 500px;
  border-radius: 12px;
}
.card-header {
  text-align: center;
}
.card-header h2 {
  margin: 0;
  color: #303133;
}
.card-header span {
  font-size: 14px;
  color: #909399;
}
.footer-link {
  text-align: center;
  margin-top: 16px;
}
</style>