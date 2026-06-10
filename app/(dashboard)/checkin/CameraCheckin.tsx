'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import jsQR from 'jsqr'

interface ScanResult {
  status: 'success' | 'already_checked_in' | 'invalid'
  message: string
  guestName?: string
  escortCount?: number
  checkedInAt?: string
}

export default function CameraCheckin() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scanningRef = useRef(true)

  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasCamera, setHasCamera] = useState(true)
  const [checkedInToday, setCheckedInToday] = useState(0)
  const [started, setStarted] = useState(false)

  // Fetch stats
  useEffect(() => {
    fetch('/api/checkin/stats')
      .then(r => r.json())
      .then(d => {
        if (typeof d.checkedInToday === 'number') setCheckedInToday(d.checkedInToday)
      })
      .catch(() => {})
  }, [result])

  // Check if device has camera
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setHasCamera(false)
    }
  }, [])

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

  const handleQRDetected = useCallback(async (qrData: string) => {
    if (!scanningRef.current || loading) return
    scanningRef.current = false
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/checkin/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: qrData.trim() }),
    })

    const data: ScanResult = await res.json()
    setResult(data)
    setLoading(false)

    if (data.status === 'success') {
      setCheckedInToday(prev => prev + 1)
      playSound('success')
    } else if (data.status === 'already_checked_in') {
      playSound('warning')
    } else {
      playSound('error')
    }

    // Debounce: resume scanning after 3 seconds
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setResult(null)
      scanningRef.current = true
    }, 3000)
  }, [loading])

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
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(tick)
      return
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code && code.data && scanningRef.current) {
      handleQRDetected(code.data)
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }, [handleQRDetected])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
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
      if (debounceRef.current) clearTimeout(debounceRef.current)
      // Stop camera tracks
      if (videoEl?.srcObject) {
        const stream = videoEl.srcObject as MediaStream
        stream.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

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

  if (!hasCamera) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-6">
        <div className="text-[#4B5563] text-5xl mb-4">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <h2 className="text-white text-lg font-semibold mb-2">Camera Not Available</h2>
        <p className="text-[#9CA3AF] text-sm text-center mb-6">
          Camera check-in is available on mobile devices with a camera.
        </p>
        <Link
          href="/dashboard"
          className="bg-[#800000] hover:bg-[#6B0000] text-white text-sm font-medium px-5 py-2 rounded-[6px] transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] px-4 py-3 flex items-center justify-between">
        <h1 className="text-white text-lg font-semibold">Camera Check-in</h1>
        <Link
          href="/dashboard"
          className="text-[#9CA3AF] hover:text-white text-sm transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stats bar */}
      <div className="border-b border-[#2A2A2A] px-6 py-3 flex items-center justify-center gap-2">
        <span className="text-[#16A34A] text-2xl font-bold font-mono">{checkedInToday}</span>
        <span className="text-[#9CA3AF] text-sm">checked in today</span>
      </div>

      {/* Camera error */}
      {cameraError && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-sm rounded-[6px] px-5 py-4 text-center max-w-sm">
            <p className="font-medium mb-1">Camera Access Error</p>
            <p>{cameraError}</p>
          </div>
        </div>
      )}

      {/* Camera view */}
      {!cameraError && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4">
          {/* Scan result overlay */}
          {result && (
            <div className={`w-full max-w-sm border-2 rounded-[6px] p-6 text-center ${resultColors[result.status]}`}>
              <div className="text-white text-4xl font-bold mb-2">{resultIcons[result.status]}</div>
              <div className="text-white text-xl font-bold mb-1">
                {result.status === 'success' && 'ADMITTED'}
                {result.status === 'already_checked_in' && 'ALREADY CHECKED IN'}
                {result.status === 'invalid' && 'INVALID TICKET'}
              </div>
              {result.guestName && (
                <div className="text-white text-lg mt-1">{result.guestName}</div>
              )}
              {result.status === 'success' && result.escortCount !== undefined && result.escortCount > 0 && (
                <div className="text-white/80 mt-1">+ {result.escortCount} Escort{result.escortCount > 1 ? 's' : ''}</div>
              )}
              {result.status === 'already_checked_in' && result.checkedInAt && (
                <div className="text-white/80 text-sm mt-2">
                  Checked in at {new Date(result.checkedInAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {result.status === 'invalid' && (
                <div className="text-white/80 text-sm mt-1">Gate Crasher — Do not admit</div>
              )}
            </div>
          )}

          {/* Video element */}
          <div className="relative w-full max-w-sm aspect-square bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] overflow-hidden">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Scanning overlay guide */}
            {!result && started && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-[#800000] rounded-[6px] opacity-70" />
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-sm">Processing...</div>
              </div>
            )}
          </div>

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

          {!started && !cameraError && (
            <button
              onClick={startCamera}
              className="bg-[#800000] hover:bg-[#6B0000] text-white text-sm font-medium px-6 py-3 rounded-[6px] transition-colors"
            >
              Start Camera
            </button>
          )}

          {started && !result && (
            <p className="text-[#4B5563] text-xs text-center">
              Point the camera at a QR code to check in
            </p>
          )}
        </div>
      )}
    </div>
  )
}
