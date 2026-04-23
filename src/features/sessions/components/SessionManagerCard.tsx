import { useEffect, useMemo, useState } from 'react'
import {
  useSessionCreate,
  useSessionListAdmin,
  useSessionMessageSend,
} from '../api/useSessionAdmin'

function formatUpdatedAt(updatedAt?: number) {
  if (!updatedAt) return 'unknown'
  return new Date(updatedAt).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  })
}

export function SessionManagerCard() {
  const { data, isLoading } = useSessionListAdmin()
  const createSession = useSessionCreate()
  const sendMessage = useSessionMessageSend()
  const items = useMemo(() => data?.items ?? [], [data?.items])
  const [selectedId, setSelectedId] = useState('')
  const [starterMessage, setStarterMessage] = useState('')
  const [starterThinking, setStarterThinking] = useState<'off' | 'minimal' | 'low' | 'medium' | 'high'>('low')
  const [starterVerbose, setStarterVerbose] = useState<'off' | 'on'>('off')
  const [message, setMessage] = useState('')
  const [messageThinking, setMessageThinking] = useState<'off' | 'minimal' | 'low' | 'medium' | 'high'>('off')
  const [notice, setNotice] = useState('')

  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null

  useEffect(() => {
    if (!items.length) {
      setSelectedId('')
      return
    }
    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id)
    }
  }, [items, selectedId])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setNotice('')
    const result = await createSession.mutateAsync({
      message: starterMessage,
      thinking: starterThinking,
      verbose: starterVerbose,
    })
    setStarterMessage('')
    setSelectedId(result.sessionId)
    setNotice(`Created session ${result.sessionId.slice(0, 8)}.`)
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault()
    if (!selected) return
    setNotice('')
    await sendMessage.mutateAsync({
      id: selected.id,
      input: {
        message,
        thinking: messageThinking,
      },
    })
    setMessage('')
    setNotice(`Sent to ${selected.label}.`)
  }

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Sessions</p>
          <h3>Manage sessions</h3>
        </div>
        <span className="muted-copy">{isLoading ? 'Loading…' : `${items.length} visible`}</span>
      </div>

      <div className="admin-grid admin-grid-sessions">
        <form className="editor-card" onSubmit={handleCreate}>
          <h4>Create session</h4>
          <label className="field-label">
            Starter message
            <textarea
              value={starterMessage}
              onChange={(event) => setStarterMessage(event.target.value)}
              rows={5}
              placeholder="Start a new session with a prompt or work request"
              required
            />
          </label>
          <div className="field-grid-two-up">
            <label className="field-label">
              Thinking
              <select value={starterThinking} onChange={(event) => setStarterThinking(event.target.value as typeof starterThinking)}>
                <option value="off">Off</option>
                <option value="minimal">Minimal</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="field-label">
              Verbose
              <select value={starterVerbose} onChange={(event) => setStarterVerbose(event.target.value as typeof starterVerbose)}>
                <option value="off">Off</option>
                <option value="on">On</option>
              </select>
            </label>
          </div>
          <div className="hint-row">
            <span className="cli-pill">--thinking</span>
            <span className="cli-pill">--verbose</span>
          </div>
          <div className="action-row">
            <button
              className="button-primary"
              type="submit"
              disabled={createSession.isPending || !starterMessage.trim()}
            >
              {createSession.isPending ? 'Creating…' : 'Create session'}
            </button>
          </div>
        </form>

        <div className="editor-card">
          <h4>Recent sessions</h4>
          <div className="selector-list">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`selector-item ${item.id === selected?.id ? 'selector-item-active' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <span>
                  <strong>{item.label}</strong>
                  <span className="selector-copy">{item.summary}</span>
                </span>
                <span className={`badge badge-${item.state}`}>{item.state}</span>
              </button>
            ))}
          </div>
        </div>

        <form className="editor-card" onSubmit={handleSend}>
          <h4>Session detail</h4>
          {!selected ? <div className="empty-state">Select a session to message.</div> : null}
          {selected ? (
            <>
              <dl className="detail-list">
                <div>
                  <dt>Label</dt>
                  <dd>{selected.label}</dd>
                </div>
                <div>
                  <dt>Kind</dt>
                  <dd>{selected.kind}</dd>
                </div>
                <div>
                  <dt>Channel</dt>
                  <dd>{selected.channel ?? 'direct'}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{formatUpdatedAt(selected.updatedAt)}</dd>
                </div>
              </dl>
              <label className="field-label">
                Send message
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  placeholder="Send a follow-up into this session"
                  required
                />
              </label>
              <label className="field-label">
                Message thinking override
                <select value={messageThinking} onChange={(event) => setMessageThinking(event.target.value as typeof messageThinking)}>
                  <option value="off">Off</option>
                  <option value="minimal">Minimal</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <div className="hint-row">
                <span className="cli-pill">openclaw agent --session-id</span>
                <span className="cli-pill">--thinking</span>
              </div>
              <div className="action-row">
                <button className="button-primary" type="submit" disabled={sendMessage.isPending || !message.trim()}>
                  {sendMessage.isPending ? 'Sending…' : 'Send message'}
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
