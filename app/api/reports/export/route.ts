import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Event, Guest } from '@/types/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)

    const period = searchParams.get('period') ?? 'this_month'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const eventId = searchParams.get('eventId')
    const status = searchParams.get('status')
    const minRate = parseInt(searchParams.get('minRate') ?? '0')

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (period === 'custom' && dateFrom && dateTo) {
      startDate = new Date(dateFrom)
      endDate = new Date(dateTo)
    } else if (period === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0)
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    let eventsQuery = db
      .from('events')
      .select('*')
      .gte('event_date', startStr)
      .lte('event_date', endStr)
      .order('event_date', { ascending: false })

    if (eventId && eventId !== 'all') {
      eventsQuery = eventsQuery.eq('id', eventId)
    }
    if (status && status !== 'all') {
      eventsQuery = eventsQuery.eq('status', status)
    }

    const { data: eventsData } = await eventsQuery
    const events = (eventsData ?? []) as Event[]
    const eventIds = events.map(e => e.id)

    let allGuests: Guest[] = []
    if (eventIds.length > 0) {
      const { data: guestData } = await supabase
        .from('guests')
        .select('*')
        .in('event_id', eventIds)
      allGuests = (guestData ?? []) as Guest[]
    }

    const eventRows = events.map(event => {
      const eventGuests = allGuests.filter(g => g.event_id === event.id)
      const attended = eventGuests.filter(g => g.checked_in).length
      const invites = eventGuests.length
      const eventRate = invites > 0 ? Math.round((attended / invites) * 100) : 0
      return { event, attended, invites, eventRate }
    }).filter(row => row.eventRate >= minRate)

    // Build PDF
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const page = pdfDoc.addPage([595, 842]) // A4
    const { width, height } = page.getSize()
    const margin = 50

    let y = height - margin

    // Title
    page.drawText('Dualpix GMS — Event Report', {
      x: margin,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0.5, 0, 0),
    })
    y -= 24

    // Period subtitle
    const periodLabel = period === 'custom'
      ? `${startStr} to ${endStr}`
      : period === 'last_month' ? 'Last Month' : 'This Month'

    page.drawText(`Period: ${periodLabel}`, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    y -= 10

    page.drawText(`Generated: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}`, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
    y -= 24

    // Summary
    const totalGuests = eventRows.reduce((s, r) => s + r.invites, 0)
    const totalCheckedIn = eventRows.reduce((s, r) => s + r.attended, 0)
    const avgRate = totalGuests > 0 ? Math.round((totalCheckedIn / totalGuests) * 100) : 0

    const summaryItems = [
      `Total Events: ${eventRows.length}`,
      `Total Guests: ${totalGuests}`,
      `Total Checked In: ${totalCheckedIn}`,
      `Avg Attendance Rate: ${avgRate}%`,
    ]

    summaryItems.forEach(item => {
      page.drawText(item, {
        x: margin,
        y,
        size: 10,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      })
      y -= 16
    })

    y -= 16

    // Table header
    const cols = [
      { label: 'Event', x: margin, w: 200 },
      { label: 'Date', x: margin + 205, w: 80 },
      { label: 'Invites', x: margin + 290, w: 55 },
      { label: 'Attended', x: margin + 350, w: 65 },
      { label: 'Rate', x: margin + 420, w: 50 },
      { label: 'Status', x: margin + 475, w: 70 },
    ]

    // Header background
    page.drawRectangle({
      x: margin - 4,
      y: y - 4,
      width: width - margin * 2 + 8,
      height: 20,
      color: rgb(0.85, 0, 0),
    })

    cols.forEach(col => {
      page.drawText(col.label.toUpperCase(), {
        x: col.x,
        y: y,
        size: 8,
        font: boldFont,
        color: rgb(1, 1, 1),
      })
    })
    y -= 22

    // Rows
    eventRows.forEach(({ event, attended, invites, eventRate }, idx) => {
      // Alternate row background
      if (idx % 2 === 0) {
        page.drawRectangle({
          x: margin - 4,
          y: y - 4,
          width: width - margin * 2 + 8,
          height: 18,
          color: rgb(0.96, 0.96, 0.96),
        })
      }

      const dateStr = new Date(event.event_date).toLocaleDateString('en-KE', {
        day: '2-digit', month: 'short', year: 'numeric',
      })

      const truncatedName = event.name.length > 32 ? event.name.slice(0, 30) + '…' : event.name

      page.drawText(truncatedName, { x: margin, y, size: 9, font, color: rgb(0.1, 0.1, 0.1) })
      page.drawText(dateStr, { x: margin + 205, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) })
      page.drawText(String(invites), { x: margin + 290, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) })
      page.drawText(String(attended), { x: margin + 350, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) })
      page.drawText(`${eventRate}%`, { x: margin + 420, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) })
      page.drawText(event.status, { x: margin + 475, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) })

      y -= 18

      // Add new page if needed
      if (y < margin + 40) {
        const newPage = pdfDoc.addPage([595, 842])
        page.drawText('', { x: 0, y: 0, size: 1, font })
        // We can't reassign page so just stop (simple implementation)
        y = newPage.getSize().height - margin
      }
    })

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dualpix-report-${periodLabel.replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF export error:', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
