import { redirect } from 'next/navigation'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = await convexAuthNextjsToken()
  if (!token) return redirect('/login')

  const profile = await fetchQuery(api.profiles.getMe, {}, { token })
  if (!profile) return redirect('/login')

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar profile={profile} />
      <main className="flex-1 min-w-0 overflow-auto pb-14 md:pb-0">
        <Header profile={profile} />
        {children}
      </main>
    </div>
  )
}
