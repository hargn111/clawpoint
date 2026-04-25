type FreshnessStampProps = {
  updatedAt?: string
  isFetching?: boolean
  label?: string
}

function formatFreshness(updatedAt?: string) {
  if (!updatedAt) return 'No timestamp yet'

  const updatedTime = new Date(updatedAt).getTime()
  if (!Number.isFinite(updatedTime)) return 'Timestamp unavailable'

  const elapsedSeconds = Math.max(0, Math.round((Date.now() - updatedTime) / 1000))
  if (elapsedSeconds < 5) return 'Updated just now'
  if (elapsedSeconds < 60) return `Updated ${elapsedSeconds}s ago`

  const elapsedMinutes = Math.round(elapsedSeconds / 60)
  if (elapsedMinutes < 60) return `Updated ${elapsedMinutes}m ago`

  return `Updated ${new Date(updatedAt).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  })}`
}

export function FreshnessStamp({ updatedAt, isFetching, label }: FreshnessStampProps) {
  return (
    <span className={`freshness-stamp ${isFetching ? 'freshness-stamp-live' : ''}`}>
      {isFetching ? 'Refreshing…' : label ?? formatFreshness(updatedAt)}
    </span>
  )
}
