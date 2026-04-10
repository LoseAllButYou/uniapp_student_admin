// src/api/request.ts
// 适配 uni-app 的请求封装，确保 token 正确加入请求头

// 配置基础 URL（可根据环境变量配置）
const BASE_URL = '/api'

// 通用请求方法
const request = <T = any>(options : UniApp.RequestOptions) : Promise<T> => {
	console.log(options)
	return new Promise((resolve, reject) => {
		// 从本地存储获取 token
		const token = uni.getStorageSync('token')

		const header : Record<string, string> = {
			'Content-Type': 'application/json'
		}
		// 关键：将 token 添加到请求头
		if (token) {
			header['Authorization'] = `${token}`
		}
		// 合并自定义 header
		if (options.header) {
			Object.assign(header, options.header)
		}

		uni.request({
			url: BASE_URL + options.url,
			method: options.method || 'GET',
			data: options.data,
			header,
			success: (res) => {
				if (res.statusCode === 200) {
					// 假设后端返回格式为 { code: 1, msg: '', data: {} }
					if (res.data.code === 1) {
						resolve(res.data)
					} else if (res.data.code === -1 || res.data.code === 401) {
						// token 失效，清除本地存储并跳转登录
						uni.removeStorageSync('token')
						uni.removeStorageSync('userInfo')
						uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
						uni.reLaunch({ url: '/pages/index/login' })
						reject(res.data)
					} else {
						uni.showToast({ title: res.data.msg || '请求失败', icon: 'none' })
						reject(res.data)
					}
				} else if (res.statusCode === 401) {
					uni.removeStorageSync('token')
					uni.removeStorageSync('userInfo')
					uni.reLaunch({ url: '/pages/index/login' })
					reject({ msg: '登录已过期，请重新登录' })
				} else {
					uni.showToast({ title: `请求错误 ${res.statusCode}`, icon: 'none' })
					reject(res)
				}
			},
			fail: (err) => {
				console.error('[Request Failed]', err)
				uni.showToast({ title: '网络错误', icon: 'none' })
				reject(err)
			}
		})
	})
}

// ==================== 具体 API ====================

// 教师登录
export const login = (data : { username : string; password : string }) => {
	return request({ url: '/stu/teacher/login', method: 'POST', data })
}

// token登录
export const tokenLogin = () => {
	return request({ url: '/stu/teacher/tokenLogin', method: 'POST' })
}

// 教师注册
export const register = (data : { username : string; password : string; name : string; school_id ?: number; invite_code ?: string }) => {
	return request({ url: '/stu/teacher/register', method: 'POST', data })
}

// 获取教师信息
export const getTeacherInfo = () => {
	return request({ url: '/stu/teacher/getInfo', method: 'POST' })
}

// 获取班级列表
export const getClasses = () => {
	return request({ url: '/stu/teacher/getClasses', method: 'POST' })
}

// 获取小组列表（需传 class_id）
export const getGroups = (classId : number, week : number) => {
	return request({ url: `/stu/teacher/getGroups?class_id=${classId}&week=${week}`, method: 'GET' })
}

// 更新小组积分JSON
export const updateGroupScore = (groupId : number, weeklyJson : any) => {
	return request({ url: '/stu/teacher/updateGroupScore', method: 'POST', data: { group_id: groupId, weekly_json: weeklyJson } })
}

// 获取学校列表（用于注册）
export const getSchoolList = () => {
	return request({ url: '/stu/teacher/schoolList', method: 'GET' })
}

//添加新一周数据
export const addNewWeek = (classId : number, week : number, name : string, weekly_json : object) => {
	return request({ url: '/stu/teacher/addWeek', method: 'POST', data: { class_id: classId, week: week, name: name, weekly_json: weekly_json } })
}

// 获取班级已有周次列表
export const getClassWeeks = (classId : number) => {
	return request({ url: '/stu/teacher/getClassWeeks', method: 'GET', data: { class_id: classId } })
}

// 创建班级（已存在，但需确认路径）
export const createClass = (data : { name : string; code ?: string; grade ?: string; semester ?: string }) => {
	return request({ url: '/stu/teacher/createClass', method: 'POST', data })
}

// ==================== 荣誉榜相关 API ====================

// 获取个人积分排行榜
export const getStudentRank = () => {
	return request({ url: '/stu/rank/student', method: 'GET' })
}

// 获取小组积分排行榜
export const getGroupRank = () => {
	return request({ url: '/stu/rank/group', method: 'GET' })
}

// ==================== 学生管理相关 API ====================

// 获取班级列表（用于筛选，与教师班级不同，可传参数）
export const getClassList = (params : { school_id ?: number }) => {
	return request({ url: '/stu/class/list', method: 'GET', data: params })
}

// 获取小组列表（用于筛选）
export const getGroupList = (params : { class_id ?: number }) => {
	return request({ url: '/stu/groupInfo/list', method: 'GET', data: params })
}

// 获取学生列表（分页筛选）
export const getStudentList = (params : { school_id ?: number; class_id ?: number; group_id ?: number; page ?: number; limit ?: number }) => {
	return request({ url: '/stu/student/list', method: 'GET', data: params })
}

