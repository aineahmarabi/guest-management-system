'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/supabase'

function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/events') return 'Events'
  if (pathname === '/events/new') return 'New Event'
  if (pathname === '/reports') return 'Reports'
  if (pathname === '/settings') return 'Settings'
  if (pathname === '/checkin') return 'Camera Check-in'
  if (pathname.endsWith('/guests/new')) return 'Add Guest'
  if (pathname.endsWith('/guests')) return 'Guest List'
  if (pathname.endsWith('/report')) return 'Event Report'
  if (pathname.endsWith('/checkin')) return 'Check-in Scanner'
  if (pathname.startsWith('/events/')) return 'Event Details'
  return 'Dualpix GMS'
}

export default function Header({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const title = getPageTitle(pathname)
  const initials = profile.full_name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 h-14 bg-[#0D0D0D]/95 backdrop-blur-sm border-b border-[#2A2A2A]">
      <h2 className="text-white font-semibold text-sm md:text-base">{title}</h2>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-[6px] hover:bg-[#1A1A1A] transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#800000] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] font-bold">{initials}</span>
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <div className="text-white text-xs font-medium">{profile.full_name}</div>
            <div className="text-[#9CA3AF] text-[10px]">
              {profile.role === 'super_admin' ? 'Super Admin' : 'Event Manager'}
            </div>
          </div>
          <svg
            className="text-[#9CA3AF] hidden sm:block"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] shadow-2xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-[#2A2A2A]">
              <div className="text-white text-xs font-medium truncate">{profile.full_name}</div>
              <div className="text-[#9CA3AF] text-xs truncate mt-0.5">{profile.email}</div>
              <div className="mt-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  profile.role === 'super_admin'
                    ? 'bg-[#800000]/20 text-[#800000]'
                    : 'bg-[#2A2A2A] text-[#9CA3AF]'
                }`}>
                  {profile.role === 'super_admin' ? 'Super Admin' : 'Event Manager'}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#9CA3AF] hover:text-white hover:bg-[#2A2A2A] text-xs transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
