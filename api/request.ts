// src/api/request.ts
// 适配 uni-app 的请求封装，确保 token 正确加入请求头

// 配置基础 URL（可根据环境变量配置）
const BASE_URL = 'http://106.12.106.67/api'

// 通用请求方法
const request = <T = any>(options: UniApp.RequestOptions): Promise<T> => {
  return new Promise((resolve, reject) => {
    // 从本地存储获取 token
    const token = uni.getStorageSync('token')
    
    const header: Record<string, string> = {
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
            uni.reLaunch({ url: '/pages/login/login' })
            reject(res.data)
          } else {
            uni.showToast({ title: res.data.msg || '请求失败', icon: 'none' })
            reject(res.data)
          }
        } else if (res.statusCode === 401) {
          uni.removeStorageSync('token')
          uni.removeStorageSync('userInfo')
          uni.reLaunch({ url: '/pages/login/login' })
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
export const login = (data: { username: string; password: string }) => {
  return request({ url: '/stu/teacher/login', method: 'POST', data })
}

// token登录
export const tokenLogin = () => {
  return request({ url: '/stu/teacher/tokenLogin', method: 'POST' })
}

// 教师注册
export const register = (data: { username: string; password: string; name: string; school_id?: number; invite_code?: string }) => {
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
export const getGroups = (classId: number,week:number) => {
  return request({ url: `/stu/teacher/getGroups?class_id=${classId}&week=${week}`, method: 'GET' })
}

// 更新小组积分JSON
export const updateGroupScore = (groupId: number, weeklyJson: any) => {
  return request({ url: '/stu/teacher/updateGroupScore', method: 'POST', data: { group_id: groupId, weekly_json: weeklyJson } })
}

// 获取学校列表（用于注册）
export const getSchoolList = () => {
  return request({ url: '/stu/teacher/schoolList', method: 'GET' })
}

//添加新一周数据
export const addNewWeek = (classId: number,week:number,name:string,weekly_json:object) => {
  return request({ url: '/stu/teacher/addWeek', method: 'POST', data: { class_id: classId,week:week ,name:name,weekly_json:weekly_json} })
}

// 获取班级已有周次列表
export const getClassWeeks = (classId: number) => {
  return request({ url: '/stu/teacher/getClassWeeks', method: 'GET', data: { class_id: classId } })
}

// 创建班级（已存在，但需确认路径）
export const createClass = (data: { name: string; code?: string; grade?: string; semester?: string }) => {
  return request({ url: '/stu/teacher/createClass', method: 'POST', data })
}