// Accessing window.localStorage can throw (blocked site data, private modes).
export function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
