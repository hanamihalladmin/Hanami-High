import type { HanamiFullDatabase } from './database-campus'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type SchoolAnnouncement = {
  id: string
  title: string
  body: string
  category: string
  state: string
  pinned: boolean
  school_date: string | null
  expires_school_date: string | null
  created_by_character_id: string | null
  created_at: string
  updated_at: string
}

export type CharacterPresence = {
  character_id: string
  account_id: string
  status: string
  current_section: string | null
  current_subsection: string | null
  last_seen_at: string
  updated_at: string
}

type HomeTables = {
  school_announcements: RowTable<
    SchoolAnnouncement,
    Pick<SchoolAnnouncement, 'title' | 'body' | 'created_by_character_id'> & Partial<Omit<SchoolAnnouncement, 'title' | 'body' | 'created_by_character_id'>>,
    Partial<SchoolAnnouncement>
  >
  character_presence: RowTable<
    CharacterPresence,
    Pick<CharacterPresence, 'character_id' | 'account_id'> & Partial<Omit<CharacterPresence, 'character_id' | 'account_id'>>,
    Partial<CharacterPresence>
  >
}

export type HanamiAppDatabase = Omit<HanamiFullDatabase, 'public'> & {
  public: Omit<HanamiFullDatabase['public'], 'Tables'> & {
    Tables: HanamiFullDatabase['public']['Tables'] & HomeTables
    Functions: HanamiFullDatabase['public']['Functions']
  }
}
