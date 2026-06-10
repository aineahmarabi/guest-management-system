import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const DEFAULTS = {
  company_name: 'Dualpix Communications Ltd',
  website: 'www.dualpix.co.ke',
  email: '',
  phone: '',
  address: 'The Don Bosco MSSC Center, West Wing, Matumbatu Road Upper Hill, P.O Box 28522 - 00200, Nairobi, Kenya',
}

export async function GET() {
  try {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any).from('org_settings').select('*').single()
    return NextResponse.json(data ?? DEFAULTS)
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const serverSupabase = createClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileData } = await (admin as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profileData as { role: string } | null)?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { company_name, website, email, phone, address } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('org_settings')
      .upsert({
        id: true,
        company_name,
        website,
        email,
        phone,
        address,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
