import { useCallback, useEffect, useMemo, useState } from 'react'
import { FreshnessStamp } from '../../../components/common/FreshnessStamp'
import { useDrawerFocus } from '../../../components/common/useDrawerFocus'
import type { SessionAdminItem } from '../../../lib/types'
import {
  useSessionCreate,
  useSessionListAdmin,
  useSessionMessageSend,
  useSessionModels,
  useSessionUpdate,
} from '../api/useSessionAdmin'

const NEW_SESSION_ID = '__new_session__'
const CHANNEL_OPTIONS = [
  'webchat',
  'discord',
  'telegram',
  'signal',
  'slack',
  'whatsapp',
  'googlechat',
  'mattermost',
  'matrix',
  'msteams',
  'irc',
]

type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
type VerboseLevel = 'off' | 'on'
type ReasoningLevel = 'off' | 'on' | 'stream'

function formatUpdatedAt(updatedAt?: number) {
  if (!updatedAt) return 'unknown'
  return new Date(updatedAt).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  })
}

function initialEditorState(session?: SessionAdminItem | null) {
  return {
    label: session?.label && !session.label.startsWith('Session ') ? session.label : '',
    model: session?.model && session?.modelProvider ? `${session.modelProvider}/${session.model}` : '',
    thinking: (session?.thinkingLevel ?? 'low') as ThinkingLevel,
    verbose: (session?.verboseLevel ?? 'off') as VerboseLevel,
    reasoning: (session?.reasoningLevel ?? 'off') as ReasoningLevel,
    channel: session?.channel && session.channel !== 'direct' ? session.channel : '',
    starterMessage: '',
    outboundMessage: '',
    outboundThinking: 'off' as ThinkingLevel,
  }
}

