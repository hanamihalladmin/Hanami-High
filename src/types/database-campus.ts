import type { HanamiDatabase } from './database-academics'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type CampusGroup = {
  id: string
  slug: string
  name: string
  group_type: string
  description: string | null
  status: string
  open_membership: boolean
  meeting_room: string | null
  meeting_weekday: number | null
  meeting_time: string | null
  advisor_character_id: string | null
  created_by_character_id: string | null
  created_at: string
  updated_at: string
}

export type CampusGroupMember = {
  group_id: string
  character_id: string
  member_role: string
  status: string
  joined_at: string
  updated_at: string
}

export type CampusEvent = {
  id: string
  group_id: string | null
  title: string
  description: string | null
  event_type: string
  school_date: string
  starts_at: string | null
  ends_at: string | null
  location: string | null
  status: string
  capacity: number | null
  created_by_character_id: string | null
  created_at: string
  updated_at: string
}

export type CampusEventRegistration = {
  event_id: string
  character_id: string
  status: string
  created_at: string
  updated_at: string
}

export type CampusOpportunity = {
  id: string
  opportunity_type: string
  title: string
  organization_name: string
  description: string
  location: string | null
  school_start_date: string | null
  application_deadline: string | null
  application_instructions: string | null
  state: string
  created_by_character_id: string | null
  created_at: string
  updated_at: string
}

export type CampusOpportunityApplication = {
  id: string
  opportunity_id: string
  character_id: string
  statement: string
  status: string
  submitted_at: string
  reviewed_at: string | null
  updated_at: string
}

type CampusTables = {
  campus_groups: RowTable<CampusGroup, Pick<CampusGroup, 'slug' | 'name' | 'group_type' | 'created_by_character_id'> & Partial<Omit<CampusGroup, 'slug' | 'name' | 'group_type' | 'created_by_character_id'>>, Partial<CampusGroup>>
  campus_group_members: RowTable<CampusGroupMember, Pick<CampusGroupMember, 'group_id' | 'character_id'> & Partial<Omit<CampusGroupMember, 'group_id' | 'character_id'>>, Partial<CampusGroupMember>>
  campus_events: RowTable<CampusEvent, Pick<CampusEvent, 'title' | 'school_date' | 'created_by_character_id'> & Partial<Omit<CampusEvent, 'title' | 'school_date' | 'created_by_character_id'>>, Partial<CampusEvent>>
  campus_event_registrations: RowTable<CampusEventRegistration, Pick<CampusEventRegistration, 'event_id' | 'character_id'> & Partial<Omit<CampusEventRegistration, 'event_id' | 'character_id'>>, Partial<CampusEventRegistration>>
  campus_opportunities: RowTable<CampusOpportunity, Pick<CampusOpportunity, 'opportunity_type' | 'title' | 'organization_name' | 'description' | 'created_by_character_id'> & Partial<Omit<CampusOpportunity, 'opportunity_type' | 'title' | 'organization_name' | 'description' | 'created_by_character_id'>>, Partial<CampusOpportunity>>
  campus_opportunity_applications: RowTable<CampusOpportunityApplication, Pick<CampusOpportunityApplication, 'opportunity_id' | 'character_id'> & Partial<Omit<CampusOpportunityApplication, 'opportunity_id' | 'character_id'>>, Partial<CampusOpportunityApplication>>
}

type CampusFunctions = {
  campus_can_manage_group: { Args: { p_group_id: string }; Returns: boolean }
  campus_is_group_member: { Args: { p_group_id: string }; Returns: boolean }
}

export type HanamiFullDatabase = Omit<HanamiDatabase, 'public'> & {
  public: Omit<HanamiDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: HanamiDatabase['public']['Tables'] & CampusTables
    Functions: HanamiDatabase['public']['Functions'] & CampusFunctions
  }
}
