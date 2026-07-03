'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { FileText, Plus, Search, X, Trash2, ChevronLeft } from 'lucide-react'
import { clsx } from 'clsx'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import type { RunNote, TestCase } from '@/lib/types'

const methodColors: Record<string, string> = {
  GET: 'bg-blue-900/60 text-blue-300 border-blue-700',
  POST: 'bg-green-900/60 text-green-300 border-green-700',
  PUT: 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  PATCH: 'bg-orange-900/60 text-orange-300 border-orange-700',
  DELETE: 'bg-red-900/60 text-red-300 border-red-700',
}

const statusDot: Record<string, string> = {
  passed: 'bg-green-400',
  failed: 'bg-red-400',
  skipped: 'bg-gray-500',
  pending: 'bg-yellow-400',
}

interface NotesDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  runId: string
  initialHasNotes: boolean
  onNotesChanged: (hasNotes: boolean) => void
}

export function NotesDialog({ open, onOpenChange, runId, onNotesChanged }: NotesDialogProps) {
  const [notes, setNotes] = useState<RunNote[]>([])
  const [notesFetched, setNotesFetched] = useState(false)
  const [allCases, setAllCases] = useState<TestCase[]>([])
  const [casesFetched, setCasesFetched] = useState(false)
  const [tab, setTab] = useState<'list' | 'compose'>('list')

  // Compose state
  const [content, setContent] = useState('')
  const [caseSearch, setCaseSearch] = useState('')
  const [attachedIds, setAttachedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch notes + cases lazily when dialog opens
  const [prevOpen, setPrevOpen] = useState(false)
  if (open && !prevOpen) {
    setPrevOpen(true)
    if (!notesFetched) {
      fetch(`/api/notes/${runId}`)
        .then((r) => r.json())
        .then((data) => { setNotes(Array.isArray(data) ? data : []); setNotesFetched(true) })
        .catch(() => setNotesFetched(true))
    }
    if (!casesFetched) {
      fetch(`/api/runs/${runId}/test-cases`)
        .then((r) => r.json())
        .then((data) => { setAllCases(Array.isArray(data) ? data : []); setCasesFetched(true) })
        .catch(() => setCasesFetched(true))
    }
  } else if (!open && prevOpen) {
    setPrevOpen(false)
  }

  function handleClose() {
    onOpenChange(false)
    // Reset compose state
    setTab('list')
    setContent('')
    setCaseSearch('')
    setAttachedIds(new Set())
  }

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/notes/${runId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), test_case_ids: [...attachedIds] }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Gagal menyimpan (${res.status})`)
      }
      const newNote: RunNote = await res.json()
      setNotes((prev) => [...prev, newNote])
      onNotesChanged(true)
      setContent('')
      setAttachedIds(new Set())
      setCaseSearch('')
      setTab('list')
      toast.success('Note disimpan')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan note')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(noteId: string) {
    setDeletingId(noteId)
    try {
      const res = await fetch(`/api/notes/${runId}?noteId=${noteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Gagal menghapus (${res.status})`)
      }
      const next = notes.filter((n) => n.id !== noteId)
      setNotes(next)
      onNotesChanged(next.length > 0)
      toast.success('Note dihapus')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus note')
    } finally {
      setDeletingId(null)
    }
  }

  function toggleCase(id: string) {
    setAttachedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredCases = allCases.filter((c) =>
    c.title.toLowerCase().includes(caseSearch.toLowerCase()) ||
    (c.http_url ?? '').toLowerCase().includes(caseSearch.toLowerCase())
  )

  const attachedCases = allCases.filter((c) => attachedIds.has(c.id))

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-xl flex flex-col max-h-[85vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              {tab === 'compose' && (
                <button
                  onClick={() => { setTab('list'); setContent(''); setAttachedIds(new Set()); setCaseSearch('') }}
                  className="text-gray-500 hover:text-gray-300 transition-colors mr-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <FileText className="w-4 h-4 text-amber-400" />
              <Dialog.Title className="text-sm font-semibold text-gray-100">
                {tab === 'list' ? 'Notes QA' : 'Tulis Note Baru'}
              </Dialog.Title>
              <span className="font-mono text-xs text-gray-600">{runId.slice(0, 8)}…</span>
            </div>
            <Dialog.Close asChild>
              <button className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden">
            {tab === 'list' ? (
              /* ── List View ── */
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {!notesFetched ? (
                    <div className="flex items-center gap-2 py-8 justify-center text-xs text-gray-500">
                      <Spinner size="sm" /> Memuat notes…
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="w-8 h-8 text-gray-700 mb-3" />
                      <p className="text-sm text-gray-500">Belum ada notes untuk run ini.</p>
                      <p className="text-xs text-gray-600 mt-1">Klik tombol di bawah untuk menulis catatan.</p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{note.content}</p>

                        {/* Referenced test cases */}
                        {note.referenced_cases && note.referenced_cases.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-700/50">
                            <p className="text-xs text-gray-600 mb-2">Referensi test case:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {note.referenced_cases.map((ref) => (
                                <span
                                  key={ref.test_case_id}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-900/20 border border-amber-800/40 text-xs text-amber-300"
                                >
                                  {ref.test_cases.http_method && (
                                    <span className="font-mono font-bold text-amber-400/80 text-[10px]">
                                      {ref.test_cases.http_method}
                                    </span>
                                  )}
                                  <span className="truncate max-w-[200px]">{ref.test_cases.title}</span>
                                  <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', statusDot[ref.test_cases.status] ?? 'bg-gray-500')} />
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-700/50">
                          <span className="text-xs text-gray-600">
                            {new Date(note.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => handleDelete(note.id)}
                            disabled={deletingId === note.id}
                            className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400 disabled:opacity-40 transition-colors"
                          >
                            {deletingId === note.id ? <Spinner size="sm" /> : <Trash2 className="w-3 h-3" />}
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer list */}
                <div className="px-6 py-4 border-t border-gray-800 shrink-0">
                  <button
                    onClick={() => setTab('compose')}
                    className="flex items-center gap-2 w-full justify-center py-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-800/50 hover:border-blue-700 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tulis Note Baru
                  </button>
                </div>
              </div>
            ) : (
              /* ── Compose View ── */
              <div className="flex h-full divide-x divide-gray-800">

                {/* Left: textarea + attached chips */}
                <div className="flex-1 flex flex-col p-4 min-w-0">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={2000}
                    rows={7}
                    placeholder="Tulis catatan QA untuk run ini..."
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none transition-colors"
                  />
                  <div className="flex items-center justify-between mt-1.5 mb-3">
                    <span className="text-xs text-gray-700">{content.length}/2000</span>
                  </div>

                  {/* Attached chips */}
                  {attachedCases.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-600">Test case terpilih:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {attachedCases.map((tc) => (
                          <button
                            key={tc.id}
                            onClick={() => toggleCase(tc.id)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-900/20 border border-amber-700/50 text-xs text-amber-300 hover:bg-red-900/20 hover:border-red-700/50 hover:text-red-300 transition-colors"
                          >
                            {tc.http_method && (
                              <span className="font-mono font-bold text-[10px]">{tc.http_method}</span>
                            )}
                            <span className="truncate max-w-[160px]">{tc.title}</span>
                            <X className="w-3 h-3 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {attachedCases.length === 0 && (
                    <p className="text-xs text-gray-600 italic">Pilih test case dari panel kanan untuk mereferensikannya di note ini.</p>
                  )}
                </div>

                {/* Right: test case picker */}
                <div className="w-72 shrink-0 flex flex-col">
                  <div className="px-3 pt-3 pb-2 border-b border-gray-800">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Pilih Test Case</p>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                      <input
                        type="text"
                        value={caseSearch}
                        onChange={(e) => setCaseSearch(e.target.value)}
                        placeholder="Cari test case..."
                        className="w-full pl-8 pr-3 py-1.5 bg-gray-950 border border-gray-700 rounded-lg text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto py-1">
                    {!casesFetched ? (
                      <div className="flex items-center gap-2 justify-center py-6 text-xs text-gray-500">
                        <Spinner size="sm" /> Memuat…
                      </div>
                    ) : filteredCases.length === 0 ? (
                      <p className="text-xs text-gray-600 text-center py-6">Tidak ada test case.</p>
                    ) : (
                      filteredCases.map((tc) => {
                        const checked = attachedIds.has(tc.id)
                        return (
                          <label
                            key={tc.id}
                            className={clsx(
                              'flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors',
                              checked ? 'bg-amber-900/10' : 'hover:bg-gray-800/50'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCase(tc.id)}
                              className="mt-0.5 w-3.5 h-3.5 accent-amber-500 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {tc.http_method && (
                                  <span className={clsx(
                                    'text-[10px] font-bold font-mono px-1 py-0.5 rounded border',
                                    methodColors[tc.http_method] ?? 'bg-gray-800 text-gray-400 border-gray-700'
                                  )}>
                                    {tc.http_method}
                                  </span>
                                )}
                                <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', statusDot[tc.status] ?? 'bg-gray-500')} />
                              </div>
                              <p className="text-xs text-gray-300 leading-snug line-clamp-2">{tc.title}</p>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer compose */}
          {tab === 'compose' && (
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-800 shrink-0">
              <button
                onClick={() => { setTab('list'); setContent(''); setAttachedIds(new Set()); setCaseSearch('') }}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                Batal
              </button>
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={!content.trim()}
                size="sm"
              >
                Simpan Note
              </Button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
