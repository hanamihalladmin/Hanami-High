import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatHanamiSchoolDate, formatSchoolTime, hanamiRoleplayDate, HANAMI_SCHOOL_YEAR } from '../lib/roleplayDate'
import { useIdentity } from '../state/IdentityContext'
import type {
  CampusEvent,
  CampusEventRegistration,
  CampusGroup,
  CampusGroupMember,
  CampusOpportunity,
  CampusOpportunityApplication,
} from '../types/database-campus'
import type { SearchDocument } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'campus-overview' | 'events' | 'clubs' | 'organizations' | 'opportunities' | 'student-council'

type Props = {
  mode: Mode
  targetId?: string
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

type IdentitySummary = Pick<SearchDocument, 'entity_id' | 'title' | 'subtitle'>

const modeMeta: Record<Mode, { title: string; description: string }> = {
  'campus-overview': { title: 'Campus Overview', description: 'What is happening around Hanami after class.' },
  events: { title: 'Events', description: 'School, club, organization, and community events.' },
  clubs: { title: 'Clubs', description: 'Student clubs, membership, and club spaces.' },
  organizations: { title: 'Organizations', description: 'School organizations, committees, and groups.' },
  opportunities: { title: 'Opportunities', description: 'Jobs, internships, volunteer work, and campus roles.' },
  'student-council': { title: 'Student Council', description: 'Student government membership and council activity.' },
}

const weekdayLabels = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function CampusPage({ mode, targetId, onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter, capabilities } = useIdentity()
  const [groups, setGroups] = useState<CampusGroup[]>([])
  const [members, setMembers] = useState<CampusGroupMember[]>([])
  const [events, setEvents] = useState<CampusEvent[]>([])
  const [registrations, setRegistrations] = useState<CampusEventRegistration[]>([])
  const [opportunities, setOpportunities] = useState<CampusOpportunity[]>([])
  const [applications, setApplications] = useState<CampusOpportunityApplication[]>([])
  const [identities, setIdentities] = useState<Record<string, IdentitySummary>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [working, setWorking] = useState<string | null>(null)
  const [applicationStatements, setApplicationStatements] = useState<Record<string, string>>({})
  const [groupDraft, setGroupDraft] = useState({ type: 'club', name: '', slug: '', description: '', room: '', weekday: '', time: '' })
  const [eventDraft, setEventDraft] = useState({ groupId: '', title: '', description: '', type: 'school', date: hanamiRoleplayDate(), start: '', end: '', location: '', capacity: '', status: 'published' })
  const [opportunityDraft, setOpportunityDraft] = useState({ type: 'job', title: '', organization: '', description: '', location: '', startDate: '', deadline: '', instructions: '', state: 'published' })

  const isSchoolAdmin = capabilities.includes('school.configure')
  const isStudentCharacter = activeCharacter?.character_kind === 'student' && ['new_student', 'student'].includes(activeCharacter.school_role ?? '')
  const today = hanamiRoleplayDate()

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)

    const [groupResult, memberResult, eventResult, registrationResult, opportunityResult, applicationResult] = await Promise.all([
      client.from('campus_groups').select('*').order('name'),
      client.from('campus_group_members').select('*').order('joined_at'),
      client.from('campus_events').select('*').order('school_date').order('starts_at', { ascending: true, nullsFirst: false }),
      client.from('campus_event_registrations').select('*').order('created_at'),
      client.from('campus_opportunities').select('*').order('application_deadline', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }),
      client.from('campus_opportunity_applications').select('*').order('submitted_at', { ascending: false }),
    ])
    const firstError = [groupResult.error, memberResult.error, eventResult.error, registrationResult.error, opportunityResult.error, applicationResult.error].find(Boolean)
    if (firstError) {
      setLoading(false)
      setError(firstError.message)
      return
    }

    const nextMembers = memberResult.data ?? []
    const nextApplications = applicationResult.data ?? []
    setGroups(groupResult.data ?? [])
    setMembers(nextMembers)
    setEvents(eventResult.data ?? [])
    setRegistrations(registrationResult.data ?? [])
    setOpportunities(opportunityResult.data ?? [])
    setApplications(nextApplications)
    setApplicationStatements(Object.fromEntries(nextApplications.filter((item) => item.character_id === activeCharacter.id).map((item) => [item.opportunity_id, item.statement])))

    const characterIds = Array.from(new Set(nextMembers.map((item) => item.character_id)))
    if (characterIds.length) {
      const identityResult = await client.from('search_documents').select('entity_id,title,subtitle').eq('document_type', 'character').in('entity_id', characterIds)
      if (!identityResult.error) setIdentities(Object.fromEntries((identityResult.data ?? []).filter((item) => item.entity_id).map((item) => [item.entity_id as string, item])))
    } else setIdentities({})
    setLoading(false)
  }, [activeCharacter])

  useEffect(() => { void load() }, [load])

  const groupById = useMemo(() => new Map(groups.map((item) => [item.id, item])), [groups])
  const ownMemberships = useMemo(() => members.filter((item) => item.character_id === activeCharacter?.id), [activeCharacter, members])
  const managedGroupIds = useMemo(() => new Set(isSchoolAdmin ? groups.map((item) => item.id) : ownMemberships.filter((item) => item.status === 'active' && ['officer', 'president', 'advisor'].includes(item.member_role)).map((item) => item.group_id)), [groups, isSchoolAdmin, ownMemberships])
  const ownActiveGroups = useMemo(() => ownMemberships.filter((item) => item.status === 'active').map((item) => groupById.get(item.group_id)).filter((item): item is CampusGroup => Boolean(item)), [groupById, ownMemberships])
  const upcomingEvents = useMemo(() => events.filter((item) => item.status === 'published' && item.school_date >= today), [events, today])
  const publishedOpportunities = useMemo(() => opportunities.filter((item) => item.state === 'published'), [opportunities])

  useEffect(() => {
    if (!eventDraft.groupId && managedGroupIds.size && !isSchoolAdmin) {
      setEventDraft((current) => ({ ...current, groupId: Array.from(managedGroupIds)[0] }))
    }
  }, [eventDraft.groupId, isSchoolAdmin, managedGroupIds])

  function identityName(characterId: string) {
    if (characterId === activeCharacter?.id) return activeCharacter.display_name || activeCharacter.first_name || 'Your Character'
    return identities[characterId]?.title || 'Hanami Character'
  }

  function ownMembership(groupId: string) {
    return ownMemberships.find((item) => item.group_id === groupId)
  }

  function ownRegistration(eventId: string) {
    return registrations.find((item) => item.event_id === eventId && item.character_id === activeCharacter?.id)
  }

  function ownApplication(opportunityId: string) {
    return applications.find((item) => item.opportunity_id === opportunityId && item.character_id === activeCharacter?.id)
  }

  async function joinGroup(group: CampusGroup) {
    const client = supabase
    if (!client || !activeCharacter) return
    setWorking(`group:${group.id}`); setError(null); setNotice(null)
    const { error: joinError } = await client.from('campus_group_members').insert({ group_id: group.id, character_id: activeCharacter.id, member_role: 'member', status: 'pending' })
    setWorking(null)
    if (joinError) return setError(joinError.message)
    setNotice(`Membership request sent to ${group.name}.`)
    await load()
  }

  async function leaveGroup(groupId: string) {
    const client = supabase
    if (!client || !activeCharacter) return
    setWorking(`group:${groupId}`)
    const { error: leaveError } = await client.from('campus_group_members').delete().eq('group_id', groupId).eq('character_id', activeCharacter.id)
    setWorking(null)
    if (leaveError) return setError(leaveError.message)
    setNotice('Membership removed.')
    await load()
  }

  async function reviewMembership(member: CampusGroupMember, accept: boolean) {
    const client = supabase
    if (!client) return
    setWorking(`member:${member.group_id}:${member.character_id}`)
    const { error: reviewError } = await client.from('campus_group_members').update({ status: accept ? 'active' : 'declined' }).eq('group_id', member.group_id).eq('character_id', member.character_id)
    setWorking(null)
    if (reviewError) return setError(reviewError.message)
    setNotice(accept ? 'Member approved.' : 'Membership request declined.')
    await load()
  }

  async function setRsvp(event: CampusEvent, status: 'going' | 'interested' | 'cancelled') {
    const client = supabase
    if (!client || !activeCharacter) return
    const existing = ownRegistration(event.id)
    setWorking(`event:${event.id}`)
    const result = existing
      ? await client.from('campus_event_registrations').update({ status }).eq('event_id', event.id).eq('character_id', activeCharacter.id)
      : await client.from('campus_event_registrations').insert({ event_id: event.id, character_id: activeCharacter.id, status })
    setWorking(null)
    if (result.error) return setError(result.error.message)
    setNotice('Event response saved.')
    await load()
  }

  async function applyOpportunity(opportunity: CampusOpportunity) {
    const client = supabase
    if (!client || !activeCharacter) return
    const existing = ownApplication(opportunity.id)
    const statement = applicationStatements[opportunity.id]?.trim() || ''
    setWorking(`opportunity:${opportunity.id}`)
    const result = existing
      ? await client.from('campus_opportunity_applications').update({ statement, status: 'submitted' }).eq('id', existing.id)
      : await client.from('campus_opportunity_applications').insert({ opportunity_id: opportunity.id, character_id: activeCharacter.id, statement, status: 'submitted' })
    setWorking(null)
    if (result.error) return setError(result.error.message)
    setNotice('Application submitted through Hanami.')
    await load()
  }

  async function withdrawApplication(application: CampusOpportunityApplication) {
    const client = supabase
    if (!client) return
    setWorking(`opportunity:${application.opportunity_id}`)
    const { error: updateError } = await client.from('campus_opportunity_applications').update({ status: 'withdrawn' }).eq('id', application.id)
    setWorking(null)
    if (updateError) return setError(updateError.message)
    setNotice('Application withdrawn.')
    await load()
  }

  async function reviewApplication(application: CampusOpportunityApplication, status: 'reviewing' | 'accepted' | 'declined') {
    const client = supabase
    if (!client) return
    setWorking(`application:${application.id}`)
    const { error: updateError } = await client.from('campus_opportunity_applications').update({ status, reviewed_at: new Date().toISOString() }).eq('id', application.id)
    setWorking(null)
    if (updateError) return setError(updateError.message)
    setNotice('Application status updated.')
    await load()
  }

  async function createGroup() {
    const client = supabase
    if (!client || !activeCharacter) return
    setWorking('new-group')
    const { error: createError } = await client.from('campus_groups').insert({
      slug: groupDraft.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-'), name: groupDraft.name.trim(), group_type: groupDraft.type,
      description: groupDraft.description.trim() || null, meeting_room: groupDraft.room.trim() || null,
      meeting_weekday: groupDraft.weekday ? Number(groupDraft.weekday) : null, meeting_time: groupDraft.time || null,
      created_by_character_id: activeCharacter.id, status: 'active', open_membership: true,
    })
    setWorking(null)
    if (createError) return setError(createError.message)
    setGroupDraft((current) => ({ ...current, name: '', slug: '', description: '', room: '', weekday: '', time: '' }))
    setNotice('Campus group created.')
    await load()
  }

  async function createEvent() {
    const client = supabase
    if (!client || !activeCharacter) return
    setWorking('new-event')
    const { error: createError } = await client.from('campus_events').insert({
      group_id: eventDraft.groupId || null, title: eventDraft.title.trim(), description: eventDraft.description.trim() || null,
      event_type: eventDraft.type, school_date: eventDraft.date, starts_at: eventDraft.start || null, ends_at: eventDraft.end || null,
      location: eventDraft.location.trim() || null, capacity: eventDraft.capacity ? Number(eventDraft.capacity) : null,
      status: eventDraft.status, created_by_character_id: activeCharacter.id,
    })
    setWorking(null)
    if (createError) return setError(createError.message)
    setEventDraft((current) => ({ ...current, title: '', description: '', start: '', end: '', location: '', capacity: '' }))
    setNotice('Campus event created.')
    await load()
  }

  async function createOpportunity() {
    const client = supabase
    if (!client || !activeCharacter) return
    setWorking('new-opportunity')
    const { error: createError } = await client.from('campus_opportunities').insert({
      opportunity_type: opportunityDraft.type, title: opportunityDraft.title.trim(), organization_name: opportunityDraft.organization.trim(),
      description: opportunityDraft.description.trim(), location: opportunityDraft.location.trim() || null,
      school_start_date: opportunityDraft.startDate || null, application_deadline: opportunityDraft.deadline || null,
      application_instructions: opportunityDraft.instructions.trim() || null, state: opportunityDraft.state,
      created_by_character_id: activeCharacter.id,
    })
    setWorking(null)
    if (createError) return setError(createError.message)
    setOpportunityDraft((current) => ({ ...current, title: '', organization: '', description: '', location: '', startDate: '', deadline: '', instructions: '' }))
    setNotice('Opportunity created.')
    await load()
  }

  if (!activeCharacter) return null

  function renderGroupCards(groupType: 'club' | 'organization' | 'student_council') {
    const visible = groups.filter((group) => group.group_type === groupType)
    return <>
      <div className="campus-card-grid">
        {visible.length === 0 ? <div className="campus-empty">No {groupType === 'student_council' ? 'student council groups' : `${groupType}s`} are published yet.</div> : visible.map((group) => {
          const membership = ownMembership(group.id)
          const groupMembers = members.filter((item) => item.group_id === group.id && item.status === 'active')
          const pending = members.filter((item) => item.group_id === group.id && item.status === 'pending')
          const canManage = managedGroupIds.has(group.id)
          return <article className={`campus-group-card ${targetId === group.id ? 'targeted' : ''}`} key={group.id}>
            <span className="eyebrow">{group.group_type.replace('_', ' ')}</span><h2>{group.name}</h2><p>{group.description || 'No description has been published yet.'}</p>
            <dl><div><dt>Meeting</dt><dd>{group.meeting_weekday ? weekdayLabels[group.meeting_weekday] : 'TBA'}{group.meeting_time ? ` · ${formatSchoolTime(group.meeting_time)}` : ''}</dd></div><div><dt>Room</dt><dd>{group.meeting_room || 'TBA'}</dd></div><div><dt>Members</dt><dd>{groupMembers.length}</dd></div></dl>
            {groupMembers.length > 0 && <div className="campus-member-strip">{groupMembers.slice(0, 8).map((item) => <span key={item.character_id}>{identityName(item.character_id)}{item.member_role !== 'member' ? ` · ${item.member_role}` : ''}</span>)}</div>}
            <footer>{!membership && group.open_membership ? <button className="primary-action" disabled={working === `group:${group.id}`} onClick={() => void joinGroup(group)}>Request to join</button> : membership?.status === 'pending' ? <><span>Membership pending</span><button onClick={() => void leaveGroup(group.id)}>Cancel request</button></> : membership?.status === 'active' ? <><span>{membership.member_role}</span><button onClick={() => void leaveGroup(group.id)}>Leave</button></> : membership ? <span>{membership.status}</span> : <span>Membership closed</span>}</footer>
            {canManage && pending.length > 0 && <div className="campus-pending"><strong>Pending requests</strong>{pending.map((item) => <div key={item.character_id}><span>{identityName(item.character_id)}</span><button disabled={working === `member:${item.group_id}:${item.character_id}`} onClick={() => void reviewMembership(item, false)}>Decline</button><button className="primary-action" disabled={working === `member:${item.group_id}:${item.character_id}`} onClick={() => void reviewMembership(item, true)}>Approve</button></div>)}</div>}
          </article>
        })}
      </div>
      {isSchoolAdmin && <section className="campus-panel"><header><div><span className="eyebrow">SCHOOL CONFIGURATION</span><h2>Create campus group</h2></div></header><form className="campus-admin-form" onSubmit={(event) => { event.preventDefault(); void createGroup() }}><select value={groupDraft.type} onChange={(event) => setGroupDraft({ ...groupDraft, type: event.target.value })}><option value="club">Club</option><option value="organization">Organization</option><option value="student_council">Student Council</option></select><input required placeholder="Group name" value={groupDraft.name} onChange={(event) => setGroupDraft({ ...groupDraft, name: event.target.value })}/><input required placeholder="URL slug" value={groupDraft.slug} onChange={(event) => setGroupDraft({ ...groupDraft, slug: event.target.value })}/><textarea placeholder="Description" value={groupDraft.description} onChange={(event) => setGroupDraft({ ...groupDraft, description: event.target.value })}/><div className="campus-inline"><input placeholder="Meeting room" value={groupDraft.room} onChange={(event) => setGroupDraft({ ...groupDraft, room: event.target.value })}/><select value={groupDraft.weekday} onChange={(event) => setGroupDraft({ ...groupDraft, weekday: event.target.value })}><option value="">Meeting day TBA</option>{[1,2,3,4,5].map((day) => <option key={day} value={day}>{weekdayLabels[day]}</option>)}</select><input type="time" value={groupDraft.time} onChange={(event) => setGroupDraft({ ...groupDraft, time: event.target.value })}/></div><button className="primary-action" disabled={working === 'new-group'}>Create group</button></form></section>}
    </>
  }

  function renderEvents() {
    const canCreate = isSchoolAdmin || managedGroupIds.size > 0
    return <>
      {canCreate && <section className="campus-panel"><header><div><span className="eyebrow">EVENT TOOLS</span><h2>Create event</h2></div><span>2006 school calendar</span></header><form className="campus-admin-form" onSubmit={(event) => { event.preventDefault(); void createEvent() }}><select value={eventDraft.groupId} onChange={(event) => setEventDraft({ ...eventDraft, groupId: event.target.value })}>{isSchoolAdmin && <option value="">School-wide event</option>}{Array.from(managedGroupIds).map((id) => <option key={id} value={id}>{groupById.get(id)?.name || 'Campus group'}</option>)}</select><input required placeholder="Event title" value={eventDraft.title} onChange={(event) => setEventDraft({ ...eventDraft, title: event.target.value })}/><textarea placeholder="Event description" value={eventDraft.description} onChange={(event) => setEventDraft({ ...eventDraft, description: event.target.value })}/><div className="campus-inline"><select value={eventDraft.type} onChange={(event) => setEventDraft({ ...eventDraft, type: event.target.value })}><option value="school">School</option><option value="club">Club</option><option value="organization">Organization</option><option value="community">Community</option><option value="student_council">Student Council</option></select><input required type="date" min="2006-01-01" max="2006-12-31" value={eventDraft.date} onChange={(event) => setEventDraft({ ...eventDraft, date: event.target.value })}/><input type="time" value={eventDraft.start} onChange={(event) => setEventDraft({ ...eventDraft, start: event.target.value })}/><input type="time" value={eventDraft.end} onChange={(event) => setEventDraft({ ...eventDraft, end: event.target.value })}/></div><div className="campus-inline"><input placeholder="Location" value={eventDraft.location} onChange={(event) => setEventDraft({ ...eventDraft, location: event.target.value })}/><input type="number" min="1" placeholder="Capacity" value={eventDraft.capacity} onChange={(event) => setEventDraft({ ...eventDraft, capacity: event.target.value })}/><select value={eventDraft.status} onChange={(event) => setEventDraft({ ...eventDraft, status: event.target.value })}><option value="published">Publish</option><option value="draft">Draft</option></select></div><button className="primary-action" disabled={working === 'new-event'}>Create event</button></form></section>}
      <section className="campus-panel"><header><div><span className="eyebrow">CAMPUS CALENDAR</span><h2>Events</h2></div><strong>{events.length}</strong></header>{events.length === 0 ? <div className="campus-empty">No campus events are visible yet.</div> : <div className="campus-event-list">{events.map((event) => { const registration = ownRegistration(event.id); return <article className={`campus-event-row ${targetId === event.id ? 'targeted' : ''}`} key={event.id}><div className="campus-event-date"><strong>{new Date(`${event.school_date}T12:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})}</strong><span>2006</span></div><div><span className="eyebrow">{event.event_type.replace('_',' ')} · {event.status}</span><h3>{event.title}</h3><p>{event.description || 'No event description.'}</p><small>{event.starts_at ? formatSchoolTime(event.starts_at) : 'Time TBA'} · {event.location || 'Location TBA'}{event.group_id ? ` · ${groupById.get(event.group_id)?.name || 'Campus group'}` : ''}</small></div>{event.status === 'published' && <div className="campus-event-actions"><span>{registration ? registration.status : 'No response'}</span><button onClick={() => void setRsvp(event,'interested')}>Interested</button><button className="primary-action" onClick={() => void setRsvp(event,'going')}>Going</button></div>}</article>})}</div>}</section>
    </>
  }

  function renderOpportunities() {
    return <>
      {isSchoolAdmin && <section className="campus-panel"><header><div><span className="eyebrow">ADMINISTRATION</span><h2>Publish opportunity</h2></div></header><form className="campus-admin-form" onSubmit={(event) => { event.preventDefault(); void createOpportunity() }}><div className="campus-inline"><select value={opportunityDraft.type} onChange={(event) => setOpportunityDraft({ ...opportunityDraft, type: event.target.value })}><option value="job">Job</option><option value="internship">Internship</option><option value="volunteer">Volunteer</option><option value="campus_role">Campus role</option></select><input required placeholder="Title" value={opportunityDraft.title} onChange={(event) => setOpportunityDraft({ ...opportunityDraft, title: event.target.value })}/><input required placeholder="Organization" value={opportunityDraft.organization} onChange={(event) => setOpportunityDraft({ ...opportunityDraft, organization: event.target.value })}/></div><textarea required placeholder="Description" value={opportunityDraft.description} onChange={(event) => setOpportunityDraft({ ...opportunityDraft, description: event.target.value })}/><div className="campus-inline"><input placeholder="Location" value={opportunityDraft.location} onChange={(event) => setOpportunityDraft({ ...opportunityDraft, location: event.target.value })}/><input type="date" min="2006-01-01" max="2006-12-31" value={opportunityDraft.startDate} onChange={(event) => setOpportunityDraft({ ...opportunityDraft, startDate: event.target.value })}/><input type="date" min="2006-01-01" max="2006-12-31" value={opportunityDraft.deadline} onChange={(event) => setOpportunityDraft({ ...opportunityDraft, deadline: event.target.value })}/><select value={opportunityDraft.state} onChange={(event) => setOpportunityDraft({ ...opportunityDraft, state: event.target.value })}><option value="published">Publish</option><option value="draft">Draft</option></select></div><input placeholder="Internal application instructions" value={opportunityDraft.instructions} onChange={(event) => setOpportunityDraft({ ...opportunityDraft, instructions: event.target.value })}/><button className="primary-action" disabled={working === 'new-opportunity'}>Create opportunity</button></form></section>}
      <section className="campus-panel"><header><div><span className="eyebrow">OPPORTUNITIES BOARD</span><h2>Open listings</h2></div><strong>{publishedOpportunities.length}</strong></header>{opportunities.length === 0 ? <div className="campus-empty">No opportunities are visible yet.</div> : opportunities.map((opportunity) => { const application = ownApplication(opportunity.id); const adminApplications = applications.filter((item) => item.opportunity_id === opportunity.id); return <article className={`opportunity-card ${targetId === opportunity.id ? 'targeted' : ''}`} key={opportunity.id}><header><div><span className="eyebrow">{opportunity.opportunity_type} · {opportunity.state}</span><h3>{opportunity.title}</h3><small>{opportunity.organization_name} · {opportunity.location || 'Campus'}</small></div><div><span>Deadline</span><strong>{opportunity.application_deadline ? formatHanamiSchoolDate(opportunity.application_deadline) : 'Open'}</strong></div></header><p>{opportunity.description}</p>{opportunity.application_instructions && <div className="campus-instructions"><strong>How to apply</strong><span>{opportunity.application_instructions}</span></div>}{isStudentCharacter && opportunity.state === 'published' && <div className="opportunity-apply"><textarea placeholder="Application statement" value={applicationStatements[opportunity.id] ?? ''} onChange={(event) => setApplicationStatements({ ...applicationStatements, [opportunity.id]: event.target.value })}/><div><span>{application ? `Status: ${application.status}` : 'Apply through Hanami — no external email required.'}</span>{application && application.status !== 'withdrawn' && <button onClick={() => void withdrawApplication(application)}>Withdraw</button>}<button className="primary-action" disabled={working === `opportunity:${opportunity.id}`} onClick={() => void applyOpportunity(opportunity)}>{application ? 'Update application' : 'Apply'}</button></div></div>}{isSchoolAdmin && adminApplications.length > 0 && <div className="opportunity-review"><strong>Applications</strong>{adminApplications.map((item) => <div key={item.id}><span>{identityName(item.character_id)}</span><small>{item.statement || 'No statement'}</small><select value={item.status} disabled={working === `application:${item.id}`} onChange={(event) => void reviewApplication(item, event.target.value as 'reviewing'|'accepted'|'declined')}><option value="submitted">Submitted</option><option value="reviewing">Reviewing</option><option value="accepted">Accepted</option><option value="declined">Declined</option><option value="withdrawn">Withdrawn</option></select></div>)}</div>}</article>})}</section>
    </>
  }

  function renderOverview() {
    return <><div className="campus-stat-grid"><article><span>MY GROUPS</span><strong>{ownActiveGroups.length}</strong><small>active memberships</small></article><article><span>UPCOMING</span><strong>{upcomingEvents.length}</strong><small>published events</small></article><article><span>OPPORTUNITIES</span><strong>{publishedOpportunities.length}</strong><small>open listings</small></article><article><span>ROLEPLAY DATE</span><strong>{today.slice(5).replace('-','.')}</strong><small>{HANAMI_SCHOOL_YEAR}</small></article></div><section className="campus-panel"><header><div><span className="eyebrow">NEXT AROUND CAMPUS</span><h2>Upcoming events</h2></div></header>{upcomingEvents.length === 0 ? <div className="campus-empty">Nothing is scheduled yet.</div> : upcomingEvents.slice(0,5).map((event) => <article className="campus-summary-row" key={event.id}><div><strong>{event.title}</strong><span>{event.group_id ? groupById.get(event.group_id)?.name || 'Campus group' : 'Hanami High'}</span></div><div><b>{formatHanamiSchoolDate(event.school_date)}</b><small>{event.starts_at ? formatSchoolTime(event.starts_at) : 'Time TBA'}</small></div></article>)}</section></>
  }

  return <main className="content-area campus-page"><ShellTopbar eyebrow="CAMPUS" title={modeMeta[mode].title} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/><div className="campus-intro"><div><span className="eyebrow">AFTER SCHOOL · {HANAMI_SCHOOL_YEAR}</span><p>{modeMeta[mode].description}</p></div><strong>{formatHanamiSchoolDate(today)}</strong></div>{error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}{loading ? <div className="campus-empty loading">Loading campus activity…</div> : mode === 'campus-overview' ? renderOverview() : mode === 'events' ? renderEvents() : mode === 'clubs' ? renderGroupCards('club') : mode === 'organizations' ? renderGroupCards('organization') : mode === 'student-council' ? renderGroupCards('student_council') : renderOpportunities()}</main>
}
