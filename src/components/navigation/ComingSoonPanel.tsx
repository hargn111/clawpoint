type ComingSoonPanelProps = {
  title: string
  body: string
}

export function ComingSoonPanel({ title, body }: ComingSoonPanelProps) {
  return (
    <div className="empty-state workspace-empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  )
}
