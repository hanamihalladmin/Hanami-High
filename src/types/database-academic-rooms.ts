import type { HanamiCustomizationDatabase } from './database-customization'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type AcademicRoomType = 'class' | 'homeroom'
export type AcademicRoomChannel = 'general' | 'announcements' | 'questions' | 'lounge'

export type AcademicRoomMessage = {
  id: string
  room_type: AcademicRoomType
  section_id: string | null
  homeroom_code: string | null
  channel: AcademicRoomChannel
  author_character_id: string
  body: string
  created_at: string
  updated_at: string
  deleted_at: string | null
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

type AcademicRoomTables = {
  academic_room_messages: RowTable<
    AcademicRoomMessage,
    Pick<AcademicRoomMessage, 'room_type' | 'channel' | 'author_character_id' | 'body'>
      & Partial<Pick<AcademicRoomMessage, 'section_id' | 'homeroom_code' | 'created_at' | 'updated_at' | 'deleted_at'>>,
    Partial<AcademicRoomMessage>
  >
  school_homerooms: RowTable<
    SchoolHomeroom,
    Pick<SchoolHomeroom, 'code'> & Partial<Omit<SchoolHomeroom, 'id' | 'code'>>,
    Partial<SchoolHomeroom>
  >
  homeroom_memberships: RowTable<
    HomeroomMembership,
    Pick<HomeroomMembership, 'homeroom_id' | 'student_character_id'> & Partial<Omit<HomeroomMembership, 'homeroom_id' | 'student_character_id'>>,
    Partial<HomeroomMembership>
  >
}

type AcademicRoomFunctions = {
  academic_is_homeroom_member: { Args: { p_homeroom_code: string }; Returns: boolean }
  academic_can_manage_homeroom: { Args: { p_homeroom_code: string }; Returns: boolean }
  delete_my_character: { Args: { p_character_id: string; p_confirmation: string }; Returns: number }
}

export type HanamiAcademicRoomDatabase = Omit<HanamiCustomizationDatabase, 'public'> & {
  public: Omit<HanamiCustomizationDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: HanamiCustomizationDatabase['public']['Tables'] & AcademicRoomTables
    Functions: HanamiCustomizationDatabase['public']['Functions'] & AcademicRoomFunctions
  }
}
