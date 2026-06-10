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
      // PKCE flow: code in query params
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          router.replace('/update-password')
          return
        }
      }

      // Implicit flow: tokens in hash fragment — getSession processes it automatically
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/update-password')
        return
      }

      setMessage('Link expired or invalid. Redirecting…')
      setTimeout(() => router.replace('/login?error=invite_expired'), 2000)
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
