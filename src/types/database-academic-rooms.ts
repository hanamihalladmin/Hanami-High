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

type AcademicRoomTables = {
  academic_room_messages: RowTable<
    AcademicRoomMessage,
    Pick<AcademicRoomMessage, 'room_type' | 'channel' | 'author_character_id' | 'body'>
      & Partial<Pick<AcademicRoomMessage, 'section_id' | 'homeroom_code' | 'created_at' | 'updated_at' | 'deleted_at'>>,
    Partial<AcademicRoomMessage>
  >
}

type AcademicRoomFunctions = {
  academic_is_homeroom_member: { Args: { p_homeroom_code: string }; Returns: boolean }
  academic_can_manage_homeroom: { Args: { p_homeroom_code: string }; Returns: boolean }
}

export type HanamiAcademicRoomDatabase = Omit<HanamiCustomizationDatabase, 'public'> & {
  public: Omit<HanamiCustomizationDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: HanamiCustomizationDatabase['public']['Tables'] & AcademicRoomTables
    Functions: HanamiCustomizationDatabase['public']['Functions'] & AcademicRoomFunctions
  }
}
