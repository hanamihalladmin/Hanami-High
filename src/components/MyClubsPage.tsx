import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatSchoolTime } from '../lib/roleplayDate'
import { useIdentity } from '../state/IdentityContext'
import type { CampusGroup, CampusGroupMember } from '../types/database-campus'
import { ShellTopbar } from './ShellTopbar'

type Props = {
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function MyClubsPage({ onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const [memberships, setMemberships] = useState<CampusGroupMember[]>([])
  const [groups, setGroups] = useState<CampusGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)
    const { data: memberData, error: memberError } = await client
      .from('campus_group_members')
      .select('*')
      .eq('character_id', activeCharacter.id)
      .in('status', ['active', 'pending'])
      .order('joined_at')
    if (memberError) {
      setLoading(false)
      setError(memberError.message)
      return
    }
    const nextMemberships = memberData ?? []
    setMemberships(nextMemberships)
    const ids = nextMemberships.map((item) => item.group_id)
    if (!ids.length) {
      setGroups([])
      setLoading(false)
      return
    }
    const { data: groupData, error: groupError } = await client.from('campus_groups').select('*').in('id', ids).order('name')
    setLoading(false)
    if (groupError) return setError(groupError.message)
    setGroups(groupData ?? [])
  }, [activeCharacter])

  useEffect(() => { void load() }, [load])

  const membershipByGroup = useMemo(() => new Map(memberships.map((item) => [item.group_id, item])), [memberships])

  return <main className="content-area my-clubs-page">
    <ShellTopbar eyebrow="HANAMI HIGH" title="My Clubs" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    {error && <div className="identity-notice error">{error}</div>}
    <section className="home-util-panel"><header><div><span className="eyebrow">MY MEMBERSHIPS</span><h2>Clubs & organizations</h2></div><strong>{groups.length}</strong></header>{loading ? <div className="home-util-empty">Loading memberships…</div> : groups.length === 0 ? <div className="home-util-empty">This character has not joined any clubs or organizations yet. Open Campus → Clubs to discover one.</div> : <div className="discover-grid">{groups.map((group) => { const membership = membershipByGroup.get(group.id); return <a className="discover-card" href={`#/campus/${group.group_type === 'student_council' ? 'student-council' : group.group_type === 'organization' ? 'organizations' : 'clubs'}/${encodeURIComponent(group.id)}`} key={group.id}><span className="discover-icon">✿</span><div><strong>{group.name}</strong><span>{membership?.status} · {membership?.member_role}</span><p>{group.meeting_weekday ? `${days[group.meeting_weekday]}${group.meeting_time ? ` · ${formatSchoolTime(group.meeting_time)}` : ''}` : 'Meeting time TBA'} · {group.meeting_room || 'Room TBA'}</p></div><b>›</b></a>})}</div>}</section>
  </main>
}
