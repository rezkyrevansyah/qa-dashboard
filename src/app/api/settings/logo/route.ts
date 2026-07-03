import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

const BUCKET = 'qa-dashboard'
const LOGO_KEY = 'logo'
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'logo_url')
    .maybeSingle()
  return NextResponse.json({ url: data?.value ?? '/logo_baznas.png' })
}

export async function POST(req: Request) {
  try { await requireAuth() } catch (res) { return res as Response }

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File harus berupa gambar' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Ukuran file maksimal 2MB' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Determine file extension and upload with consistent name
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${LOGO_KEY}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}` // cache bust

  await supabase
    .from('app_settings')
    .upsert({ key: 'logo_url', value: publicUrl }, { onConflict: 'key' })

  return NextResponse.json({ url: publicUrl })
}
