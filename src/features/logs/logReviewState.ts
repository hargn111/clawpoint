export const LOG_REVIEWED_UNTIL_KEY = 'clawpoint:logs-reviewed-until'

export function readLogsReviewedUntil(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(LOG_REVIEWED_UNTIL_KEY) ?? ''
}

export function writeLogsReviewedUntil(value: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOG_REVIEWED_UNTIL_KEY, value)
}

export function isNewerThanWatermark(timestamp: string, watermark: string) {
  if (!watermark) return true
  return new Date(timestamp).getTime() > new Date(watermark).getTime()
}
