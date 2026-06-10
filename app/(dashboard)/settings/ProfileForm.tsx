'use client'

import { useState } from 'react'

export default function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const [name, setName] = useState(initialName)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setStatus('saving')

    const res = await fetch('/api/profile/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name.trim() }),
    })

    setStatus(res.ok ? 'saved' : 'error')
    if (res.ok) setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-6 mb-8">
      <h2 className="text-white font-medium text-sm mb-4">My Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#9CA3AF] mb-1.5">Full Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-[#9CA3AF] mb-1.5">Email</label>
            <input
              value={email}
              disabled
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-[#4B5563] text-sm cursor-not-allowed"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status === 'saving'}
            className="bg-[#800000] hover:bg-[#6B0000] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
          >
            {status === 'saving' ? 'Saving…' : 'Save Name'}
          </button>
          {status === 'saved' && <span className="text-[#16A34A] text-sm">Saved</span>}
          {status === 'error' && <span className="text-[#DC2626] text-sm">Failed to save</span>}
        </div>
      </form>
    </div>
  )
}
