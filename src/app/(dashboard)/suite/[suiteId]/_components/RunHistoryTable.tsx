'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RunStatusBadge } from '@/components/ui/RunStatusBadge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { ApiTestResultCard } from '@/components/test-results/ApiTestResultCard'
import { UiTestResultCard } from '@/components/test-results/UiTestResultCard'
import { formatDistanceToNow } from 'date-fns'
import { ExternalLink, ChevronDown, ChevronRight, Trash2, RotateCcw, Share2, FileText } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { NotesDialog } from './NotesDialog'
import type { TestRun, TestResultWithCases, RunStatus } from '@/lib/types'

interface RunHistoryTableProps {
  runs: TestRun[]
  suiteType: 'api' | 'ui'
  suiteId: string
  suiteName: string
  totalCount?: number
}

const STATUS_FILTERS: { label: string; value: RunStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Passed', value: 'passed' },
  { label: 'Need Fix', value: 'need_fix' },
  { label: 'Failed', value: 'failed' },
  { label: 'Error', value: 'error' },
  { label: 'Running', value: 'running' },
]

// ── Confirm Delete Dialog ────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  loading: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-xl">
          <Dialog.Title className="text-sm font-semibold text-gray-100 mb-1">{title}</Dialog.Title>
          <Dialog.Description className="text-xs text-gray-400 mb-5">{description}</Dialog.Description>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors">
                Batal
              </button>
            </Dialog.Close>
            <Button onClick={onConfirm} loading={loading} size="sm" variant="danger">
              <Trash2 className="w-3 h-3" />
              Hapus
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Single Run Row ───────────────────────────────────────────────────────────

