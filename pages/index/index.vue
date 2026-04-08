<template>
	<el-container class="layout-container">
		<!-- 顶部 Header（横跨整个宽度） -->
		<el-header class="layout-header">
			<div class="header-left">
				<el-button type="text" @click="toggleCollapse" class="collapse-btn">
					<el-icon>
						<Fold v-if="!isCollapse" />
						<Expand v-else />
					</el-icon>
				</el-button>
				<el-image style="width: 40px; height: 40px" src="/static/logo.png" />
				<span class="logo-text">{{ isCollapse ? '' : '班级积分管理系统' }}</span>
			</div>
			<div class="header-right">

				<el-button type="text" @click="showTeacherInfo">
					<el-icon>
						<User />
					</el-icon> 个人信息
				</el-button>
				<el-button type="text" @click="logout">
					<el-icon>
						<SwitchButton />
					</el-icon> 退出登录
				</el-button>
			</div>
		</el-header>

		<!-- 下方主体：左侧菜单 + 右侧内容 -->
		<el-container class="main-container">
			<el-aside :width="isCollapse ? '64px' : '220px'" class="layout-aside">
				<el-menu :default-active="activeMenu" class="menu-vertical" :collapse="isCollapse"
					:collapse-transition="false" @select="handleMenuSelect">
					<el-menu-item index="student">
						<el-icon>
							<UserFilled />
						</el-icon>
						<template #title>学生管理</template>
					</el-menu-item>
					<el-menu-item index="groupScore">
						<el-icon>
							<DataLine />
						</el-icon>
						<template #title>小组积分管理</template>
					</el-menu-item>
					<el-menu-item index="reward">
						<el-icon>
							<Present />
						</el-icon>
						<template #title>积分商城</template>
					</el-menu-item>
					<el-menu-item index="rank">
						<el-icon>
							<Trophy />
						</el-icon>
						<template #title>荣誉榜</template>
					</el-menu-item>
				</el-menu>
			</el-aside>

			<el-main class="layout-main" v-if="logined">
				<div v-if="activeMenu === 'groupScore'">
					<GroupScore />
				</div>
				<div v-else-if="activeMenu === 'reward'">
					<reward></reward>
				</div>
				<div v-else-if="activeMenu === 'rank'">
					<rank></rank>
				</div>
				<div v-else-if="activeMenu === 'student'">
					<student></student>
				</div>
			</el-main>
		</el-container>

		<!-- 个人信息弹窗 -->
		<el-dialog v-model="infoDialogVisible" title="教师信息" width="400px">
			<el-descriptions :column="1" border>
				<el-descriptions-item label="姓名">{{ teacherInfo.name }}</el-descriptions-item>
				<el-descriptions-item label="学校">{{ teacherInfo.school }}</el-descriptions-item>
				<el-descriptions-item label="班级">{{ teacherInfo.className }}</el-descriptions-item>
			</el-descriptions>
		</el-dialog>
	</el-container>
</template>

<script setup lang="ts">
	import { ref, onMounted } from 'vue'
	import { ElMessage, ElMessageBox } from 'element-plus'
	import { DataLine, Present, Trophy, Fold, Expand, User, SwitchButton } from '@element-plus/icons-vue'
	import GroupScore from './groupScore.vue'
	import rank from './rank.vue'
	import reward from './reward.vue'
	import student from './student.vue'
	import { getTeacherInfo, getClasses, tokenLogin } from '@/api/request'
	
	const logined =ref(false)
	
	// 菜单状态
	const activeMenu = ref('student')
	const isCollapse = ref(false)
	
	// 用户信息（用于弹窗显示）
	const teacherInfo = ref({ name: '', school: '', className: '' })
	const infoDialogVisible = ref(false)
	
	// 获取用户信息并存储到本地
	const fetchUserInfo = async () => {
	  try {
	    const token = uni.getStorageSync('token')
	    if (!token) {
	      uni.reLaunch({ url: '/pages/index/login' })
	      return
	    }
	    // 验证 token 有效性
	    const tokenRes = await tokenLogin()
	    if (tokenRes.code !== 1) throw new Error('token验证失败')
	    const userData = tokenRes.data
		logined.value=true;
	    // 获取教师详细信息（含学校）
	    const teacherRes = await getTeacherInfo()
	    let teacherName = userData.name || userData.username
	    let schoolName = ''
	    let className = ''
	    if (teacherRes.code === 1) {
	      teacherName = teacherRes.data.name || teacherRes.data.username
	      schoolName = teacherRes.data.school?.name || ''
	      // 获取班级列表
	      const classRes = await getClasses()
	      if (classRes.code === 1 && classRes.data.length) {
	        className = classRes.data[0].name || ''
	      }
	    }
	    teacherInfo.value = { name: teacherName, school: schoolName, className }
	    // 存入本地存储，供其他组件复用
	    uni.setStorageSync('teacherInfo', teacherInfo.value)
	  } catch (error) {
	    console.error('获取用户信息失败', error)
	    teacherInfo.value = { name: '教师', school: '', className: '' }
	    uni.setStorageSync('teacherInfo', teacherInfo.value)
	  }
	}
	
	// 显示个人信息弹窗
	const showTeacherInfo = () => {
	  // 如果本地存储有最新数据，优先使用（避免重复请求）
	  const localInfo = uni.getStorageSync('teacherInfo')
	  if (localInfo && localInfo.name) {
	    teacherInfo.value = localInfo
	  } else {
	    fetchUserInfo()
	  }
	  infoDialogVisible.value = true
	}

	// 菜单切换
	const handleMenuSelect = (index : string) => {
		activeMenu.value = index
	}

	// 收缩/展开菜单
	const toggleCollapse = () => {
		isCollapse.value = !isCollapse.value
	}


	// 退出登录
	const logout = () => {
		ElMessageBox.confirm('确定要退出登录吗？', '提示', {
			confirmButtonText: '确定',
			cancelButtonText: '取消',
			type: 'warning'
		}).then(() => {
			uni.removeStorageSync('token')
			uni.removeStorageSync('userInfo')
			uni.reLaunch({ url: '/pages/login/login' })
		}).catch(() => { })
	}

	onMounted(() => {
		fetchUserInfo()
	})
</script>

<style scoped>
	.layout-container {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.layout-header {
		background-color: #ffffff;
		border-bottom: 1px solid #eef2f6;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 24px;
		height: 60px;
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.logo-icon {
		font-size: 1.6rem;
		color: #3b82f6;
	}

	.logo-text {
		font-size: 1.2rem;
		font-weight: 600;
		color: #1e293b;
		white-space: nowrap;
		transition: opacity 0.2s;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.header-right .el-button {
		color: #475569;
	}

	.collapse-btn {
		font-size: 1.2rem;
		padding: 8px;
	}

	.main-container {
		flex: 1;
		overflow: hidden;
	}

	.layout-aside {
		background-color: #ffffff;
		border-right: 1px solid #eef2f6;
		transition: width 0.3s;
		overflow-x: hidden;
		flex-shrink: 0;
	}

	.menu-vertical {
		border-right: none;
		height: 100%;
	}

	.layout-main {
		background: #f0f2f5;
		padding: 20px;
		overflow-y: auto;
	}
</style>