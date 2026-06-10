import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    const serverSupabase = createClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()
    const now = new Date()
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const { count } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('checked_in', true)
      .gte('checked_in_at', todayMidnight)

    return NextResponse.json({ checkedInToday: count ?? 0 })
  } catch {
    return NextResponse.json({ checkedInToday: 0 }, { status: 500 })
  }
}