function RunRow({
  run,
  suiteType,
  suiteId,
  suiteName,
  selected,
  onSelect,
  onDeleted,
}: {
  run: TestRun
  suiteType: 'api' | 'ui'
  suiteId: string
  suiteName: string
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onDeleted: (id: string) => void
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResultWithCases[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [rerunning, setRerunning] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishedToken, setPublishedToken] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [hasNotes, setHasNotes] = useState(false)

  async function handleExpand() {
    if (expanded) { setExpanded(false); return }
    setExpanded(true)
    if (results !== null) return

    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/runs/${run.id}/results`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFetchError(data.error ?? `Failed to load results (${res.status})`)
        return
      }
      setResults(await res.json())
    } catch {
      setFetchError('Network error — could not load results')
    } finally {
      setLoading(false)
    }
  }

  async function handleRerun() {
    setRerunning(true)
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suiteId,
          suiteName,
          specId: run.spec_id ?? undefined,
          // spec_id maps to a spec; we don't have specFile name here so send undefined for suite-level
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        let msg = `Error ${res.status}`
        try { msg = JSON.parse(text).error ?? msg } catch { /* ignore */ }
        throw new Error(msg)
      }
      const data = await res.json()
      toast.success('Re-run triggered', { description: `Run ID: ${data.runId.slice(0, 8)}…` })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to trigger re-run')
    } finally {
      setRerunning(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/runs/${run.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Delete failed (${res.status})`)
      }
      toast.success('Run dihapus')
      onDeleted(run.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus run')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  async function handlePublish() {
    if (publishedToken) {
      // Already published — copy link
      const url = `${window.location.origin}/report/${publishedToken}`
      navigator.clipboard.writeText(url).then(() => {
        toast.success('Link disalin!')
      })
      return
    }
    setPublishing(true)
    try {
      const res = await fetch('/api/report/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: run.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Publish failed (${res.status})`)
      }
      const data = await res.json()
      setPublishedToken(data.token)
      const url = `${window.location.origin}${data.url}`
      navigator.clipboard.writeText(url).then(() => {
        toast.success('Report dipublikasikan! Link disalin.', {
          description: url,
        })
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal publish report')
    } finally {
      setPublishing(false)
    }
  }

  function handleOpenNotes() {
    setNoteOpen(true)
  }

  const canPublish = run.status === 'passed' || run.status === 'need_fix' || run.status === 'failed'
  const canExpand = run.status === 'passed' || run.status === 'failed' || run.status === 'error' || run.status === 'need_fix'

  return (
    <>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus run ini?"
        description={`Run ${run.id.slice(0, 8)}… akan dihapus permanen beserta semua hasil testnya.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
      <NotesDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        runId={run.id}
        initialHasNotes={hasNotes}
        onNotesChanged={(v) => setHasNotes(v)}
      />

      <div className="border-b border-gray-800 last:border-0">
        <div
          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/30 transition-colors"
        >
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(run.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="w-3.5 h-3.5 accent-blue-500 cursor-pointer shrink-0"
          />

          {/* Expand chevron */}
          <button
            onClick={canExpand ? handleExpand : undefined}
            className="shrink-0"
            disabled={!canExpand}
            style={{ cursor: canExpand ? 'pointer' : 'default' }}
          >
            {canExpand ? (
              expanded
                ? <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                : <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            ) : (
              <span className="w-3.5 block" />
            )}
          </button>

          {/* Status + info — clickable to expand */}
          <div
            className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer"
            onClick={canExpand ? handleExpand : undefined}
          >
            <RunStatusBadge status={run.status} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-400">{run.id.slice(0, 8)}</span>
                {run.spec_id && <span className="text-xs text-gray-600">· spec only</span>}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                <span className="text-green-500">{run.passed_tests} passed</span>
                {' · '}
                <span className="text-red-500">{run.failed_tests} failed</span>
                {' · '}
                {run.skipped_tests} skipped
                {run.duration_ms ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ''}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {run.github_run_url && (
              <a
                href={run.github_run_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 p-1"
                title="Lihat di GitHub Actions"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <span className="text-xs text-gray-600">
              {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
            </span>
            <button
              onClick={handleRerun}
              disabled={rerunning}
              title="Re-run"
              className="p-1 text-gray-600 hover:text-blue-400 disabled:opacity-40 transition-colors"
            >
              {rerunning ? <Spinner size="sm" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </button>
            {canPublish && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                title={publishedToken ? 'Salin link report' : 'Publish report'}
                className={`p-1 transition-colors disabled:opacity-40 ${
                  publishedToken
                    ? 'text-green-400 hover:text-green-300'
                    : 'text-gray-600 hover:text-blue-400'
                }`}
              >
                {publishing ? <Spinner size="sm" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={handleOpenNotes}
              title={hasNotes ? 'Lihat/edit notes' : 'Tambah notes'}
              className={`p-1 transition-colors ${hasNotes ? 'text-amber-400 hover:text-amber-300' : 'text-gray-600 hover:text-amber-400'}`}
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              title="Hapus run ini"
              className="p-1 text-gray-600 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded results */}
        {expanded && (
          <div className="px-4 pb-4 bg-gray-950/50">
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-gray-500">
                <Spinner size="sm" />
                Loading results…
              </div>
            ) : fetchError ? (
              <p className="py-4 text-xs text-red-500">{fetchError}</p>
            ) : results && results.length > 0 ? (
              <div className="space-y-2 pt-2">
                {results.map((result) =>
                  suiteType === 'api'
                    ? <ApiTestResultCard key={result.id} result={result} />
                    : <UiTestResultCard key={result.id} result={result} />
                )}
              </div>
            ) : (
              <p className="py-4 text-xs text-gray-600">No detailed results stored for this run.</p>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Main Table ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export function RunHistoryTable({ runs: initialRuns, suiteType, suiteId, suiteName, totalCount }: RunHistoryTableProps) {
  const router = useRouter()
  const [runs, setRuns] = useState<TestRun[]>(initialRuns)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<RunStatus | 'all'>('all')

  useEffect(() => {
    setRuns((prev) => {
      const prevIds = new Set(prev.map((r) => r.id))
      const newRuns = initialRuns.filter((r) => !prevIds.has(r.id))
      if (newRuns.length === 0) {
        // update existing runs (e.g. status change)
        return prev.map((r) => initialRuns.find((ir) => ir.id === r.id) ?? r)
      }
      return [...newRuns, ...prev]
    })
  }, [initialRuns])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const filteredRuns = filterStatus === 'all'
    ? runs
    : runs.filter((r) => r.status === filterStatus)

  const allFilteredSelected = filteredRuns.length > 0 && filteredRuns.every((r) => selectedIds.has(r.id))

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(filteredRuns.map((r) => r.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  function handleDeleted(id: string) {
    setRuns((prev) => prev.filter((r) => r.id !== id))
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  async function handleBulkDelete(ids: string[]) {
    setBulkDeleting(true)
    try {
      const res = await fetch('/api/runs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runIds: ids }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Delete failed (${res.status})`)
      }
      const data = await res.json()
      toast.success(`${data.deleted} run dihapus`)
      setRuns((prev) => prev.filter((r) => !ids.includes(r.id)))
      setSelectedIds(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus runs')
    } finally {
      setBulkDeleting(false)
      setBulkDeleteOpen(false)
      setDeleteAllOpen(false)
    }
  }

  async function handleLoadMore() {
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/runs?suiteId=${suiteId}&offset=${runs.length}&limit=${PAGE_SIZE}`)
      if (!res.ok) throw new Error('Failed to load more runs')
      const data: TestRun[] = await res.json()
      setRuns((prev) => [...prev, ...data])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }

  const hasMore = totalCount != null && runs.length < totalCount
  const selectedCount = selectedIds.size
  const allRunIds = runs.map((r) => r.id)

  return (
    <>
      {/* Bulk delete — selected */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Hapus ${selectedCount} run?`}
        description="Semua run yang dipilih beserta hasil testnya akan dihapus permanen."
        onConfirm={() => handleBulkDelete([...selectedIds])}
        loading={bulkDeleting}
      />
      {/* Bulk delete — all */}
      <ConfirmDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        title="Hapus semua history?"
        description={`Seluruh ${runs.length} run beserta hasil testnya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={() => handleBulkDelete(allRunIds)}
        loading={bulkDeleting}
      />

      <Card padding={false}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 flex-wrap">
          {/* Select all checkbox */}
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="w-3.5 h-3.5 accent-blue-500 cursor-pointer shrink-0"
            title="Pilih semua"
          />

          <h2 className="text-sm font-semibold text-gray-200">Run History</h2>
          <span className="text-xs text-gray-600">{runs.length} runs</span>

          {/* Status filter */}
          <div className="flex items-center gap-1 ml-auto">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  filterStatus === f.value
                    ? 'bg-gray-700 text-gray-200'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          {selectedCount > 0 && (
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-red-400 border border-red-800/50 rounded hover:bg-red-950/30 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Hapus {selectedCount} terpilih
            </button>
          )}
          <button
            onClick={() => setDeleteAllOpen(true)}
            disabled={runs.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-500 border border-gray-800 rounded hover:text-red-400 hover:border-red-800/50 disabled:opacity-30 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Hapus semua
          </button>
        </div>

        {/* Rows */}
        <div>
          {filteredRuns.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-600 text-center">
              {runs.length === 0 ? 'Belum ada run.' : 'Tidak ada run dengan status ini.'}
            </p>
          ) : (
            filteredRuns.map((run) => (
              <RunRow
                key={run.id}
                run={run}
                suiteType={suiteType}
                suiteId={suiteId}
                suiteName={suiteName}
                selected={selectedIds.has(run.id)}
                onSelect={handleSelect}
                onDeleted={handleDeleted}
              />
            ))
          )}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="px-4 py-3 border-t border-gray-800">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
            >
              {loadingMore && <Spinner size="sm" />}
              {loadingMore ? 'Memuat...' : `Muat lebih banyak (${totalCount! - runs.length} tersisa)`}
            </button>
          </div>
        )}
      </Card>
    </>
  )
}
