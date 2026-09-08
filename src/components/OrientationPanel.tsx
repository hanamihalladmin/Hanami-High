import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { CharacterOrientation, CharacterOrientationTask } from '../types/database'

type TaskMeta = {
  title: string
  description: string
  available: boolean
  action?: string
  modulePath?: string
  moduleAction?: string
}

const taskMeta: Record<string, TaskMeta> = {
  acceptance_letter: { title: 'Read your acceptance letter', description: 'Your official Hanami High acceptance letter starts your first day.', available: false },
  student_identity: { title: 'Review your student identity', description: 'Confirm the character name and New Student status you are using around campus.', available: true, action: 'Identity reviewed' },
  schedule: { title: 'Review your class schedule', description: 'Your assigned classes and school-day timetable will live in Academics.', available: false },
  network: { title: 'Explore the Hanami Network', description: 'Learn the Home, Messages, Social, Academics, Campus, Boutique, and Profile areas.', available: true, action: 'I know my way around' },
  profile_customization: { title: 'Personalize your profile', description: 'Make your profile your own in Profile Studio, then publish it to complete this step.', available: false, modulePath: '#/profile/profile-studio', moduleAction: 'Open Profile Studio →' },
  boutique_preview: { title: 'Preview the Boutique', description: 'Preview one cosmetic without being required to spend any Petals.', available: false },
}

export function OrientationPanel() {
  const { activeCharacter, refreshIdentity } = useIdentity()
  const [orientation, setOrientation] = useState<CharacterOrientation | null>(null)
  const [tasks, setTasks] = useState<CharacterOrientationTask[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const loadOrientation = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)
    const [orientationResult, taskResult] = await Promise.all([
      client.from('character_orientations').select('*').eq('character_id', activeCharacter.id).maybeSingle(),
      client.from('character_orientation_tasks').select('*').eq('character_id', activeCharacter.id),
    ])
    setLoading(false)
    if (orientationResult.error || taskResult.error) {
      setError(orientationResult.error?.message || taskResult.error?.message || 'Orientation could not be loaded.')
      return
    }
    setOrientation(orientationResult.data)
    setTasks(taskResult.data ?? [])
  }, [activeCharacter])

  useEffect(() => { void loadOrientation() }, [loadOrientation])

  const progress = useMemo(() => {
    const required = tasks.filter((task) => task.required)
    return { completed: required.filter((task) => task.completed_at).length, total: required.length }
  }, [tasks])

  const compactTasks = useMemo(() => {
    if (expanded) return tasks
    const pending = tasks.filter((task) => !task.completed_at)
    if (pending.length >= 2) return pending.slice(0, 2)
    return [...pending, ...tasks.filter((task) => task.completed_at)].slice(0, 2)
  }, [expanded, tasks])

  async function completeTask(taskCode: string) {
    const client = supabase
    if (!client || !activeCharacter) return
    setCompleting(taskCode)
    setError(null)
    const { error: taskError } = await client.rpc('complete_orientation_task', { p_character_id: activeCharacter.id, p_task_code: taskCode })
    setCompleting(null)
    if (taskError) return setError(taskError.message)
    await Promise.all([loadOrientation(), refreshIdentity()])
  }

  if (!activeCharacter || activeCharacter.school_role !== 'new_student') return null
  if (loading) return <section className="orientation-card orientation-live"><div><span className="tag">🌱 NEW STUDENT</span><h2>Loading orientation…</h2></div></section>
  if (!orientation) return <section className="orientation-card orientation-live"><div><span className="tag">🌱 NEW STUDENT</span><h2>Welcome to Hanami High</h2><p>Your orientation record is being prepared.</p></div></section>

  const complete = Boolean(orientation.completed_at)

  return (
    <section className="orientation-live-panel orientation-home-compact">
      <header>
        <div>
          <span className="tag">🌱 NEW STUDENT</span>
          <h2>{complete ? 'Orientation complete' : 'Your Hanami orientation'}</h2>
          <p>{complete ? 'You are ready to explore Hanami on your own. Your New Student role remains until Student Affairs promotes you.' : 'Complete the required first-day steps as Hanami systems become available.'}</p>
        </div>
        <div className="orientation-progress-live"><strong>{progress.completed} / {progress.total}</strong><span>{complete ? 'Complete' : 'required steps'}</span></div>
      </header>

      {error && <div className="identity-notice error">{error}</div>}

      <div className="orientation-task-list">
        {compactTasks.map((task) => {
          const meta = taskMeta[task.task_code] ?? { title: task.task_code, description: '', available: false }
          const done = Boolean(task.completed_at)
          const unavailable = !meta.available && !done
          return (
            <article className={`${done ? 'done' : ''} ${task.required ? '' : 'optional'}`} key={task.task_code}>
              <div className="orientation-check">{done ? '✓' : task.required ? '○' : '＋'}</div>
              <div><strong>{meta.title}{!task.required ? ' · Optional' : ''}</strong><p>{meta.description}</p></div>
              {done ? <span className="orientation-task-state">Complete</span> : meta.modulePath ? <button type="button" onClick={() => { window.location.hash = meta.modulePath! }}>{meta.moduleAction || 'Open module →'}</button> : unavailable ? <span className="orientation-task-state unavailable">Coming with its module</span> : <button type="button" disabled={completing === task.task_code} onClick={() => void completeTask(task.task_code)}>{completing === task.task_code ? 'Saving…' : meta.action || 'Complete'}</button>}
            </article>
          )
        })}
      </div>

      {tasks.length > 2 && <div className="orientation-compact-footer"><span>{expanded ? 'Showing all orientation steps.' : `${Math.max(tasks.length - compactTasks.length, 0)} more step${tasks.length - compactTasks.length === 1 ? '' : 's'} hidden to keep Home tidy.`}</span><button type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Show fewer steps' : 'Show all steps'}</button></div>}
    </section>
  )
}