// 新增学生
export const addStudent = (data : { student_no : string; name : string; gender ?: string; stu_school_id : number; stu_class_id : number; stu_group_id ?: number; member_number ?: number }) => {
	return request({ url: '/stu/student/add', method: 'POST', data })
}

// 编辑学生
export const updateStudent = (data : { id : number; student_no ?: string; name ?: string; gender ?: string; stu_school_id ?: number; stu_class_id ?: number; stu_group_id ?: number; member_number ?: number }) => {
	return request({ url: '/stu/student/edit', method: 'POST', data })
}

// 删除学生
export const deleteStudent = (data : { id : number }) => {
	return request({ url: '/stu/student/delete', method: 'POST', data })
}

/**
 * 更新小组信息（花名/描述）
 * @param {Object} data - 包含小组 id 和要更新的字段
 * @param {number} data.id - 小组ID
 * @param {string} [data.description] - 小组花名（描述）
 * @param {string} [data.name] - 小组名称（可选，根据需要扩展）
 * @returns {Promise} 返回后端响应，格式如 { code: 1, msg: 'success', data: ... }
 */
export const updateGroup = (data:object) => {
	return request({
		url: '/stu/groupInfo/edit',        // 根据实际后端接口路径调整
		method: 'POST',              // 或 'put'，与后端约定一致
		data
	})
}

// ==================== 积分管理相关 API（新增） ====================

/**
 * 获取小组积分汇总数据（用于 groupScore 页面）
 * @param params { classId, grade, semester, week }
 */
export const getGroupsScores = (params: { classId: number; grade: string; semester: number; week: number }) => {
  return request({ url: '/stu/group/scores', method: 'POST', data: params })
}

/**
 * 添加或修改学生积分（供 student.vue 调用）
 * @param data { studentId, classId, grade, semester, week, dayOfWeek, score, reason }
 */
export const addStudentScore = (data: {
  studentId: number;
  classId: number;
  grade: string;
  semester: number;
  week: number;
  dayOfWeek: number; // 1-5 对应周一到周五
  score: number;
  reason?: string;
}) => {
  return request({ url: '/stu/student/addStudentScore', method: 'POST', data })
}

// 批量添加学生积分
export const batchAddStudentScore = (data: { records: any[] }) => {
  return request({ url: '/stu/teacher/batchAddStudentScore', method: 'POST', data })
}

// 获取积分原因配置
export const getScoreReasons = () => {
  return request({
    url: '/stu/teacher/getScoreReasons',
    method: 'GET'
  })
}


/**
 * 获取班级所有学生的积分记录（用于构建缓存）
 * @param params { classId: number }
 * @returns Promise<{ code: number, msg: string, data: Array<{ studentId: number, week: number, dayOfWeek: number, score: number }> }>
 */
export const getAllClassScores = (params: { classId: number }) => {
  return request({ url: '/stu/teacher/getAllClassScores', method: 'POST', data: params })
}

/**
 * 获取班级所有学生的积分记录（详细接口，用来排名）
 * @param params { classId: number }
 * @returns Promise<{ code: number, msg: string, data: Array<{ studentId: number, week: number, dayOfWeek: number, score: number }> }>
 */
export const getCompalteScores = (params: { classId: number }) => {
  return request({ url: '/stu/teacher/getCompalteScores', method: 'POST', data: params })
}

// ==================== 积分商城相关 API ====================


// 获取奖品列表（按班级筛选）
export const getRewardList = (params: { class_id: number }) => {
  return request({ url: '/stu/reward/list', method: 'GET', data: params })
}

// 兑换奖品
export const exchangeReward = (data: {
  reward_id: number
  target_id: number      // 学生ID或小组ID
  target_type: string    // 'student' 或 'group'
  week?: number          // 周奖时需要
}) => {
  return request({ url: '/stu/reward/exchange', method: 'POST', data })
}

// 获取我的兑换记录
export const getMyExchanges = (params: { student_id: number }) => {
  return request({ url: '/stu/reward/myExchanges', method: 'GET', data: params })
}


export const addReward = (data: any) => {
  return request({ url: '/stu/reward/add', method: 'POST', data })
}

export const editReward = (data: any) => {
  return request({ url: '/stu/reward/edit', method: 'POST', data })
}

export const deleteReward = (data: { id: number }) => {
  return request({ url: '/stu/reward/delete', method: 'POST', data })
}
// 批量兑换（类型1、2）
export const batchExchange = (data: { exchanges: any[] }) => {
	return request({
		url: '/stu/reward/batchExchange',
		method: 'POST',
		data
	})
}

// 批量发放小组奖品（类型3、4）
export const batchGrantGroup = (data: { grants: any[] }) => {
	return request({
		url: '/stu/reward/batchGrantGroup',
		method: 'POST',
		data
	})
}

// 获取兑换记录列表
export const getExchangeList = (params: { class_id: number }) => {
	return request({
		url: '/stu/reward/myExchanges',
		method: 'GET',
		data: params
	})
}

// 更新兑换记录状态
export const updateExchangeStatus = (data: { id: number; status: number }) => {
	return request({
		url: '/stu/reward/updateExchangeStatus',
		method: 'POST',
		data
	})
}