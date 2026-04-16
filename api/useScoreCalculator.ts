// composables/useScoreCalculator.ts
import { getCompalteScores } from '@/api/request'

export interface ScoreRecord {
  student_id: number
  student_name: string
  group_id: number
  group_name: string
  week: number
  score: number
}

export interface StudentScore {
  id: number
  name: string
  total: number
  current:number
  group_id: number
  group_name: string
}

export interface GroupScore {
  id: number
  name: string
  description: string
  total: number
  avg: number
  members: { id: number; name: string; score: number }[]
}

export function useScoreCalculator() {
  // 获取积分原始数据
  const fetchScoreRecords = async (classId: number, grade: string, semester: number, week: number = 0): Promise<ScoreRecord[]> => {
    try {
      const res = await getCompalteScores({ classId, grade, semester, week })
      if (res.code === 1) {
        return Array.isArray(res.data) ? res.data : []
      }
      return []
    } catch (error) {
      console.error('获取积分数据失败', error)
      return []
    }
  }

  // 计算学生总积分（从原始记录聚合）
  const calculateStudentTotalScores = (records: ScoreRecord[], localStudents: any[]): StudentScore[] => {
    const studentMap = new Map<number, StudentScore>()
    
    localStudents.forEach((stu: any) => {
      studentMap.set(stu.id, {
        id: stu.id,
        name: stu.name,
        total: 0,
		current:stu.current_points,
        group_id: stu.stu_group_info_id,
        group_name: stu.group_name || ''
      })
    })

    for (const r of records) {
      if (studentMap.has(r.student_id)) {
        studentMap.get(r.student_id)!.total += r.score
        studentMap.get(r.student_id)!.current = r.current_points
      } else {
        studentMap.set(r.student_id, {
          id: r.student_id,
          name: r.student_name,
          total: r.score,
		  current:0,
          group_id: r.group_id,
          group_name: r.group_name || ''
        })
      }
    }

    return Array.from(studentMap.values())
  }

  // 计算学生周积分
  const calculateStudentWeekScores = (records: ScoreRecord[], week: number, localStudents: any[]): StudentScore[] => {
    const weekRecords = records.filter(r => r.week === week)
    return calculateStudentTotalScores(weekRecords, localStudents)
  }

  // 计算小组总积分排名
  const calculateGroupTotalRank = (studentScores: StudentScore[], localGroups: any[]): GroupScore[] => {
    let groups = [...localGroups]
    if (groups.length === 0) {
      const groupIdSet = new Set<number>()
      studentScores.forEach(s => {
        if (s.group_id) groupIdSet.add(s.group_id)
      })
      groups = Array.from(groupIdSet).map(gid => ({
        id: gid,
        name: `第${gid}组`,
        description: ''
      }))
    }

    const groupList: GroupScore[] = []
    for (const g of groups) {
      const members = studentScores
        .filter(s => s.group_id === g.id)
        .map(s => ({ id: s.id, name: s.name, score: s.total }))
      
      if (members.length === 0) continue

      const total = members.reduce((sum, m) => sum + m.score, 0)
      const avg = parseFloat((total / members.length).toFixed(2))

      groupList.push({
        id: g.id,
        name: g.name,
        description: g.description || '',
        total,
        avg,
        members
      })
    }

    // 按平均分降序排序
    groupList.sort((a, b) => {
      if (a.avg !== b.avg) return b.avg - a.avg
      return a.id - b.id
    })

    return groupList
  }

  // 计算小组周积分排名
  const calculateGroupWeekRank = (weekStudentScores: StudentScore[], localGroups: any[]): GroupScore[] => {
    return calculateGroupTotalRank(weekStudentScores, localGroups)
  }

  // 获取小组周积分排名（完整流程）
  const getGroupWeekRank = async (classId: number, grade: string, semester: number, week: number, localStudents: any[], localGroups: any[]): Promise<GroupScore[]> => {
    const records = await fetchScoreRecords(classId, grade, semester, week)
    const weekScores = calculateStudentWeekScores(records, week, localStudents)
    return calculateGroupWeekRank(weekScores, localGroups)
  }

  // 获取小组总积分排名（完整流程）
  const getGroupTotalRank = async (classId: number, grade: string, semester: number, localStudents: any[], localGroups: any[]): Promise<GroupScore[]> => {
    const records = await fetchScoreRecords(classId, grade, semester, 0)
    const studentScores = calculateStudentTotalScores(records, localStudents)
    return calculateGroupTotalRank(studentScores, localGroups)
  }


  return {
    fetchScoreRecords,
    calculateStudentTotalScores,
    calculateStudentWeekScores,
    calculateGroupTotalRank,
    calculateGroupWeekRank,
    getGroupWeekRank,
    getGroupTotalRank,
  }
}