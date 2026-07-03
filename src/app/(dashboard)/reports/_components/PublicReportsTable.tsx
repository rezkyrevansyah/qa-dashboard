'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Copy, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'
import { RunStatusBadge } from '@/components/ui/RunStatusBadge'
import type { PublicReportWithDetails } from '@/lib/types'

interface Props {
  reports: PublicReportWithDetails[]
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatDuration(ms: number | null) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function PublicReportsTable({ reports: initialReports }: Props) {
  const [reports, setReports] = useState(initialReports)
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function toggleActive(token: string, is_active: boolean) {
    setLoading((prev) => ({ ...prev, [token]: true }))
    try {
      const res = await fetch('/api/report/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, is_active }),
      })
      if (!res.ok) throw new Error('Gagal mengupdate status')
      setReports((prev) =>
        prev.map((r) => r.token === token ? { ...r, is_active } : r)
      )
      toast.success(is_active ? 'Report aktif kembali' : 'Report dinonaktifkan')
    } catch {
      toast.error('Gagal mengupdate status report')
    } finally {
      setLoading((prev) => ({ ...prev, [token]: false }))
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/report/${token}`
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link disalin!')
    })
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <ExternalLink className="w-5 h-5 text-gray-600" />
        </div>
        <p className="text-gray-400 text-sm">Belum ada report yang dipublikasikan.</p>
        <p className="text-gray-600 text-xs mt-1">Buka run history dan klik icon Share untuk publish.</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 border-b border-gray-800">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Suite</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Run Date</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pass / Fail</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Published</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {reports.map((report) => (
            <tr
              key={report.id}
              className={clsx(
                'hover:bg-gray-800/30 transition-colors',
                !report.is_active && 'opacity-50'
              )}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-200">{report.suite.name}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${
                    report.suite.suite_type === 'api'
                      ? 'bg-purple-950 text-purple-400 border-purple-800'
                      : 'bg-cyan-950 text-cyan-400 border-cyan-800'
                  }`}>
                    {report.suite.suite_type.toUpperCase()}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-400">
                {formatDate(report.run.completed_at)}
              </td>
              <td className="px-4 py-3">
                <RunStatusBadge status={report.run.status} />
              </td>
              <td className="px-4 py-3">
                <span className="text-green-400 font-medium">{report.run.passed_tests}</span>
                <span className="text-gray-600"> / </span>
                <span className="text-red-400 font-medium">{report.run.failed_tests}</span>
                <span className="text-gray-600 text-xs ml-1">({formatDuration(report.run.duration_ms)})</span>
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {formatDate(report.created_at)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <a
                    href={`/report/${report.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors rounded"
                    title="Open report"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => copyLink(report.token)}
                    className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors rounded"
                    title="Copy link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {report.is_active ? (
                    <button
                      onClick={() => toggleActive(report.token, false)}
                      disabled={loading[report.token]}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-40 px-2 py-1 rounded border border-red-800/40 hover:border-red-700 transition-colors"
                      title="Deactivate report"
                    >
                      <XCircle className="w-3 h-3" />
                      Done
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleActive(report.token, true)}
                      disabled={loading[report.token]}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 px-2 py-1 rounded border border-blue-800/40 hover:border-blue-700 transition-colors"
                      title="Reactivate report"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Re-publish
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
