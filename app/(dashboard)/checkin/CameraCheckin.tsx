'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import jsQR from 'jsqr'

interface LookupResult {
  status: 'found' | 'invalid'
  guestName?: string
  eventName?: string
  escortCount?: number
  checkedIn?: boolean
  checkedInAt?: string | null
}

interface CheckinResult {
  status: 'success' | 'already_checked_in' | 'invalid'
  guestName?: string
  escortCount?: number
  checkedInAt?: string
}

type Phase =
  | { name: 'idle' }
  | { name: 'loading' }
  | { name: 'action'; ticketId: string; lookup: LookupResult }
  | { name: 'action_loading'; ticketId: string; lookup: LookupResult }
  | { name: 'result'; result: CheckinResult & { mode?: 'verify'; eventName?: string; checkedIn?: boolean } }

function toEAT(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  })
}

export default function CameraCheckin() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const scanningRef = useRef(true)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [phase, setPhase] = useState<Phase>({ name: 'idle' })
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasCamera, setHasCamera] = useState(true)
  const [checkedInToday, setCheckedInToday] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    fetch('/api/checkin/stats')
      .then(r => r.json())
      .then(d => { if (typeof d.checkedInToday === 'number') setCheckedInToday(d.checkedInToday) })
      .catch(() => {})
  }, [phase])

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) setHasCamera(false)
  }, [])

  function playSound(type: 'success' | 'error' | 'warning') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      if (type === 'success') {
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
      } else if (type === 'warning') {
        osc.frequency.value = 440; osc.type = 'square'
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
      } else {
        osc.frequency.value = 220; osc.type = 'sawtooth'
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
      }
    } catch { /* audio unavailable */ }
  }

  function scheduleReset(delay = 4000) {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => {
      setPhase({ name: 'idle' })
      scanningRef.current = true
    }, delay)
  }

  const handleQRDetected = useCallback(async (qrData: string) => {
    if (!scanningRef.current || phase.name !== 'idle') return
    scanningRef.current = false
    setPhase({ name: 'loading' })

    try {
      const res = await fetch(`/api/checkin/lookup?ticketId=${encodeURIComponent(qrData.trim())}`)
      const data: LookupResult = await res.json()

      if (data.status === 'invalid') {
        playSound('error')
        setPhase({ name: 'result', result: { status: 'invalid' } })
        scheduleReset()
      } else {
        setPhase({ name: 'action', ticketId: qrData.trim(), lookup: data })
      }
    } catch {
      playSound('error')
      setPhase({ name: 'result', result: { status: 'invalid' } })
      scheduleReset()
    }
  }, [phase.name]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCheckIn() {
    if (phase.name !== 'action') return
    const { ticketId, lookup } = phase
    setPhase({ name: 'action_loading', ticketId, lookup })

    try {
      const res = await fetch('/api/checkin/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId }),
      })
      const data: CheckinResult = await res.json()

      if (data.status === 'success') {
        setCheckedInToday(prev => prev + 1)
        playSound('success')
      } else if (data.status === 'already_checked_in') {
        playSound('warning')
      } else {
        playSound('error')
      }
      setPhase({ name: 'result', result: data })
      scheduleReset()
    } catch {
      playSound('error')
      setPhase({ name: 'result', result: { status: 'invalid' } })
      scheduleReset()
    }
  }

  function handleVerify() {
    if (phase.name !== 'action') return
    const { lookup } = phase
    setPhase({
      name: 'result',
      result: {
        status: 'success',
        mode: 'verify',
        guestName: lookup.guestName,
        eventName: lookup.eventName,
        escortCount: lookup.escortCount,
        checkedIn: lookup.checkedIn,
        checkedInAt: lookup.checkedInAt ?? undefined,
      },
    })
    scheduleReset()
  }

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(tick)
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) { animFrameRef.current = requestAnimationFrame(tick); return }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
    if (code?.data && scanningRef.current) handleQRDetected(code.data)
    animFrameRef.current = requestAnimationFrame(tick)
  }, [handleQRDetected])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setStarted(true)
        animFrameRef.current = requestAnimationFrame(tick)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings and reload.')
      } else {
        setCameraError('Unable to access camera. Please ensure a camera is connected and try again.')
      }
    }
  }, [tick])

  useEffect(() => {
    const videoEl = videoRef.current
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      if (videoEl?.srcObject) {
        const stream = videoEl.srcObject as MediaStream
        stream.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  if (!hasCamera) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-6">
        <div className="text-[#4B5563] mb-4">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <h2 className="text-white text-lg font-semibold mb-2">Camera Not Available</h2>
        <p className="text-[#9CA3AF] text-sm text-center mb-6">Camera check-in is available on devices with a camera.</p>
        <Link href="/dashboard" className="bg-[#800000] hover:bg-[#6B0000] text-white text-sm font-medium px-5 py-2 rounded-[6px] transition-colors">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  const isActionPhase = phase.name === 'action' || phase.name === 'action_loading'

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">
      <div className="border-b border-[#2A2A2A] px-4 py-3 flex items-center justify-between">
        <h1 className="text-white text-lg font-semibold">Scanner</h1>
        <Link href="/dashboard" className="text-[#9CA3AF] hover:text-white text-sm transition-colors">← Dashboard</Link>
      </div>

      <div className="border-b border-[#2A2A2A] px-6 py-3 flex items-center justify-center gap-2">
        <span className="text-[#16A34A] text-2xl font-bold font-mono">{checkedInToday}</span>
        <span className="text-[#9CA3AF] text-sm">checked in today</span>
      </div>

      {cameraError && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-sm rounded-[6px] px-5 py-4 text-center max-w-sm">
            <p className="font-medium mb-1">Camera Access Error</p>
            <p>{cameraError}</p>
          </div>
        </div>
      )}

      {!cameraError && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4">

          {/* Result overlay — invalid */}
          {phase.name === 'result' && phase.result.status === 'invalid' && !phase.result.mode && (
            <div className="w-full max-w-sm border-2 border-[#DC2626] bg-[#DC2626] rounded-[6px] p-6 text-center">
              <div className="text-white text-4xl font-bold mb-2">✗</div>
              <div className="text-white text-xl font-bold mb-1">INVALID TICKET</div>
              <div className="text-white/80 text-sm">Gate Crasher — Do not admit</div>
            </div>
          )}

          {/* Result overlay — already checked in */}
          {phase.name === 'result' && phase.result.status === 'already_checked_in' && (
            <div className="w-full max-w-sm border-2 border-[#D97706] bg-[#D97706] rounded-[6px] p-6 text-center">
              <div className="text-white text-4xl font-bold mb-2">⚠</div>
              <div className="text-white text-xl font-bold mb-1">ALREADY CHECKED IN</div>
              {phase.result.guestName && <div className="text-white text-lg mt-1">{phase.result.guestName}</div>}
              {phase.result.checkedInAt && (
                <div className="text-white/80 text-sm mt-2">
                  Checked in at {toEAT(phase.result.checkedInAt)} EAT
                </div>
              )}
            </div>
          )}

          {/* Result overlay — success (check in) */}
          {phase.name === 'result' && phase.result.status === 'success' && !phase.result.mode && (
            <div className="w-full max-w-sm border-2 border-[#16A34A] bg-[#16A34A] rounded-[6px] p-6 text-center">
              <div className="text-white text-4xl font-bold mb-2">✓</div>
              <div className="text-white text-xl font-bold mb-1">ADMITTED</div>
              {phase.result.guestName && <div className="text-white text-lg mt-1">{phase.result.guestName}</div>}
              {phase.result.escortCount !== undefined && phase.result.escortCount > 0 && (
                <div className="text-white/80 mt-1">+ {phase.result.escortCount} Escort{phase.result.escortCount > 1 ? 's' : ''}</div>
              )}
            </div>
          )}

          {/* Result overlay — verify (blue info) */}
          {phase.name === 'result' && phase.result.mode === 'verify' && (
            <div className="w-full max-w-sm border-2 border-[#2563EB] bg-[#1E3A8A] rounded-[6px] p-6 text-center">
              <div className="text-white text-4xl font-bold mb-2">ℹ</div>
              <div className="text-white text-xl font-bold mb-1">GUEST VERIFIED</div>
              {phase.result.guestName && <div className="text-white text-lg mt-1">{phase.result.guestName}</div>}
              {phase.result.eventName && <div className="text-white/80 text-sm mt-1">{phase.result.eventName}</div>}
              {phase.result.escortCount !== undefined && phase.result.escortCount > 0 && (
                <div className="text-white/70 text-sm mt-1">Escorts: {phase.result.escortCount}</div>
              )}
              <div className={`text-sm mt-2 font-semibold ${phase.result.checkedIn ? 'text-[#86EFAC]' : 'text-white/70'}`}>
                {phase.result.checkedIn ? '✓ Already checked in' : 'Not yet checked in'}
              </div>
              {phase.result.checkedIn && phase.result.checkedInAt && (
                <div className="text-white/60 text-xs mt-1">at {toEAT(phase.result.checkedInAt)} EAT</div>
              )}
            </div>
          )}

          {/* Action panel — two buttons */}
          {isActionPhase && (() => {
            const lookup = phase.name === 'action' ? phase.lookup : (phase as { name: 'action_loading'; lookup: LookupResult }).lookup
            const actionLoading = phase.name === 'action_loading'
            return (
              <div className="w-full max-w-sm border border-[#2A2A2A] bg-[#1A1A1A] rounded-[6px] p-6">
                <div className="text-center mb-4">
                  <div className="text-white text-lg font-semibold">{lookup.guestName}</div>
                  <div className="text-[#9CA3AF] text-sm mt-0.5">{lookup.eventName}</div>
                  {lookup.escortCount !== undefined && lookup.escortCount > 0 && (
                    <div className="text-[#9CA3AF] text-xs mt-1">+ {lookup.escortCount} escort{lookup.escortCount > 1 ? 's' : ''}</div>
                  )}
                  {lookup.checkedIn && (
                    <div className="text-[#D97706] text-xs mt-2 font-medium">
                      Already checked in{lookup.checkedInAt ? ` at ${toEAT(lookup.checkedInAt)} EAT` : ''}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                    className="w-full bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white font-semibold py-3 rounded-[6px] transition-colors text-sm"
                  >
                    {actionLoading ? 'Processing...' : '✓ CHECK IN GUEST'}
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={actionLoading}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold py-3 rounded-[6px] transition-colors text-sm"
                  >
                    ℹ VERIFY GUEST
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Loading state */}
          {phase.name === 'loading' && (
            <div className="w-full max-w-sm border border-dashed border-[#2A2A2A] rounded-[6px] p-8 text-center">
              <div className="text-[#9CA3AF] text-lg">Looking up ticket...</div>
            </div>
          )}

          {/* Idle state */}
          {phase.name === 'idle' && (
            <div className="w-full max-w-sm border-2 border-dashed border-[#2A2A2A] rounded-[6px] p-8 text-center">
              <div className="text-[#4B5563] text-4xl mb-4">⬜</div>
              <div className="text-[#9CA3AF] text-lg">Ready to scan</div>
              <div className="text-[#4B5563] text-sm mt-1">Point camera at a QR code</div>
            </div>
          )}

          {/* Video element */}
          <div className="relative w-full max-w-sm aspect-square bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] overflow-hidden">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {phase.name === 'idle' && started && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-[#800000] rounded-[6px] opacity-70" />
              </div>
            )}
            {phase.name === 'loading' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-sm">Processing...</div>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {!started && !cameraError && (
            <button onClick={startCamera} className="bg-[#800000] hover:bg-[#6B0000] text-white text-sm font-medium px-6 py-3 rounded-[6px] transition-colors">
              Start Camera
            </button>
          )}

          {started && phase.name === 'idle' && (
            <p className="text-[#4B5563] text-xs text-center">Point the camera at a QR code to scan</p>
          )}
        </div>
      )}
    </div>
  )
}
