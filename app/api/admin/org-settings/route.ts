import { NextRequest, NextResponse } from 'next/server'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery, fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

const DEFAULTS = {
  company_name: 'Dualpix Communications Ltd',
  website: 'www.dualpix.co.ke',
  email: '',
  phone: '',
  address: 'The Don Bosco MSSC Center, West Wing, Matumbatu Road Upper Hill, P.O Box 28522 - 00200, Nairobi, Kenya',
}

export async function GET() {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) return NextResponse.json(DEFAULTS)

    const data = await fetchQuery(api.orgSettings.get, {}, { token })
    return NextResponse.json(data ?? DEFAULTS)
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await fetchQuery(api.profiles.getMe, {}, { token })
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { company_name, website, email, phone, address } = await request.json()

    await fetchMutation(api.orgSettings.upsert, {
      company_name: company_name ?? DEFAULTS.company_name,
      website: website ?? DEFAULTS.website,
      email: email ?? '',
      phone: phone ?? '',
      address: address ?? DEFAULTS.address,
    }, { token })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
