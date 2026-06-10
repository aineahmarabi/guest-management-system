export function generateTicketId(eventId: string, guestNumber: number): string {
  const eventCode = eventId.replace(/-/g, '').substring(0, 6).toUpperCase()
  const guestNum = String(guestNumber).padStart(4, '0')
  return `DPX-${eventCode}-G${guestNum}`
}
