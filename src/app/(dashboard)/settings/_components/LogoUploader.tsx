'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'

interface LogoUploaderProps {
  currentLogoUrl: string
}

export function LogoUploader({ currentLogoUrl }: LogoUploaderProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleUpload() {
    const file = inputRef.current?.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/settings/logo', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error ?? 'Upload gagal')
        return
      }

      toast.success('Logo berhasil diperbarui')
      setPreview(null)
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    } catch {
      toast.error('Upload gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview && (
        <div className="w-10 h-10 bg-white rounded-lg p-1 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="w-full h-full object-contain" />
        </div>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
      >
        <Upload className="w-3.5 h-3.5" />
        Pilih Gambar
      </button>

      {preview && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Mengupload...' : 'Simpan'}
        </button>
      )}
    </div>
  )
}
