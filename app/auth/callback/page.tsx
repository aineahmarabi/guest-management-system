'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Processing your invitation…')

  useEffect(() => {
    const supabase = createClient()

    async function handleCallback() {
      // 1. PKCE flow — code in query params
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) { router.replace('/update-password'); return }
      }

      // 2. Implicit flow — tokens in hash fragment (#access_token=...&refresh_token=...)
      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (!error) { router.replace('/update-password'); return }
      }

      // 3. Session may already exist (page refresh)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { router.replace('/update-password'); return }

      // Nothing worked — link is expired or already used
      setMessage('Link expired or already used. Redirecting to sign in…')
      setTimeout(() => router.replace('/login'), 2500)
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#800000] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  )
}
