import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import UserManagement from './UserManagement'
import OrgSettingsForm from './OrgSettingsForm'
import ProfileForm from './ProfileForm'
import ChangePasswordForm from './ChangePasswordForm'
import { Doc } from '@/convex/_generated/dataModel'

const ORG_DEFAULTS = {
  company_name: 'Dualpix Communications Ltd',
  website: 'www.dualpix.co.ke',
  email: '',
  phone: '',
  address: 'The Don Bosco MSSC Center, West Wing, Matumbatu Road Upper Hill, P.O Box 28522 - 00200, Nairobi, Kenya',
}

export default async function SettingsPage() {
  const token = await convexAuthNextjsToken()
  if (!token) redirect('/login')

  const profile = await fetchQuery(api.profiles.getMe, {}, { token })
  if (!profile) redirect('/login')

  const isSuperAdmin = profile.role === 'super_admin'

  let users: Doc<'profiles'>[] = []
  let orgSettings = ORG_DEFAULTS

  if (isSuperAdmin) {
    const [usersData, orgData] = await Promise.all([
      fetchQuery(api.adminUsers.listAllProfiles, {}, { token }),
      fetchQuery(api.orgSettings.get, {}, { token }),
    ])
    users = usersData
    if (orgData) orgSettings = { ...ORG_DEFAULTS, ...orgData }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-white text-xl md:text-2xl font-semibold">Settings</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">
          {isSuperAdmin ? 'Super admin controls' : 'Manage your profile'}
        </p>
      </div>

      <ProfileForm initialName={profile.full_name} email={profile.email} />
      <ChangePasswordForm />

      {isSuperAdmin && (
        <>
          <OrgSettingsForm initial={orgSettings} />
          <UserManagement users={users} currentProfileId={profile._id} />
        </>
      )}
    </div>
  )
}
