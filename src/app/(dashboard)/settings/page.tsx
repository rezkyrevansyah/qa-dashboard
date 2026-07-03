import { getLogoUrl } from '@/lib/settings'
import { LogoUploader } from './_components/LogoUploader'

export default async function SettingsPage() {
  const logoUrl = await getLogoUrl()

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Konfigurasi aplikasi QA Dashboard</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Logo Aplikasi</h2>

        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-white rounded-xl p-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              Logo ini ditampilkan di sidebar, halaman login, dan public report.
            </p>
            <p className="text-xs text-gray-600">Format: PNG, JPG, SVG · Maks 2MB</p>
            <LogoUploader currentLogoUrl={logoUrl} />
          </div>
        </div>
      </div>
    </div>
  )
}
