import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Profile } from '@/types/supabase'
import UserManagement from './UserManagement'
import OrgSettingsForm from './OrgSettingsForm'

const ORG_DEFAULTS = {
  company_name: 'Dualpix Communications Ltd',
  website: 'www.dualpix.co.ke',
  email: '',
  phone: '',
  address: 'The Don Bosco MSSC Center, West Wing, Matumbatu Road Upper Hill, P.O Box 28522 - 00200, Nairobi, Kenya',
}

export default async function SettingsPage() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (admin as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string } | null
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usersData } = await (admin as any)
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  const users = (usersData ?? []) as Profile[]

  // Fetch org settings — fall back to defaults if table doesn't exist yet
  let orgSettings = ORG_DEFAULTS
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orgData } = await (admin as any).from('org_settings').select('*').single()
    if (orgData) orgSettings = { ...ORG_DEFAULTS, ...orgData }
  } catch {
    // table not yet created — use defaults
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-white text-xl md:text-2xl font-semibold">Settings</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">Super admin controls</p>
      </div>

      <OrgSettingsForm initial={orgSettings} />

      <UserManagement users={users} currentUserId={user.id} />
    </div>
  )
}
