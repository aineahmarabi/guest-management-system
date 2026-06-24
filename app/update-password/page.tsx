'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const router = useRouter()

  useEffect(() => {
    // Password updates now happen via Settings → Change Password
    router.replace('/settings')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-[#800000] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
