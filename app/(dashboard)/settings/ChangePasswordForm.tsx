'use client'

import { useState } from 'react'

export default function ChangePasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (form.newPassword.length < 8) { setError('New password must be at least 8 characters.'); return }
    if (form.newPassword !== form.confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    const res = await fetch('/api/profile/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? 'Failed to change password.'); return }
    setSuccess(true)
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-6 mb-6">
      <h2 className="text-white font-medium text-sm mb-5">Change Password</h2>

      {error && <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-sm rounded-[6px] px-4 py-3 mb-4">{error}</div>}
      {success && <div className="bg-[#16A34A]/10 border border-[#16A34A]/30 text-[#16A34A] text-sm rounded-[6px] px-4 py-3 mb-4">Password changed successfully.</div>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        {[
          { label: 'Current Password', key: 'currentPassword' },
          { label: 'New Password', key: 'newPassword' },
          { label: 'Confirm New Password', key: 'confirmPassword' },
        ].map(({ label, key }) => (
          <div key={key}>
            <label className="block text-xs text-[#9CA3AF] mb-1.5">{label}</label>
            <input
              type="password"
              value={form[key as keyof typeof form]}
              onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              required
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] transition-colors"
            />
          </div>
        ))}
        <button type="submit" disabled={loading} className="bg-[#2A2A2A] hover:bg-[#3A3A3A] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors">
          {loading ? 'Saving...' : 'Change Password'}
        </button>
      </form>
    </div>
  )
}
