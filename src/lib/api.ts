export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ? `ws://${window.location.hostname}:3001` : '')
