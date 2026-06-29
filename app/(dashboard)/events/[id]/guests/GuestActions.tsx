'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Doc } from '@/convex/_generated/dataModel'
import EditGuestModal from './EditGuestModal'

type Guest = Doc<'guests'>

export default function GuestActions({ guest, eventId }: { guest: Guest; eventId: string }) {
  const router = useRouter()
  const removeGuest = useMutation(api.guests.remove)
  const profile = useQuery(api.profiles.getMe)
  const [emailLoading, setEmailLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const canEdit = profile?.role === 'super_admin' || profile?.role === 'event_manager'

  async function handleResendEmail() {
    setEmailLoading(true)
    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId: guest._id }),
    })
    setEmailLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${guest.full_name}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await removeGuest({ id: guest._id })
      router.refresh()
    } catch {
      setDeleting(false)
    }
  }

  void eventId

  return (
    <>
      <div className="flex gap-2 items-center flex-wrap">
        {canEdit && (
          <>
            <button
              onClick={() => setEditOpen(true)}
              className="text-[#9CA3AF] hover:text-white text-xs transition-colors"
            >
              Edit
            </button>
            <span className="text-[#2A2A2A]">·</span>
          </>
        )}
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
      {editOpen && <EditGuestModal guest={guest} onClose={() => setEditOpen(false)} />}
    </>
  )
}