export function SessionManagerCard() {
  const { data, isLoading, isFetching, refetch } = useSessionListAdmin()
  const { data: modelData } = useSessionModels()
  const createSession = useSessionCreate()
  const updateSession = useSessionUpdate()
  const sendMessage = useSessionMessageSend()

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const modelOptions = modelData?.items ?? []
  const [selectedId, setSelectedId] = useState('')
  const [pendingSelectionId, setPendingSelectionId] = useState('')
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'waiting' | 'idle'>('all')
  const [notice, setNotice] = useState('')
  const [editor, setEditor] = useState(initialEditorState())

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return items.filter((item) => {
      const stateMatch = stateFilter === 'all' || item.state === stateFilter
      const searchMatch = !needle || [item.label, item.summary, item.channel, item.model, item.modelProvider]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
      return stateMatch && searchMatch
    })
  }, [items, search, stateFilter])

  const selected = items.find((item) => item.id === selectedId) ?? null
  const isMainSessionSelected = selected?.key === 'agent:main:main'
  const isDraft = selectedId === NEW_SESSION_ID || (!selectedId && items.length === 0)
  const editorOpen = isDraft || Boolean(selected)
  const closeDrawer = useCallback(() => setSelectedId(''), [])
  const drawerRef = useDrawerFocus(editorOpen, closeDrawer)

  useEffect(() => {
    if (pendingSelectionId && items.some((item) => item.id === pendingSelectionId)) {
      setSelectedId(pendingSelectionId)
      setPendingSelectionId('')
      return
    }
    if (selectedId === NEW_SESSION_ID) return
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId('')
    }
  }, [items, pendingSelectionId, selectedId])

  useEffect(() => {
    if (selectedId === NEW_SESSION_ID) {
      setEditor(initialEditorState())
      return
    }
    setEditor(initialEditorState(selected))
  }, [selectedId, selected?.id])

  function updateEditor<K extends keyof typeof editor>(key: K, value: (typeof editor)[K]) {
    setEditor((current) => ({ ...current, [key]: value }))
  }

  async function handleSaveSession(event: React.FormEvent) {
    event.preventDefault()
    setNotice('')

    if (isDraft) {
      const result = await createSession.mutateAsync({
        label: editor.label.trim() || undefined,
        model: editor.model || null,
        thinking: editor.thinking,
        verbose: editor.verbose,
        reasoning: editor.reasoning,
        message: editor.starterMessage.trim() || undefined,
        channel: editor.channel.trim() || undefined,
      })
      setPendingSelectionId(result.sessionId)
      setNotice(editor.starterMessage.trim() ? 'Session created and starter message sent.' : 'Session created.')
      return
    }

    if (!selected) return
    await updateSession.mutateAsync({
      id: selected.id,
      input: {
        key: selected.key,
        label: editor.label.trim() || undefined,
        model: editor.model || null,
        thinking: editor.thinking,
        verbose: editor.verbose,
        reasoning: editor.reasoning,
      },
    })
    setNotice('Session settings saved.')
  }

  async function handleSendMessage(event: React.FormEvent) {
    event.preventDefault()
    if (!selected || isMainSessionSelected || !editor.outboundMessage.trim()) return
    setNotice('')
    await sendMessage.mutateAsync({
      id: selected.id,
      input: {
        key: selected.key,
        message: editor.outboundMessage,
        thinking: editor.outboundThinking,
        channel: editor.channel.trim() || undefined,
      },
    })
    setEditor((current) => ({ ...current, outboundMessage: '', outboundThinking: 'off' }))
    setNotice('Message sent.')
  }

  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Sessions</p>
          <h3>Manage sessions</h3>
        </div>
        <div className="freshness-stack">
          <span className="muted-copy">{isLoading ? 'Loading…' : `${filteredItems.length} of ${items.length} visible`}</span>
          <FreshnessStamp updatedAt={data?.updatedAt} isFetching={isFetching} />
        </div>
      </div>

      <div className="manager-focus-layout">
        <div className="manager-list-card">
          <div className="panel-subheader">
            <div>
              <h4>Session list</h4>
              <p className="selector-copy">Scan first. Open a session only when you want details or actions.</p>
            </div>
            <button className="button-primary" type="button" onClick={() => setSelectedId(NEW_SESSION_ID)}>
              New session
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
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find by label, model, or channel" />
            </label>
            <label className="field-label field-label-inline">
              State
              <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as typeof stateFilter)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="waiting">Waiting</option>
                <option value="idle">Idle</option>
              </select>
            </label>
          </div>

          {filteredItems.length === 0 && !isLoading ? <div className="empty-state">No sessions match the current search.</div> : null}

          <div className="selector-list manager-selector-list manager-card-list">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`selector-item ${item.id === selected?.id ? 'selector-item-active' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="selector-item-copy">
                  <strong>{item.label}</strong>
                  <span className="selector-copy">{item.summary}</span>
                  <span className="selector-copy">{item.modelProvider && item.model ? `${item.modelProvider}/${item.model}` : 'default model'}</span>
                </span>
                <span className="selector-item-actions">
                  <span className={`badge badge-${item.state}`}>{item.state}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {editorOpen ? <div className="drawer-backdrop" onClick={closeDrawer} aria-hidden="true" /> : null}
        {editorOpen ? (
        <div ref={drawerRef} className="editor-card manager-editor-card manager-drawer" role="dialog" aria-modal="true" aria-label={isDraft ? 'New session' : 'Session editor'} tabIndex={-1}>
          <div className="panel-subheader">
            <div>
              <h4>{isDraft ? 'New session' : 'Session editor'}</h4>
              <p className="selector-copy">
                {isDraft ? 'Set session defaults, then optionally send a starter message.' : 'Edit defaults here, then send a message below.'}
              </p>
            </div>
            <div className="drawer-title-actions">
              {!isDraft && selected ? <span className={`badge badge-${selected.state}`}>{selected.state}</span> : null}
              <button className="button-secondary button-compact" type="button" onClick={closeDrawer}>Close</button>
            </div>
          </div>

          {!isDraft && selected ? (
            <dl className="detail-list manager-detail-list">
              <div>
                <dt>Updated</dt>
                <dd>{formatUpdatedAt(selected.updatedAt)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selected.status ?? 'unknown'}</dd>
              </div>
              <div>
                <dt>Channel</dt>
                <dd>{selected.channel ?? 'direct'}</dd>
              </div>
              <div>
                <dt>Recipient</dt>
                <dd>{selected.lastTo ?? 'session default'}</dd>
              </div>
            </dl>
          ) : null}

          <details className="editor-section" open={isDraft}>
            <summary>Session settings</summary>
          <form className="editor-stack" onSubmit={handleSaveSession}>
            <div className="field-grid-two-up">
              <label className="field-label">
                Label
                <input value={editor.label} onChange={(event) => updateEditor('label', event.target.value)} placeholder="Optional human label" />
              </label>
              <label className="field-label">
                Model
                <select value={editor.model} onChange={(event) => updateEditor('model', event.target.value)}>
                  <option value="">Agent default</option>
                  {modelOptions.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="field-grid-session-settings">
              <label className="field-label">
                Thinking
                <select value={editor.thinking} onChange={(event) => updateEditor('thinking', event.target.value as ThinkingLevel)}>
                  <option value="off">Off</option>
                  <option value="minimal">Minimal</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="xhigh">X-High</option>
                </select>
              </label>
              <label className="field-label">
                Verbose
                <select value={editor.verbose} onChange={(event) => updateEditor('verbose', event.target.value as VerboseLevel)}>
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
              </label>
              <label className="field-label">
                Reasoning
                <select value={editor.reasoning} onChange={(event) => updateEditor('reasoning', event.target.value as ReasoningLevel)}>
                  <option value="off">Off</option>
                  <option value="on">On</option>
                  <option value="stream">Stream</option>
                </select>
              </label>
            </div>

            <div className="action-row">
              <button className="button-primary" type="submit" disabled={createSession.isPending || updateSession.isPending}>
                {isDraft
                  ? createSession.isPending
                    ? 'Creating…'
                    : 'Create session'
                  : updateSession.isPending
                    ? 'Saving…'
                    : 'Save settings'}
              </button>
              {notice ? <span className="muted-copy">{notice}</span> : null}
            </div>
          </form>
          </details>

          <details className="editor-section" open>
            <summary>{isDraft ? 'Starter message' : 'Compose message'}</summary>
          <form className="editor-stack" onSubmit={isDraft ? handleSaveSession : handleSendMessage}>
            <div className="panel-subheader compact-panel-subheader">
              <div>
                <h4>{isDraft ? 'Starter message' : 'Compose message'}</h4>
                <p className="selector-copy">Channel applies on the next send and becomes the session’s latest delivery channel.</p>
              </div>
            </div>

            <div className="field-grid-two-up">
              <label className="field-label">
                Channel
                <>
                  <input
                    list="session-channel-options"
                    value={editor.channel}
                    onChange={(event) => updateEditor('channel', event.target.value)}
                    placeholder="Optional, for example webchat or discord"
                  />
                  <datalist id="session-channel-options">
                    {CHANNEL_OPTIONS.map((channel) => (
                      <option key={channel} value={channel} />
                    ))}
                  </datalist>
                </>
              </label>
              {!isDraft ? (
                <label className="field-label">
                  Message thinking override
                  <select
                    value={editor.outboundThinking}
                    onChange={(event) => updateEditor('outboundThinking', event.target.value as ThinkingLevel)}
                  >
                    <option value="off">Off</option>
                    <option value="minimal">Minimal</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="xhigh">X-High</option>
                  </select>
                </label>
              ) : <div />}
            </div>

            <label className="field-label">
              {isDraft ? 'Message' : 'Send message'}
              <textarea
                value={isDraft ? editor.starterMessage : editor.outboundMessage}
                onChange={(event) => updateEditor(isDraft ? 'starterMessage' : 'outboundMessage', event.target.value)}
                rows={6}
                placeholder={isDraft ? 'Optional starter prompt for the new session' : 'Send a follow-up into this session'}
              />
            </label>

            {!isDraft && isMainSessionSelected ? (
              <div className="empty-state">
                Use the normal chat input for the main Freya session. Sending to this session from the dashboard can duplicate stored transcript entries.
              </div>
            ) : null}

            {!isDraft ? (
              <div className="action-row">
                <button className="button-primary" type="submit" disabled={sendMessage.isPending || isMainSessionSelected || !editor.outboundMessage.trim()}>
                  {sendMessage.isPending ? 'Sending…' : 'Send message'}
                </button>
              </div>
            ) : null}
          </form>
          </details>
        </div>
        ) : null}
      </div>
    </section>
  )
}
