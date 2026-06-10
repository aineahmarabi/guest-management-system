import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

interface TicketData {
  guestName: string
  guestEmail: string
  eventName: string
  eventDate: string
  eventTime: string
  venue: string
  ticketId: string
  escortCount: number
}

export async function generateTicketPDF(data: TicketData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4 portrait
  const { width, height } = page.getSize()

  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const helvetica = await doc.embedFont(StandardFonts.Helvetica)
  const courier = await doc.embedFont(StandardFonts.Courier)

  const maroon = rgb(0.502, 0, 0)
  const black = rgb(0, 0, 0)
  const gray = rgb(0.4, 0.4, 0.4)
  const lightGray = rgb(0.85, 0.85, 0.85)
  const white = rgb(1, 1, 1)

  // Maroon header bar
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width,
    height: 80,
    color: maroon,
  })

  // Company name in header
  page.drawText('DUALPIX COMMUNICATIONS LTD', {
    x: 40,
    y: height - 35,
    size: 14,
    font: helveticaBold,
    color: white,
  })
  page.drawText('Guest Invitation Ticket', {
    x: 40,
    y: height - 55,
    size: 10,
    font: helvetica,
    color: rgb(0.9, 0.7, 0.7),
  })

  // Divider line
  let yPos = height - 110

  // Event name
  const eventNameSize = data.eventName.length > 40 ? 18 : 22
  page.drawText(data.eventName, {
    x: 40,
    y: yPos,
    size: eventNameSize,
    font: helveticaBold,
    color: black,
  })
  yPos -= 30

  // Event details row
  const eventDetails = `${data.eventDate}   |   ${data.eventTime}   |   ${data.venue}`
  page.drawText(eventDetails, {
    x: 40,
    y: yPos,
    size: 10,
    font: helvetica,
    color: gray,
  })
  yPos -= 20

  // Horizontal rule
  page.drawLine({
    start: { x: 40, y: yPos },
    end: { x: width - 40, y: yPos },
    thickness: 0.5,
    color: lightGray,
  })
  yPos -= 30

  // Guest section label
  page.drawText('GUEST', {
    x: 40,
    y: yPos,
    size: 8,
    font: helveticaBold,
    color: gray,
  })
  yPos -= 18

  // Guest name
  page.drawText(data.guestName, {
    x: 40,
    y: yPos,
    size: 20,
    font: helveticaBold,
    color: black,
  })
  yPos -= 22

  // Guest email
  page.drawText(data.guestEmail, {
    x: 40,
    y: yPos,
    size: 11,
    font: helvetica,
    color: gray,
  })
  yPos -= 20

  // Escorts
  if (data.escortCount > 0) {
    page.drawText(`Escorts Authorised: ${data.escortCount}`, {
      x: 40,
      y: yPos,
      size: 11,
      font: helvetica,
      color: gray,
    })
    yPos -= 20
  }

  // Horizontal rule
  yPos -= 10
  page.drawLine({
    start: { x: 40, y: yPos },
    end: { x: width - 40, y: yPos },
    thickness: 0.5,
    color: lightGray,
  })
  yPos -= 30

  // QR Code — encode a URL so phone cameras open the check-in page directly
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://dualpix-gms.vercel.app'
  const qrDataUrl = await QRCode.toDataURL(`${appUrl}/scan/${data.ticketId}`, {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
  })

  // Extract base64 from data URL
  const base64 = qrDataUrl.split(',')[1]
  const qrImageBytes = Buffer.from(base64, 'base64')
  const qrImage = await doc.embedPng(qrImageBytes)

  const qrSize = 160
  const qrX = (width - qrSize) / 2
  page.drawImage(qrImage, {
    x: qrX,
    y: yPos - qrSize,
    width: qrSize,
    height: qrSize,
  })
  yPos -= qrSize + 20

  // Ticket ID label
  page.drawText('TICKET ID', {
    x: 40,
    y: yPos,
    size: 8,
    font: helveticaBold,
    color: gray,
  })
  yPos -= 16

  page.drawText(data.ticketId, {
    x: 40,
    y: yPos,
    size: 14,
    font: courier,
    color: black,
  })
  yPos -= 25

  // Horizontal rule
  page.drawLine({
    start: { x: 40, y: yPos },
    end: { x: width - 40, y: yPos },
    thickness: 0.5,
    color: lightGray,
  })
  yPos -= 18

  // Venue footer
  page.drawText('VENUE', {
    x: 40,
    y: yPos,
    size: 8,
    font: helveticaBold,
    color: gray,
  })
  yPos -= 15

  page.drawText(data.venue, {
    x: 40,
    y: yPos,
    size: 10,
    font: helvetica,
    color: black,
  })
  yPos -= 25

  // Horizontal rule
  page.drawLine({
    start: { x: 40, y: yPos },
    end: { x: width - 40, y: yPos },
    thickness: 0.5,
    color: lightGray,
  })
  yPos -= 18

  // Footer
  page.drawText('Powered by Dualpix GMS  ·  www.dualpix.co.ke', {
    x: 40,
    y: yPos,
    size: 8,
    font: helvetica,
    color: gray,
  })

  return doc.save()
}
