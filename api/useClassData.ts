// composables/useClassData.ts
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export interface Student {
  id: number
  name: string
  stu_class_id: number
  stu_group_info_id: number
  group_name?: string
}

export interface Group {
  id: number
  name: string
  description: string
}

export interface ClassInfo {
  id: number
  name: string
  grade: string
  semester: number
}

export function useClassData() {
  const currentClass = ref<ClassInfo | null>(null)
  const className = ref('')
  const semesterText = ref('')
  const totalStudents = ref(0)
  const localStudents = ref<Student[]>([])
  const localGroups = ref<Group[]>([])

  // 加载班级信息
  const loadClassInfo = (): Promise<boolean> => {
    return new Promise((resolve) => {
      uni.getStorage({
        key: 'teacherInfo',
        success(teacherRes) {
          const teacherInfo = teacherRes.data
          const classes = teacherInfo?.classes || []
          if (!classes.length) {
            ElMessage.warning('请先在个人信息中创建或关联班级')
            resolve(false)
            return
          }
          uni.getStorage({
            key: 'currentClassId',
            success(idRes) {
              const classId = idRes.data
              const found = classes.find((c: any) => c.id == classId)
              if (found) {
                currentClass.value = found
                className.value = found.name
                let semester = found.semester
                if (!semester) {
                  const month = new Date().getMonth() + 1
                  semester = month >= 3 && month <= 8 ? 2 : 1
                }
                semesterText.value = semester === 1 ? '上学期' : '下学期'
                resolve(true)
              } else {
                ElMessage.error('未找到对应的班级信息')
                resolve(false)
              }
            },
            fail() {
              ElMessage.error('未找到当前班级ID，请先进入学生管理页面')
              resolve(false)
            }
          })
        },
        fail() {
          ElMessage.error('未找到教师信息，请重新登录')
          resolve(false)
        }
      })
    })
  }

  // 加载本地学生和小组数据
  const loadLocalData = (): Promise<boolean> => {
    return new Promise((resolve) => {
      uni.getStorage({
        key: 'student',
        success(res) {
          const studentData = Array.isArray(res.data.list) ? res.data.list : []
          if (studentData.length > 0 && currentClass.value) {
            const firstStudent = studentData[0]
            if (firstStudent.stu_class_id && firstStudent.stu_class_id !== currentClass.value.id) {
              ElMessage.error('当前班级与本地学生数据不匹配，请先到学生管理界面获取当前班级学生数据')
              localStudents.value = []
              totalStudents.value = 0
              localGroups.value = []
              resolve(false)
              return
            }
          }
          localStudents.value = studentData
		  console.log(localStudents.value)
          totalStudents.value = localStudents.value.length
          uni.getStorage({
            key: 'group',
            success(groupRes) {
              localGroups.value = Array.isArray(groupRes.data) ? groupRes.data : []
              resolve(true)
            },
            fail() {
              localGroups.value = []
              resolve(true)
            }
          })
        },
        fail() {
          localStudents.value = []
          totalStudents.value = 0
          uni.getStorage({
            key: 'group',
            success(groupRes) {
              localGroups.value = Array.isArray(groupRes.data) ? groupRes.data : []
              resolve(true)
            },
            fail() {
              localGroups.value = []
              resolve(true)
            }
          })
        }
      })
    })
  }

  return {
    currentClass,
    className,
    semesterText,
    totalStudents,
    localStudents,
    localGroups,
    loadClassInfo,
    loadLocalData
  }
}