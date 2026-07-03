import { createServiceClient } from './supabase'

export async function getLogoUrl(): Promise<string> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'logo_url')
    .maybeSingle()
  return data?.value ?? '/logo_baznas.png'
}
