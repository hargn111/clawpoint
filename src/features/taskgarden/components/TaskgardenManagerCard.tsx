import { useEffect, useMemo, useState } from 'react'
import type { TaskgardenTask } from '../../../lib/types'
import {
  useTaskgardenTaskCreate,
  useTaskgardenTaskList,
  useTaskgardenTaskUpdate,
} from '../api/useTaskgardenTasks'

function sortTasks(items: TaskgardenTask[]) {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'open' ? -1 : 1
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export function TaskgardenManagerCard() {
  const { data, isLoading } = useTaskgardenTaskList()
  const createTask = useTaskgardenTaskCreate()
  const updateTask = useTaskgardenTaskUpdate()
  const sourceItems = useMemo(() => sortTasks(data?.items ?? []), [data?.items])
  const [selectedId, setSelectedId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'done'>('all')
  const [bucketFilter, setBucketFilter] = useState<'all' | 'planned' | 'unplanned'>('all')
  const [search, setSearch] = useState('')

  const [title, setTitle] = useState('')
  const [bucket, setBucket] = useState<'planned' | 'unplanned'>('unplanned')
  const [reminderHours, setReminderHours] = useState('')

  const [editTitle, setEditTitle] = useState('')
  const [editBucket, setEditBucket] = useState<'planned' | 'unplanned'>('unplanned')
  const [editStatus, setEditStatus] = useState<'open' | 'done'>('open')
  const [editReminderHours, setEditReminderHours] = useState('')
  const [appendNote, setAppendNote] = useState('')
  const [notice, setNotice] = useState('')

  const filteredItems = useMemo(() => {
    return sourceItems.filter((item) => {
      const statusMatch = statusFilter === 'all' || item.status === statusFilter
      const bucketMatch = bucketFilter === 'all' || item.bucket === bucketFilter
      const searchMatch = !search.trim() || item.title.toLowerCase().includes(search.toLowerCase())
      return statusMatch && bucketMatch && searchMatch
    })
  }, [bucketFilter, search, sourceItems, statusFilter])

  const selected = filteredItems.find((item) => item.id === selectedId) ?? sourceItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? sourceItems[0] ?? null

  const openCount = sourceItems.filter((item) => item.status === 'open').length
  const plannedCount = sourceItems.filter((item) => item.bucket === 'planned' && item.status === 'open').length
  const dueCount = sourceItems.filter((item) => item.status === 'open' && item.remind_interval_hours != null).length

  useEffect(() => {
    if (!sourceItems.length) {
      setSelectedId('')
      return
    }
    if (!selectedId || !sourceItems.some((item) => item.id === selectedId)) {
      setSelectedId(sourceItems[0].id)
    }
  }, [sourceItems, selectedId])

  useEffect(() => {
    if (!selected) {
      setEditTitle('')
      setEditBucket('unplanned')
      setEditStatus('open')
      setEditReminderHours('')
      setAppendNote('')
      return
    }

    setEditTitle(selected.title)
    setEditBucket(selected.bucket === 'planned' ? 'planned' : 'unplanned')
    setEditStatus(selected.status)
    setEditReminderHours(selected.remind_interval_hours == null ? '' : String(selected.remind_interval_hours))
    setAppendNote('')
  }, [selected?.id])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setNotice('')
    const result = await createTask.mutateAsync({
      title,
      bucket,
      remindIntervalHours: reminderHours ? Number(reminderHours) : null,
    })
    setTitle('')
    setBucket('unplanned')
    setReminderHours('')
    setSelectedId(result.item.id)
    setNotice('Task created.')
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!selected) return
    setNotice('')
    await updateTask.mutateAsync({
      id: selected.id,
      input: {
        title: editTitle,
        bucket: editBucket,
        status: editStatus,
        remindIntervalHours: editReminderHours ? Number(editReminderHours) : null,
        appendNote: appendNote.trim() || undefined,
      },
    })
    setAppendNote('')
    setNotice(`Saved ${selected.id}.`)
  }

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Task Garden</p>
          <h3>Manage tasks</h3>
        </div>
        <span className="muted-copy">{isLoading ? 'Loading…' : `${sourceItems.length} tasks`}</span>
      </div>

      <div className="metric-grid metric-grid-compact">
        <div className="metric-card">
          <span className="metric-label">open</span>
          <strong className="metric-value">{openCount}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">planned</span>
          <strong className="metric-value">{plannedCount}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">with reminders</span>
          <strong className="metric-value">{dueCount}</strong>
        </div>
      </div>

      <div className="admin-grid">
        <form className="editor-card" onSubmit={handleCreate}>
          <h4>Create task</h4>
          <label className="field-label">
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="field-label">
            Bucket
            <select value={bucket} onChange={(event) => setBucket(event.target.value as 'planned' | 'unplanned')}>
              <option value="unplanned">Unplanned</option>
              <option value="planned">Planned</option>
            </select>
          </label>
          <label className="field-label">
            Reminder hours
            <input
              type="number"
              min="0"
              step="1"
              value={reminderHours}
              onChange={(event) => setReminderHours(event.target.value)}
              placeholder="Optional"
            />
          </label>
          <div className="hint-row">
            <span className="cli-pill">taskgarden add</span>
            <span className="cli-pill">--remind-interval-hours</span>
          </div>
          <div className="action-row">
            <button className="button-primary" type="submit" disabled={createTask.isPending || !title.trim()}>
              {createTask.isPending ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>

        <div className="editor-card">
          <h4>Tasks</h4>
          <div className="toolbar-stack">
            <label className="field-label field-label-inline field-grow">
              Search
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find by title" />
            </label>
            <div className="field-grid-two-up">
              <label className="field-label field-label-inline">
                Status
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="done">Done</option>
                </select>
              </label>
              <label className="field-label field-label-inline">
                Bucket
                <select value={bucketFilter} onChange={(event) => setBucketFilter(event.target.value as typeof bucketFilter)}>
                  <option value="all">All</option>
                  <option value="planned">Planned</option>
                  <option value="unplanned">Unplanned</option>
                </select>
              </label>
            </div>
          </div>

          {filteredItems.length === 0 && !isLoading ? <div className="empty-state">No tasks match the current filters.</div> : null}
          <div className="selector-list">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`selector-item ${item.id === selected?.id ? 'selector-item-active' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <span>
                  <strong>{item.title}</strong>
                  <span className="selector-copy">
                    {item.id} · {item.bucket} · {item.status}
                  </span>
                </span>
                <span className={`badge badge-${item.status === 'open' ? 'active' : 'idle'}`}>{item.status}</span>
              </button>
            ))}
          </div>
        </div>

        <form className="editor-card" onSubmit={handleSave}>
          <h4>Edit task</h4>
          {!selected ? <div className="empty-state">Select a task to edit.</div> : null}
          {selected ? (
            <>
              <label className="field-label">
                Title
                <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} required />
              </label>
              <div className="field-grid-two-up">
                <label className="field-label">
                  Bucket
                  <select
                    value={editBucket}
                    onChange={(event) => setEditBucket(event.target.value as 'planned' | 'unplanned')}
                  >
                    <option value="unplanned">Unplanned</option>
                    <option value="planned">Planned</option>
                  </select>
                </label>
                <label className="field-label">
                  Status
                  <select value={editStatus} onChange={(event) => setEditStatus(event.target.value as 'open' | 'done')}>
                    <option value="open">Open</option>
                    <option value="done">Done</option>
                  </select>
                </label>
              </div>
              <label className="field-label">
                Reminder hours
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editReminderHours}
                  onChange={(event) => setEditReminderHours(event.target.value)}
                  placeholder="Blank clears reminder"
                />
              </label>
              <label className="field-label">
                Append note
                <textarea
                  value={appendNote}
                  onChange={(event) => setAppendNote(event.target.value)}
                  rows={4}
                  placeholder={selected.note ? selected.note : 'Add context'}
                />
              </label>
              <div className="hint-row">
                <span className="cli-pill">taskgarden set-title</span>
                <span className="cli-pill">taskgarden set-bucket</span>
                <span className="cli-pill">taskgarden set-reminder</span>
              </div>
              <div className="action-row">
                <button className="button-primary" type="submit" disabled={updateTask.isPending || !editTitle.trim()}>
                  {updateTask.isPending ? 'Saving…' : 'Save task'}
                </button>
                {notice ? <span className="muted-copy">{notice}</span> : null}
              </div>
            </>
          ) : null}
        </form>
      </div>
    </section>
  )
}
