export function generateTicketId(eventId: string): string {
  const eventCode = eventId.replace(/-/g, '').substring(0, 6).toUpperCase()
  // Unambiguous chars — no 0/O, 1/I/L confusion under stress
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `DPX-${eventCode}-${random}`
}
