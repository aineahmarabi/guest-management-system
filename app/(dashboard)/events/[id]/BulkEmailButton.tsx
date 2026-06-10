'use client'

import { useState } from 'react'

export default function BulkEmailButton({ eventId, guestCount }: { eventId: string; guestCount: number }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)

  async function handleSendAll() {
    if (!window.confirm(`Send invitation emails to all ${guestCount} guests?`)) return

    setLoading(true)
    setResult(null)

    const res = await fetch('/api/email/send-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    })

    const data = await res.json()
    setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 })
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSendAll}
        disabled={loading || guestCount === 0}
        className="bg-[#2A2A2A] hover:bg-[#3A3A3A] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
      >
        {loading ? 'Sending...' : 'Send All Emails'}
      </button>
      {result && (
        <span className="text-sm text-[#9CA3AF]">
          {result.sent} sent{result.failed > 0 && `, ${result.failed} failed`}
        </span>
      )}
    </div>
  )
}
