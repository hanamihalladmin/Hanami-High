import type { Database } from './database'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type AcademicCourse = {
  id: string
  code: string
  name: string
  subject: string
  description: string | null
  created_at: string
  updated_at: string
}

export type AcademicSection = {
  id: string
  course_id: string
  section_code: string
  school_year: number
  term: string
  room: string | null
  homeroom_code: string | null
  capacity: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AcademicSectionStaff = {
  section_id: string
  character_id: string
  staff_role: string
  assigned_at: string
}

export type AcademicEnrollment = {
  section_id: string
  student_character_id: string
  status: string
  enrolled_at: string
  updated_at: string
}

export type AcademicMeeting = {
  id: string
  section_id: string
  weekday: number
  period_no: number
  starts_at: string
  ends_at: string
  room: string | null
  meeting_kind: string
}

export type SchoolScheduleBlock = {
  id: string
  block_type: string
  title: string
  weekday: number
  starts_at: string
  ends_at: string
  homeroom_label: string | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type SchoolHomeroom = {
  id: string
  legacy_source_id: string | null
  code: string
  school_year: number
  grade_level: number | null
  room_label: string | null
  description: string | null
  advisor_character_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type HomeroomMembership = {
  homeroom_id: string
  student_character_id: string
  student_year: number
  joined_at: string
  updated_at: string
}

export type AcademicAssignment = {
  id: string
  section_id: string
  title: string
  description: string | null
  assignment_type: string
  state: string
  assigned_school_date: string | null
  due_school_date: string | null
  due_time: string | null
  points_possible: number
  late_policy: string | null
  created_by_character_id: string | null
  created_at: string
  updated_at: string
}

export type AcademicSubmission = {
  id: string
  assignment_id: string
  student_character_id: string
  body: string
  status: string
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export type AcademicGrade = {
  assignment_id: string
  student_character_id: string
  points_earned: number | null
  feedback: string | null
  graded_by_character_id: string | null
  graded_at: string | null
  updated_at: string
}

export type AcademicAttendance = {
  id: string
  section_id: string
  student_character_id: string
  school_date: string
  status: string
  note: string | null
  recorded_by_character_id: string | null
  created_at: string
  updated_at: string
}

type AcademicTables = {
  academic_courses: RowTable<
    AcademicCourse,
    Omit<AcademicCourse, 'id' | 'created_at' | 'updated_at'> & { id?: string; description?: string | null; created_at?: string; updated_at?: string },
    Partial<AcademicCourse>
  >
  academic_sections: RowTable<
    AcademicSection,
    Pick<AcademicSection, 'course_id' | 'section_code'> & Partial<Omit<AcademicSection, 'course_id' | 'section_code'>>,
    Partial<AcademicSection>
  >
  academic_section_staff: RowTable<
    AcademicSectionStaff,
    Pick<AcademicSectionStaff, 'section_id' | 'character_id'> & Partial<Omit<AcademicSectionStaff, 'section_id' | 'character_id'>>,
    Partial<AcademicSectionStaff>
  >
  academic_enrollments: RowTable<
    AcademicEnrollment,
    Pick<AcademicEnrollment, 'section_id' | 'student_character_id'> & Partial<Omit<AcademicEnrollment, 'section_id' | 'student_character_id'>>,
    Partial<AcademicEnrollment>
  >
  academic_meetings: RowTable<
    AcademicMeeting,
    Pick<AcademicMeeting, 'section_id' | 'weekday' | 'period_no' | 'starts_at' | 'ends_at'> & Partial<Omit<AcademicMeeting, 'section_id' | 'weekday' | 'period_no' | 'starts_at' | 'ends_at'>>,
    Partial<AcademicMeeting>
  >
  school_schedule_blocks: RowTable<
    SchoolScheduleBlock,
    Pick<SchoolScheduleBlock, 'block_type' | 'title' | 'weekday' | 'starts_at' | 'ends_at'> & Partial<Omit<SchoolScheduleBlock, 'block_type' | 'title' | 'weekday' | 'starts_at' | 'ends_at'>>,
    Partial<SchoolScheduleBlock>
  >
  school_homerooms: RowTable<
    SchoolHomeroom,
    Pick<SchoolHomeroom, 'code'> & Partial<Omit<SchoolHomeroom, 'code'>>,
    Partial<SchoolHomeroom>
  >
  homeroom_memberships: RowTable<
    HomeroomMembership,
    Pick<HomeroomMembership, 'homeroom_id' | 'student_character_id'> & Partial<Omit<HomeroomMembership, 'homeroom_id' | 'student_character_id'>>,
    Partial<HomeroomMembership>
  >
  academic_assignments: RowTable<
    AcademicAssignment,
    Pick<AcademicAssignment, 'section_id' | 'title' | 'created_by_character_id'> & Partial<Omit<AcademicAssignment, 'section_id' | 'title' | 'created_by_character_id'>>,
    Partial<AcademicAssignment>
  >
  academic_submissions: RowTable<
    AcademicSubmission,
    Pick<AcademicSubmission, 'assignment_id' | 'student_character_id'> & Partial<Omit<AcademicSubmission, 'assignment_id' | 'student_character_id'>>,
    Partial<AcademicSubmission>
  >
  academic_grades: RowTable<
    AcademicGrade,
    Pick<AcademicGrade, 'assignment_id' | 'student_character_id'> & Partial<Omit<AcademicGrade, 'assignment_id' | 'student_character_id'>>,
    Partial<AcademicGrade>
  >
  academic_attendance: RowTable<
    AcademicAttendance,
    Pick<AcademicAttendance, 'section_id' | 'student_character_id' | 'school_date' | 'status'> & Partial<Omit<AcademicAttendance, 'section_id' | 'student_character_id' | 'school_date' | 'status'>>,
    Partial<AcademicAttendance>
  >
}

type AcademicFunctions = {
  academic_can_manage_section: { Args: { p_section_id: string }; Returns: boolean }
  academic_is_enrolled: { Args: { p_section_id: string }; Returns: boolean }
}

export type HanamiDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables' | 'Functions'> & {
    Tables: Database['public']['Tables'] & AcademicTables
    Functions: Database['public']['Functions'] & AcademicFunctions
  }
}