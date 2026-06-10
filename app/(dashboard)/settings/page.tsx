import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Profile } from '@/types/supabase'
import UserManagement from './UserManagement'
import OrgSettingsForm from './OrgSettingsForm'
import ProfileForm from './ProfileForm'

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
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  const isSuperAdmin = profile?.role === 'super_admin'

  let users: Profile[] = []
  let orgSettings = ORG_DEFAULTS

  if (isSuperAdmin) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: usersData } = await (admin as any)
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    users = (usersData ?? []) as Profile[]

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orgData } = await (admin as any).from('org_settings').select('*').single()
      if (orgData) orgSettings = { ...ORG_DEFAULTS, ...orgData }
    } catch {
      // table not yet created — use defaults
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-white text-xl md:text-2xl font-semibold">Settings</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">
          {isSuperAdmin ? 'Super admin controls' : 'Manage your profile'}
        </p>
      </div>

      <ProfileForm
        initialName={profile?.full_name ?? ''}
        email={profile?.email ?? user.email ?? ''}
      />

      {isSuperAdmin && (
        <>
          <OrgSettingsForm initial={orgSettings} />
          <UserManagement users={users} currentUserId={user.id} />
        </>
      )}
    </div>
  )
}
