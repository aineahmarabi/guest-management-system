'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Guest } from '@/types/supabase'

export default function GuestActions({ guest, eventId }: { guest: Guest; eventId: string }) {
  const router = useRouter()
  const [emailLoading, setEmailLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleResendEmail() {
    setEmailLoading(true)
    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId: guest.id }),
    })
    setEmailLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${guest.full_name}? This cannot be undone.`)) return
    setDeleting(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('guests').delete().eq('id', guest.id)
    setDeleting(false)
    router.refresh()
  }

  // suppress unused eventId warning in future
  void eventId

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={handleResendEmail}
        disabled={emailLoading}
        className="text-[#9CA3AF] hover:text-white text-xs transition-colors disabled:opacity-50"
      >
        {emailLoading ? 'Sending...' : 'Resend Email'}
      </button>
      <span className="text-[#2A2A2A]">·</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-[#DC2626] hover:text-red-400 text-xs transition-colors disabled:opacity-50"
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
}
