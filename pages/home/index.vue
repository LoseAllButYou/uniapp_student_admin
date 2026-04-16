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
				<el-image style="width: 40px; height: 40px" src="/web/static/logo.png" />
				<span class="logo-text">{{ isCollapse ? '' : '班级积分管理系统' }}</span>
			</div>
			<div class="header-right">
				<el-button type="text" @click="restorePetGame" :class="{'pet-game-active': petGameMinimized}">
					<el-icon>
						<Promotion />
					</el-icon> <span v-if="petGameMinimized">返回宠物乐园</span><span v-else>游戏</span>
				</el-button>
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
					<el-menu-item index="game">
						<el-icon>
							<Promotion />
						</el-icon>
						<template #title>小组互动游戏</template>
					</el-menu-item>
				</el-menu>
			</el-aside>

			<el-main class="layout-main" v-if="logined">
				<div v-if="loading" v-loading="loading"></div>
				<div v-else-if="activeMenu === 'groupScore'">
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
				<div v-show="activeMenu === 'game'">
					<GameCenter @minimize="handlePetGameMinimize" ref="GameCenterRef"></GameCenter>
				</div>
			</el-main>
		</el-container>

		<!-- 个人信息弹窗（含班级管理功能） -->
		<el-dialog v-model="infoDialogVisible" title="教师信息" width="500px">
			<el-descriptions :column="1" border>
				<el-descriptions-item label="姓名">{{ teacherInfo.name }}</el-descriptions-item>
				<el-descriptions-item label="学校">{{ teacherInfo.school }}</el-descriptions-item>
			</el-descriptions>

			<!-- 班级管理区域 -->
			<div style="margin-top: 20px">
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
					<span style="font-weight: 500; font-size: 14px">我的班级</span>
					<el-button type="primary" size="small" @click="openAddClassDialog">
						<el-icon>
							<Plus />
						</el-icon> 添加班级
					</el-button>
				</div>
				<div v-if="teacherInfo.classes && teacherInfo.classes.length" class="class-list">
					<el-tag v-for="cls in teacherInfo.classes" :key="cls.id" class="class-tag"
						:type="currentClassId === cls.id ? 'primary' : 'info'" effect="plain"
						@click="selectClass(cls.id)">
						{{ cls.name }}
						<el-icon v-if="currentClassId === cls.id" style="margin-left: 4px">
							<Check />
						</el-icon>
					</el-tag>
				</div>
				<div v-else style="color: #909399; font-size: 13px; text-align: center; padding: 20px 0">
					暂无班级，请点击上方按钮添加
				</div>
			</div>
		</el-dialog>

		<!-- 添加班级表单对话框 -->
		<el-dialog v-model="addClassDialogVisible" title="添加班级" width="500px" @close="resetClassForm">
			<el-form :model="classForm" :rules="classRules" ref="classFormRef" label-width="80px">
				<el-form-item label="年级" prop="grade">
					<el-select v-model="classForm.grade" placeholder="请选择年级" style="width: 100%">
						<el-option v-for="i in 12" :key="i" :label="i <=6?i+ '年级':i<=9?'初'+(i-6):'高'+(i-9)"
							:value="i" />
					</el-select>
				</el-form-item>
				<el-form-item label="学期" prop="semester">
					<el-select v-model="classForm.semester" placeholder="请选择学期" style="width: 100%">
						<el-option label="上学期" :value="1" />
						<el-option label="下学期" :value="2" />
					</el-select>
				</el-form-item>
				<el-form-item label="班级序号" prop="classNumber">
					<el-input-number v-model="classForm.classNumber" :min="1" :max="20" placeholder="请输入班级序号（如1班则填1）"
						style="width: 100%" />
				</el-form-item>
				<el-form-item label="班级名称" prop="name">
					<el-input v-model="classForm.name" placeholder="自动根据年级+班级生成，可手动修改" />
				</el-form-item>
				<el-form-item label="班级编码" prop="code">
					<el-input v-model="classForm.code" placeholder="选填，班级唯一编码" />
				</el-form-item>
			</el-form>
			<template #footer>
				<span class="dialog-footer">
					<el-button @click="addClassDialogVisible = false">取消</el-button>
					<el-button type="primary" @click="submitAddClass" :loading="addingClass">确定</el-button>
				</span>
			</template>
		</el-dialog>
	</el-container>
