'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const results = useQuery(
    api.search.global,
    query.trim().length >= 2 ? { q: query.trim() } : 'skip'
  )

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function handleFocus() {
    if (query.trim().length >= 2) setOpen(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setOpen(e.target.value.trim().length >= 2)
  }

  function go(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const hasResults = results && (results.guests.length > 0 || results.events.length > 0)
  const showDropdown = open && query.trim().length >= 2

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs hidden md:block">
      <div className="relative">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="Search guests, events…"
          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] pl-9 pr-3 py-1.5 text-white text-xs placeholder-[#4B5563] focus:outline-none focus:border-[#800000] transition-colors"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setOpen(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-white">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] shadow-2xl z-50 overflow-hidden">
          {!results && (
            <div className="px-4 py-3 text-xs text-[#4B5563]">Searching…</div>
          )}

          {results && !hasResults && (
            <div className="px-4 py-3 text-xs text-[#4B5563]">No results for &ldquo;{query}&rdquo;</div>
          )}

          {results && results.events.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] text-[#4B5563] font-semibold uppercase tracking-wider border-b border-[#2A2A2A]">Events</div>
              {results.events.map(event => (
                <button
                  key={event._id}
                  type="button"
                  onClick={() => go(`/events/${event._id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#2A2A2A] transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded bg-[#800000]/20 flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#800000" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-xs font-medium truncate">{event.name}</div>
                    <div className="text-[#9CA3AF] text-[10px]">{event.venue} · {event.event_date}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results && results.guests.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] text-[#4B5563] font-semibold uppercase tracking-wider border-b border-[#2A2A2A]">Guests</div>
              {results.guests.map(guest => (
                <button
                  key={guest._id}
                  type="button"
                  onClick={() => go(`/events/${guest.event_id}/guests`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#2A2A2A] transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center shrink-0 text-[10px] text-white font-semibold">
                    {guest.full_name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-xs font-medium truncate">{guest.full_name}</div>
                    <div className="text-[#9CA3AF] text-[10px] truncate">{guest.email} · {guest.ticket_id}</div>
                  </div>
                  {guest.checked_in && (
                    <span className="ml-auto text-[10px] text-[#16A34A] bg-[#16A34A]/10 px-1.5 py-0.5 rounded-full shrink-0">In</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
