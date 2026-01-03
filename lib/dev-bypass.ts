/**
 * Development bypass utilities
 * Set NODE_ENV=development or NEXT_PUBLIC_DEV_MODE=true to enable
 */

export const isDevMode = () => {
  if (typeof window !== 'undefined') {
    // Client-side check
    return (
      process.env.NEXT_PUBLIC_DEV_MODE === 'true' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    )
  }
  // Server-side check
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_DEV_MODE === 'true'
  )
}

export const bypassSubscriptionCheck = () => {
  return isDevMode()
}

export const useMockWorker = () => {
  return isDevMode() && process.env.USE_MOCK_WORKER !== 'false'
}

export const bypassAuthCheck = () => {
  if (typeof window !== 'undefined') {
    // Client-side: always allow bypass on localhost
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      process.env.NEXT_PUBLIC_DEV_MODE === 'true'
    )
  }
  // Server-side
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_DEV_MODE === 'true' ||
    process.env.BYPASS_AUTH === 'true'
  )
}


