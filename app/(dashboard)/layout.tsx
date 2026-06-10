import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

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
