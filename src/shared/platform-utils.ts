/** True when the browser reports a Windows platform. */
export function isWindowsPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Win/i.test(navigator.platform || navigator.userAgent)
}
