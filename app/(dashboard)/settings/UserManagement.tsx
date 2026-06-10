'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types/supabase'

export default function UserManagement({ users, currentUserId }: { users: Profile[]; currentUserId: string }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pendingInviteUrl, setPendingInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'event_manager' as 'super_admin' | 'event_manager',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to send invite.')
      setLoading(false)
      return
    }

    setForm({ full_name: '', email: '', role: 'event_manager' })
    setShowForm(false)
    setLoading(false)

    if (data.emailSent) {
      setSuccess(`Invite email sent to ${form.email}`)
      setPendingInviteUrl('')
    } else {
      setSuccess('')
      setPendingInviteUrl(data.inviteUrl ?? '')
    }
    router.refresh()
  }

  async function copyInviteLink() {
    if (!pendingInviteUrl) return
    await navigator.clipboard.writeText(pendingInviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDeactivate(userId: string, name: string) {
    if (!window.confirm(`Deactivate ${name}?`)) return

    await fetch('/api/admin/deactivate-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    router.refresh()
  }

  async function handleResendInvite(userId: string, name: string) {
    setError('')
    setSuccess('')
    setPendingInviteUrl('')

    const res = await fetch('/api/admin/resend-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to resend invite.')
      return
    }

    if (data.emailSent) {
      setSuccess(`Invite resent to ${name}`)
    } else {
      setPendingInviteUrl(data.inviteUrl ?? '')
    }
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
        <h2 className="text-white font-medium text-sm">Users ({users.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#800000] hover:bg-[#6B0000] text-white text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors"
        >
          + Invite User
        </button>
      </div>

      {/* Invite user form */}
      {showForm && (
        <div className="px-5 py-5 border-b border-[#2A2A2A] bg-[#0D0D0D]/50">
          {error && (
            <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-sm rounded-[6px] px-3 py-2 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSendInvite} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Full Name</label>
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                placeholder="Jane Doe"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="jane@dualpix.co.ke"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#800000]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000]"
              >
                <option value="event_manager">Event Manager</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="flex gap-2 w-full">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#800000] hover:bg-[#6B0000] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm px-4 py-2 rounded-[6px] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {success && (
        <div className="bg-[#16A34A]/10 border-b border-[#16A34A]/30 text-[#16A34A] text-sm px-5 py-3 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {success}
        </div>
      )}

      {pendingInviteUrl && (
        <div className="border-b border-[#F59E0B]/30 bg-[#F59E0B]/10 px-5 py-4">
          <div className="flex items-start gap-2 mb-3">
            <svg className="text-[#F59E0B] flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <p className="text-[#F59E0B] text-sm font-medium">User created — email not sent</p>
              <p className="text-[#9CA3AF] text-xs mt-0.5">
                Email credentials are not configured. Copy this invite link and share it manually.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={pendingInviteUrl}
              className="flex-1 min-w-0 bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-1.5 text-[#9CA3AF] text-xs font-mono truncate focus:outline-none"
            />
            <button
              onClick={copyInviteLink}
              className="flex-shrink-0 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#2A2A2A]">
            {['Name', 'Email', 'Role', 'Status', 'Created', 'Actions'].map(h => (
              <th key={h} className="text-left text-xs text-[#9CA3AF] font-medium px-5 py-3 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A2A2A]">
          {users.map(u => (
            <tr key={u.id} className="hover:bg-[#2A2A2A]/30 transition-colors">
              <td className="px-5 py-3 text-white text-sm">{u.full_name}</td>
              <td className="px-5 py-3 text-[#9CA3AF] text-sm">{u.email}</td>
              <td className="px-5 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'super_admin' ? 'text-[#800000] bg-[#800000]/10' : 'text-[#9CA3AF] bg-[#2A2A2A]'}`}>
                  {u.role === 'super_admin' ? 'Super Admin' : 'Event Manager'}
                </span>
              </td>
              <td className="px-5 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'text-[#16A34A] bg-[#16A34A]/10' : 'text-[#DC2626] bg-[#DC2626]/10'}`}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-5 py-3 text-[#9CA3AF] text-xs font-mono">
                {new Date(u.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  {u.id === currentUserId ? (
                    <span className="text-[#4B5563] text-xs">You</span>
                  ) : (
                    <>
                      {u.is_active && (
                        <button
                          onClick={() => handleResendInvite(u.id, u.full_name)}
                          className="text-[#9CA3AF] hover:text-white text-xs transition-colors"
                        >
                          Resend Invite
                        </button>
                      )}
                      {u.is_active && (
                        <button
                          onClick={() => handleDeactivate(u.id, u.full_name)}
                          className="text-[#DC2626] hover:text-red-400 text-xs transition-colors"
                        >
                          Deactivate
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