</template>

<script setup lang="ts">
	import { ref, reactive, onMounted, watch } from 'vue'
	import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus'
	import GroupScore from '@/pages/score/groupScore.vue'
	import rank from '@/pages/rank/rank.vue'
	import reward from '@/pages/reward/reward.vue'
	import student from '@/pages/student/StudentManage.vue'
	import GameCenter from '@/pages/game/index.vue'
	import { getTeacherInfo, getClasses, tokenLogin, createClass } from '@/api/request'

	const logined = ref(false)
	const loading = ref(true)
	// 菜单状态
	const activeMenu = ref('student')
	const isCollapse = ref(false)
	const petGameMinimized = ref(false)

	// 用户信息（扩展班级列表、教师ID、学校ID）
	const teacherInfo = ref({
		name: '',
		school: '',
		schoolId: '',
		teacherId: '',
		classes: [] as Array<{ id : number, name : string, isDefault ?: boolean }>
	})
	const infoDialogVisible = ref(false)
	const addingClass = ref(false)
	const addClassDialogVisible = ref(false)
	const classFormRef = ref<FormInstance>()

	// 当前默认班级ID（最新创建的那个）
	const currentClassId = ref<number | null>(null)

	// 添加班级表单数据
	const classForm = reactive({
		grade: 1,          // 年级
		semester: 1,       // 学期 1上学期 2下学期
		classNumber: 1,    // 班级序号
		name: '',          // 班级名称
		code: ''           // 班级编码（可选）
	})

	// 表单校验规则
	const classRules : FormRules = {
		grade: [{ required: true, message: '请选择年级', trigger: 'change' }],
		semester: [{ required: true, message: '请选择学期', trigger: 'change' }],
		classNumber: [{ required: true, message: '请输入班级序号', trigger: 'blur' }],
		name: [{ required: true, message: '请输入班级名称', trigger: 'blur' }]
	}

	// 根据年级和班级序号自动生成班级名称
	const generateClassName = (grade: string | number, classNumber: string | number) => {
	  if (!grade || !classNumber) return ''
	  return `${grade}年级${classNumber}班`
	}
	// 监听年级或班级序号变化，自动填充班级名称（如果用户未手动修改）
	watch(
		[() => classForm.grade, () => classForm.classNumber],
		([grade, classNumber]) => {
			console.log('grade or classNumber changed:', grade, classNumber)
			const autoName = generateClassName(grade, classNumber)
			// 只有当用户未手动修改班级名称，或者当前名称与自动生成名称不一致时才覆盖
			// 注意：如果用户清空了名称，也重新生成
			classForm.name = autoName
		},
		{ immediate: true }
	)

	// 监听子组件最小化游戏
	const GameCenterRef = ref<GameCenter>()

	// 重置表单
	const resetClassForm = () => {
		classForm.grade = 1
		classForm.semester = 1
		classForm.classNumber = 1
		classForm.name = generateClassName(1, 1)
		classForm.code = ''
		classFormRef.value?.clearValidate()
	}

	// 刷新班级列表，并自动设置最新班级为当前班级
	const refreshClasses = async () => {
		try {
			const classRes = await getClasses()
			if (classRes.code === 1 && classRes.data&&classRes.data?.length>0) {
				const classList = classRes.data.map((cls : any) => ({
					id: cls.id,
					name: cls.name,
					stu_school_id:teacherInfo.value.schoolId,
					isDefault: cls.isDefault || false
				}))
				teacherInfo.value.classes = classList

				// 更新本地存储
				const storedInfo = uni.getStorageSync('teacherInfo') || {}
				storedInfo.classes = classList
				uni.setStorageSync('teacherInfo', storedInfo)
				console.log(111)
				// 自动设置当前班级：优先选择 isDefault 为 true 的，否则选择 id 最大的（最新创建的）
				let defaultClass = classList.find(c => c.isDefault === true)
				if (!defaultClass && classList.length > 0) {
					defaultClass = classList.reduce((prev, curr) => (curr.id > prev.id ? curr : prev), classList[0])
					console.log(111)
				}
				if (defaultClass) {
					currentClassId.value = defaultClass.id
					uni.setStorageSync('currentClassId', currentClassId.value)
					// 触发全局事件，通知其他组件班级已更新
					loading.value = false
					uni.$emit('storage', { classId: currentClassId.value, classList })
				} else {
					currentClassId.value = null
					uni.removeStorageSync('currentClassId')
					ElMessage.error('异常清空，请重新登录')
					setTimeout(()=>uni.reLaunch({
						url:'/pages/auth/login'
					}),2000)
				}
			}else{
				console.log(classRes)
				ElMessage.error('还没有班级信息，请在个人信息界面添加班级')
			}
		} catch (error) {
			ElMessage.error('还没有班级信息，请在个人信息界面添加班级')
		}
	}

	const selectClass = async (id : number) => {
		console.log(id)
		currentClassId.value = id
		uni.setStorageSync('currentClassId', id)
		uni.$emit('storage')
	}
	// 获取用户信息并存储到本地
	const fetchUserInfo = async () => {
		try {
			const token = uni.getStorageSync('token')
			if (!token) {
				uni.reLaunch({ url: '/pages/auth/login' })
				return
			}
			// 验证 token 有效性
			const tokenRes = await tokenLogin()
			if (tokenRes.code !== 1) throw new Error('token验证失败')
			const userData = tokenRes.data
			logined.value = true;
			let isStorage = true
			teacherInfo.value=uni.getStorageSync('teacherInfo')
			const classId = typeof teacherInfo.value==='object'&&teacherInfo.value.classes.length > 0 ? teacherInfo.value.classes[teacherInfo.value.classes.length - 1].id : -1
			currentClassId.value = classId
			if(classId>-1){
				uni.setStorage({
					key: 'currentClassId',
					data: currentClassId.value,
					success: function () {
						console.log('success');
						loading.value = false
					}
				})
			}else{
				isStorage = false
			}

			if (!isStorage) {
				console.log(teacherInfo.value)
				// 获取教师详细信息（含学校、教师ID）
				const teacherRes = await getTeacherInfo()
				let teacherName = userData.name || userData.username
				let schoolName = ''
				let schoolId = ''
				let teacherId = ''
				if (teacherRes.code === 1) {
					teacherName = teacherRes.data.name || teacherRes.data.username
					schoolName = teacherRes.data.school?.name || ''
					schoolId = teacherRes.data.school?.id || ''
					teacherId = teacherRes.data.id || userData.id || ''
				}

				// 获取班级列表
				const classRes = await getClasses()
				let classList : Array<{ id : number, name : string, isDefault ?: boolean }> = []
				if (classRes.code === 1 && classRes.data.length) {
					classList = classRes.data.map((cls : any) => ({
						id: cls.id,
						name: cls.name,
						grade: cls.grade,
						semester: cls.semester,
						stu_school_id:schoolId,
						class: cls.class,
						isDefault: cls.isDefault || false
					}))
				}
				teacherInfo.value = {
					name: teacherName,
					school: schoolName,
					schoolId: schoolId,
					teacherId: teacherId,
					classes: classList
				}
				uni.setStorageSync('teacherInfo',teacherInfo.value)
				if (classList.length > 0) {
					const savedClassId = uni.getStorageSync('currentClassId')
					let targetClass = classList.find(c => c.id === savedClassId)
					if (!targetClass) {
						targetClass = classList.find(c => c.isDefault === true) || classList.reduce((prev, curr) => (curr.id > prev.id ? curr : prev), classList[0])
					}
					if (targetClass) {
						currentClassId.value = targetClass.id
						uni.setStorageSync('currentClassId', currentClassId.value)
					}
					loading.value = false;
				}else{
					ElMessage.error('还没有班级信息，请在个人信息界面添加班级')
				}
			}

		} catch (error) {
			console.error('获取用户信息失败', error)
			ElMessage.error('还没有班级信息，请在个人信息界面添加班级')
			teacherInfo.value = {
				name: '教师',
				school: '',
				schoolId: '',
				teacherId: '',
				classes: []
			}
			uni.setStorageSync('teacherInfo', teacherInfo.value)
		}
	}

	// 显示个人信息弹窗
	const showTeacherInfo = () => {
		const localInfo = uni.getStorageSync('teacherInfo')
		if (localInfo && localInfo.name) {
			teacherInfo.value = localInfo
		} else {
			fetchUserInfo()
		}
		infoDialogVisible.value = true
	}

	// 打开添加班级对话框
	const openAddClassDialog = () => {
		// 校验学校ID和教师ID是否存在
		if (!teacherInfo.value.schoolId) {
			ElMessage.warning('学校信息未完善，请联系管理员')
			return
		}
		if (!teacherInfo.value.teacherId) {
			ElMessage.warning('教师信息未完善，请联系管理员')
			return
		}
		resetClassForm()
		addClassDialogVisible.value = true
	}

	// 提交添加班级
	const submitAddClass = async () => {
		if (!classFormRef.value) return
		await classFormRef.value.validate(async (valid) => {
			if (!valid) return

			addingClass.value = true
			try {
				const params = {
					stu_school_id: teacherInfo.value.schoolId,
					stu_teacher_id: teacherInfo.value.teacherId,
					name: classForm.name,
					code: classForm.code || undefined,
					grade: classForm.grade,
					semester: classForm.semester,
					class: classForm.classNumber   // 注意字段名是 class
				}
				console.log(params)
				
				const res = await createClass(params)
				if (res.code === 1) {
					ElMessage.success('班级添加成功')
					addClassDialogVisible.value = false
					// 刷新班级列表（会自动将最新班级设为当前班级）
					await refreshClasses()
				} else {
					ElMessage.error(res.message || '添加班级失败')
				}
			} catch (error : any) {
				console.error('添加班级出错', error)
				ElMessage.error(error.message || '添加班级失败，请稍后重试')
			} finally {
				addingClass.value = false
			}
		})
	}

	// 菜单切换
	const handleMenuSelect = (index : string) => {
			activeMenu.value = index

	}

	const handlePetGameMinimize = () => {
		petGameMinimized.value = true
	}

	const restorePetGame = () => {
		petGameMinimized.value = false
		activeMenu.value = 'game'

		console.log(GameCenterRef.value.enterGame)
		GameCenterRef.value?.enterGame('')
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
			uni.removeStorageSync('teacherInfo')
			uni.removeStorageSync('currentClassId')
			uni.reLaunch({ url: '/pages/auth/login' })
		}).catch(() => { })
	}

	onMounted(() => {
		fetchUserInfo()

		// 监听宠物游戏最小化事件
		uni.$on('petGameMinimized', (minimized: boolean) => {
			if (minimized) {
				petGameMinimized.value = true
				activeMenu.value = 'student'
			} else {
				petGameMinimized.value = false
				activeMenu.value = 'game'
			}
		})
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

	/* 班级列表样式 */
	.class-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		max-height: 200px;
		overflow-y: auto;
		padding: 4px 0;
	}

	.class-tag {
		margin-bottom: 4px;
		cursor: default;
	}
</style>