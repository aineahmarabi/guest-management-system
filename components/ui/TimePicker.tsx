'use client'

import { useState, useRef, useEffect } from 'react'

interface TimePickerProps {
  value: string // HH:MM 24-hour
  onChange: (value: string) => void
  placeholder?: string
}

function to12hr(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

const TIMES: string[] = []
for (let h = 0; h < 24; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`)
  TIMES.push(`${String(h).padStart(2, '0')}:30`)
}

export default function TimePicker({ value, onChange, placeholder = 'Select time' }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  useEffect(() => {
    if (!open) return
    // scroll to selected or to 8:00 AM default
    const idx = value ? TIMES.indexOf(value) : TIMES.indexOf('08:00')
    if (idx >= 0 && listRef.current) {
      const el = listRef.current.children[idx] as HTMLElement
      el?.scrollIntoView({ block: 'center' })
    }
  }, [open, value])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:border-[#800000] transition-colors text-left hover:border-[#3A3A3A]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#9CA3AF] shrink-0">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className={value ? 'text-white' : 'text-[#4B5563]'}>{value ? to12hr(value) : placeholder}</span>
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute top-full left-0 mt-1 z-50 bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] shadow-2xl w-36 max-h-52 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#3A3A3A #1A1A1A' }}
        >
          {TIMES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { onChange(t); setOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                t === value
                  ? 'bg-[#800000] text-white font-medium'
                  : 'text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-white'
              }`}
            >
              {to12hr(t)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
