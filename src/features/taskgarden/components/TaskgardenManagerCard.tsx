import { useCallback, useEffect, useMemo, useState } from 'react'
import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useDrawerFocus } from '../../../components/common/useDrawerFocus'
import type { TaskgardenTask } from '../../../lib/types'
import {
  useTaskgardenTaskCreate,
  useTaskgardenTaskList,
  useTaskgardenTaskUpdate,
} from '../api/useTaskgardenTasks'

const NEW_TASK_ID = '__new_task__'

type TaskEditorState = {
  title: string
  bucket: 'planned' | 'unplanned'
  status: 'open' | 'done'
  reminderHours: string
  note: string
  appendNote: string
}

function sortTasks(items: TaskgardenTask[]) {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'open' ? -1 : 1
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

function buildEditorState(task?: TaskgardenTask | null): TaskEditorState {
  return {
    title: task?.title ?? '',
    bucket: task?.bucket === 'planned' ? 'planned' : 'unplanned',
    status: task?.status ?? 'open',
    reminderHours: task?.remind_interval_hours == null ? '' : String(task.remind_interval_hours),
    note: task?.note ?? '',
    appendNote: '',
  }
}

export function TaskgardenManagerCard() {
  const { data, isLoading, isFetching, refetch } = useTaskgardenTaskList()
  const createTask = useTaskgardenTaskCreate()
  const updateTask = useTaskgardenTaskUpdate()
  const sourceItems = useMemo(() => sortTasks(data?.items ?? []), [data?.items])
  const [selectedId, setSelectedId] = useState<string>('')
  const [pendingSelectionId, setPendingSelectionId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'done'>('all')
  const [bucketFilter, setBucketFilter] = useState<'all' | 'planned' | 'unplanned'>('all')
  const [reminderFilter, setReminderFilter] = useState<'all' | 'with-reminders' | 'without-reminders'>('all')
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [editor, setEditor] = useState<TaskEditorState>(buildEditorState())

  const filteredItems = useMemo(() => {
    return sourceItems.filter((item) => {
      const statusMatch = statusFilter === 'all' || item.status === statusFilter
      const bucketMatch = bucketFilter === 'all' || item.bucket === bucketFilter
      const reminderMatch =
        reminderFilter === 'all' ||
        (reminderFilter === 'with-reminders' && item.remind_interval_hours != null) ||
        (reminderFilter === 'without-reminders' && item.remind_interval_hours == null)
      const searchMatch = !search.trim() || item.title.toLowerCase().includes(search.toLowerCase())
      return statusMatch && bucketMatch && reminderMatch && searchMatch
    })
  }, [bucketFilter, reminderFilter, search, sourceItems, statusFilter])

  const selected = sourceItems.find((item) => item.id === selectedId) ?? null
  const isDraft = selectedId === NEW_TASK_ID || (!selectedId && sourceItems.length === 0)
  const editorOpen = isDraft || Boolean(selected)
  const closeDrawer = useCallback(() => setSelectedId(''), [])
  const drawerRef = useDrawerFocus<HTMLFormElement>(editorOpen, closeDrawer)

  const openCount = sourceItems.filter((item) => item.status === 'open').length
  const plannedCount = sourceItems.filter((item) => item.bucket === 'planned' && item.status === 'open').length
  const dueCount = sourceItems.filter((item) => item.status === 'open' && item.remind_interval_hours != null).length

  useEffect(() => {
    if (pendingSelectionId && sourceItems.some((item) => item.id === pendingSelectionId)) {
      setSelectedId(pendingSelectionId)
      setPendingSelectionId('')
      return
    }
    if (selectedId === NEW_TASK_ID) return
    if (selectedId && !sourceItems.some((item) => item.id === selectedId)) {
      setSelectedId('')
    }
  }, [pendingSelectionId, selectedId, sourceItems])

  useEffect(() => {
    if (selectedId === NEW_TASK_ID) {
      setEditor(buildEditorState())
      return
    }
    setEditor(buildEditorState(selected))
  }, [selectedId, selected?.id])

  function updateEditor<K extends keyof TaskEditorState>(key: K, value: TaskEditorState[K]) {
    setEditor((current) => ({ ...current, [key]: value }))
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setNotice('')

    if (isDraft) {
      const result = await createTask.mutateAsync({
        title: editor.title,
        bucket: editor.bucket,
        note: editor.note.trim() || undefined,
        remindIntervalHours: editor.reminderHours ? Number(editor.reminderHours) : null,
      })
      setPendingSelectionId(result.item.id)
      setNotice('Task created.')
      return
    }

    if (!selected) return
    await updateTask.mutateAsync({
      id: selected.id,
      input: {
        title: editor.title,
        bucket: editor.bucket,
        status: editor.status,
        remindIntervalHours: editor.reminderHours ? Number(editor.reminderHours) : null,
        note: editor.note,
        appendNote: editor.appendNote.trim() || undefined,
      },
    })
    setEditor((current) => ({ ...current, appendNote: '' }))
    setNotice(`Saved ${selected.id}.`)
  }

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Task Garden</p>
          <h3>Manage tasks</h3>
        </div>
        <div className="freshness-stack">
          <span className="muted-copy">{isLoading ? 'Loading…' : `${filteredItems.length} of ${sourceItems.length} tasks`}</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isFetching} />
        </div>
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

      <div className="manager-focus-layout">
        <div className="manager-list-card">
          <div className="panel-subheader">
            <div>
              <h4>Task list</h4>
              <p className="selector-copy">Scan first. Open a task only when you need details or edits.</p>
            </div>
            <button className="button-primary" type="button" onClick={() => setSelectedId(NEW_TASK_ID)}>
              New task
            </button>
          </div>

          <div className="toolbar-stack compact-toolbar-stack">
            <div className="toolbar-row toolbar-row-end">
              <button className="button-secondary" type="button" onClick={() => void refetch()} disabled={isFetching}>
                {isFetching ? 'Refreshing…' : 'Refresh list'}
              </button>
            </div>
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
              <label className="field-label field-label-inline">
                Reminder
                <select value={reminderFilter} onChange={(event) => setReminderFilter(event.target.value as typeof reminderFilter)}>
                  <option value="all">All</option>
                  <option value="with-reminders">With reminders</option>
                  <option value="without-reminders">Without reminders</option>
                </select>
              </label>
            </div>
          </div>

          {filteredItems.length === 0 && !isLoading ? <div className="empty-state">No tasks match the current filters.</div> : null}

          <div className="selector-list manager-selector-list manager-card-list">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`selector-item ${item.id === selected?.id ? 'selector-item-active' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="selector-item-copy">
                  <strong>{item.title}</strong>
                  <span className="selector-copy">
                    {item.id} · {item.bucket} · {item.status}
                  </span>
                  {item.remind_interval_hours != null ? (
                    <span className="selector-copy">every {item.remind_interval_hours}h</span>
                  ) : null}
                </span>
                <span className="selector-item-actions">
                  <span className={`badge badge-${item.status === 'open' ? 'active' : 'idle'}`}>{item.status}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {editorOpen ? <div className="drawer-backdrop" onClick={closeDrawer} aria-hidden="true" /> : null}
        {editorOpen ? (
        <form ref={drawerRef} className="editor-card manager-editor-card manager-drawer" onSubmit={handleSave} role="dialog" aria-modal="true" aria-label={isDraft ? 'New task' : 'Task editor'} tabIndex={-1}>
          <div className="panel-subheader">
            <div>
              <h4>{isDraft ? 'New task' : 'Task editor'}</h4>
              <p className="selector-copy">Same surface for create and edit, with optional sections below.</p>
            </div>
            <div className="drawer-title-actions">
              {!isDraft && selected ? (
                <span className={`badge badge-${selected.status === 'open' ? 'active' : 'idle'}`}>{selected.status}</span>
              ) : null}
              <button className="button-secondary button-compact" type="button" onClick={closeDrawer}>Close</button>
            </div>
          </div>

          {!isDraft && selected ? (
            <dl className="detail-list manager-detail-list">
              <div>
                <dt>Task ID</dt>
                <dd>{selected.id}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(selected.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/New_York' })}</dd>
              </div>
            </dl>
          ) : null}

          <div className="editor-stack">
            <label className="field-label">
              Title
              <input value={editor.title} onChange={(event) => updateEditor('title', event.target.value)} required />
            </label>

            <details className="editor-section" open={isDraft}>
              <summary>Status, bucket, and reminder</summary>
            <div className="field-grid-session-settings">
              <label className="field-label">
                Bucket
                <select value={editor.bucket} onChange={(event) => updateEditor('bucket', event.target.value as 'planned' | 'unplanned')}>
                  <option value="unplanned">Unplanned</option>
                  <option value="planned">Planned</option>
                </select>
              </label>
              <label className="field-label">
                Status
                <select value={editor.status} onChange={(event) => updateEditor('status', event.target.value as 'open' | 'done')}>
                  <option value="open">Open</option>
                  <option value="done">Done</option>
                </select>
              </label>
              <label className="field-label">
                Reminder hours
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editor.reminderHours}
                  onChange={(event) => updateEditor('reminderHours', event.target.value)}
                  placeholder="Blank clears reminder"
                />
              </label>
            </div>
            </details>

            <details className="editor-section" open>
              <summary>Notes</summary>
            <label className="field-label">
              {isDraft ? 'Initial note' : 'Task note'}
              <textarea
                value={editor.note}
                onChange={(event) => updateEditor('note', event.target.value)}
                rows={5}
                placeholder={isDraft ? 'Optional context for the new task' : 'Edit the task note directly'}
              />
            </label>

            {!isDraft ? (
              <label className="field-label">
                Append note
                <textarea
                  value={editor.appendNote}
                  onChange={(event) => updateEditor('appendNote', event.target.value)}
                  rows={4}
                  placeholder="Optional: append extra context after the edited note"
                />
              </label>
            ) : null}
            </details>

            <div className="action-row">
              <button className="button-primary" type="submit" disabled={(createTask.isPending || updateTask.isPending) || !editor.title.trim()}>
                {isDraft
                  ? createTask.isPending
                    ? 'Creating…'
                    : 'Create task'
                  : updateTask.isPending
                    ? 'Saving…'
                    : 'Save task'}
              </button>
              {notice ? <span className="muted-copy">{notice}</span> : null}
            </div>
          </div>
        </form>
        ) : null}
      </div>
    </section>
  )
}
