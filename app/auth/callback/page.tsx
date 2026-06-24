'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Convex Auth handles sessions automatically via cookies in middleware.
    // This page just redirects to dashboard after a brief delay.
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#800000] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
