'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface ScanResult {
  status: 'success' | 'already_checked_in' | 'invalid'
  message: string
  guestName?: string
  escortCount?: number
  checkedInAt?: string
}

export default function CheckinScanner({
  event,
  initialTotal,
  initialCheckedIn,
}: {
  event: { id: string; name: string; event_date: string; venue: string }
  initialTotal: number
  initialCheckedIn: number
}) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Re-focus after result clears
  useEffect(() => {
    if (!result) {
      inputRef.current?.focus()
    }
  }, [result])

  function playSound(type: 'success' | 'error' | 'warning') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.connect(gain)
      gain.connect(ctx.destination)

      if (type === 'success') {
        oscillator.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.3)
      } else if (type === 'warning') {
        oscillator.frequency.value = 440
        oscillator.type = 'square'
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.4)
      } else {
        oscillator.frequency.value = 220
        oscillator.type = 'sawtooth'
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.5)
      }
    } catch {
      // Audio not available
    }
  }

  const handleScan = useCallback(async (ticketId: string) => {
    if (!ticketId.trim() || loading) return

    setLoading(true)
    setResult(null)

    const res = await fetch('/api/checkin/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: ticketId.trim(), eventId: event.id }),
    })

    const data: ScanResult = await res.json()
    setResult(data)
    setLoading(false)
    setInput('')

    if (data.status === 'success') {
      setCheckedIn(prev => prev + 1)
      playSound('success')
    } else if (data.status === 'already_checked_in') {
      playSound('warning')
    } else {
      playSound('error')
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setResult(null)
    }, 4000)
  }, [event.id, loading])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && input.trim()) {
      handleScan(input)
    }
  }

  const pending = initialTotal - checkedIn
  const rate = initialTotal > 0 ? Math.round((checkedIn / initialTotal) * 100) : 0

  const resultColors = {
    success: 'bg-[#16A34A] border-[#16A34A]',
    already_checked_in: 'bg-[#D97706] border-[#D97706]',
    invalid: 'bg-[#DC2626] border-[#DC2626]',
  }

  const resultIcons = {
    success: '✓',
    already_checked_in: '⚠',
    invalid: '✗',
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">{event.name}</h1>
          <p className="text-[#9CA3AF] text-sm">
            {new Date(event.event_date).toLocaleDateString('en-KE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            {' · '}{event.venue}
          </p>
        </div>
        <Link
          href={`/events/${event.id}`}
          className="text-[#9CA3AF] hover:text-white text-sm transition-colors"
        >
          ← Back
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 border-b border-[#2A2A2A]">
        <div className="px-6 py-4 text-center border-r border-[#2A2A2A]">
          <div className="text-[#16A34A] text-3xl font-bold font-mono">{checkedIn}</div>
          <div className="text-[#9CA3AF] text-xs mt-1 uppercase tracking-wider">Checked In</div>
        </div>
        <div className="px-6 py-4 text-center border-r border-[#2A2A2A]">
          <div className="text-white text-3xl font-bold font-mono">{initialTotal}</div>
          <div className="text-[#9CA3AF] text-xs mt-1 uppercase tracking-wider">Total</div>
        </div>
        <div className="px-6 py-4 text-center">
          <div className="text-[#9CA3AF] text-3xl font-bold font-mono">{pending}</div>
          <div className="text-[#9CA3AF] text-xs mt-1 uppercase tracking-wider">Pending</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#2A2A2A]">
        <div
          className="h-1 bg-[#16A34A] transition-all duration-500"
          style={{ width: `${rate}%` }}
        />
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Result display */}
        {result ? (
          <div className={`w-full max-w-lg border-2 rounded-[6px] p-8 text-center mb-8 ${resultColors[result.status]}`}>
            <div className="text-white text-5xl font-bold mb-4">
              {resultIcons[result.status]}
            </div>
            <div className="text-white text-2xl font-bold mb-2">
              {result.status === 'success' && 'ADMITTED'}
              {result.status === 'already_checked_in' && 'ALREADY CHECKED IN'}
              {result.status === 'invalid' && 'INVALID TICKET'}
            </div>
            {result.guestName && (
              <div className="text-white text-xl mt-1">{result.guestName}</div>
            )}
            {result.status === 'success' && result.escortCount !== undefined && result.escortCount > 0 && (
              <div className="text-white/80 text-lg mt-1">+ {result.escortCount} Escort{result.escortCount > 1 ? 's' : ''}</div>
            )}
            {result.status === 'already_checked_in' && result.checkedInAt && (
              <div className="text-white/80 text-sm mt-2">
                Originally checked in at {new Date(result.checkedInAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            {result.status === 'invalid' && (
              <div className="text-white/80 text-sm mt-2">Gate Crasher — Do not admit</div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-lg border-2 border-dashed border-[#2A2A2A] rounded-[6px] p-8 text-center mb-8">
            <div className="text-[#4B5563] text-4xl mb-4">⬜</div>
            <div className="text-[#9CA3AF] text-lg">Ready to scan</div>
            <div className="text-[#4B5563] text-sm mt-1">Scan QR code or type ticket ID</div>
          </div>
        )}

        {/* Input */}
        <div className="w-full max-w-lg">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scan or type ticket ID... (Enter to submit)"
            disabled={loading}
            className="w-full bg-[#1A1A1A] border-2 border-[#2A2A2A] focus:border-[#800000] rounded-[6px] px-5 py-4 text-white text-lg font-mono placeholder-[#4B5563] focus:outline-none transition-colors disabled:opacity-50"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <p className="text-[#4B5563] text-xs text-center mt-2">
            USB/Bluetooth QR scanner will auto-submit on scan
          </p>
        </div>
      </div>
    </div>
  )
}
