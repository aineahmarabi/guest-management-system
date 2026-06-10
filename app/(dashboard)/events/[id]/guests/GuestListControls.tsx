'use client'

import { useState } from 'react'
import Link from 'next/link'
import BulkImportModal from './BulkImportModal'

export default function GuestListControls({ eventId }: { eventId: string }) {
  const [showImport, setShowImport] = useState(false)

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShowImport(true)}
          className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
        >
          Import CSV
        </button>
        <Link
          href={`/events/${eventId}/guests/new`}
          className="bg-[#800000] hover:bg-[#6B0000] text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
        >
          + Add Guest
        </Link>
      </div>

      {showImport && (
        <BulkImportModal eventId={eventId} onClose={() => setShowImport(false)} />
      )}
    </>
  )
}
