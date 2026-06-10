'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ParsedGuest {
  full_name: string
  email: string
  phone: string
  escort_count: string
  valid: boolean
  error?: string
}

function parseCSV(text: string): ParsedGuest[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const nameIdx = headers.findIndex(h => h.includes('name'))
  const emailIdx = headers.findIndex(h => h.includes('email'))
  const phoneIdx = headers.findIndex(h => h.includes('phone'))
  const escortIdx = headers.findIndex(h => h.includes('escort'))

  if (nameIdx === -1 || emailIdx === -1) return []

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const full_name = cols[nameIdx] ?? ''
    const email = cols[emailIdx] ?? ''
    const phone = phoneIdx >= 0 ? (cols[phoneIdx] ?? '') : ''
    const escort_count = escortIdx >= 0 ? (cols[escortIdx] ?? '0') : '0'

    if (!full_name) return { full_name, email, phone, escort_count, valid: false, error: 'Missing name' }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { full_name, email, phone, escort_count, valid: false, error: 'Invalid email' }
    }
    return { full_name, email, phone, escort_count, valid: true }
  })
}

export default function BulkImportModal({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [guests, setGuests] = useState<ParsedGuest[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setGuests(parseCSV(text))
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    const valid = guests.filter(g => g.valid)
    if (valid.length === 0) return
    setImporting(true)

    const res = await fetch('/api/guests/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, guests: valid }),
    })
    const data = await res.json()
    setResult(data)
    setImporting(false)
    if (data.imported > 0) router.refresh()
  }

  const validCount = guests.filter(g => g.valid).length
  const invalidCount = guests.filter(g => !g.valid).length

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-white font-medium">Bulk Import Guests</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* CSV format hint */}
          <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] p-4">
            <p className="text-[#9CA3AF] text-xs mb-2 font-medium">CSV format — first row must be headers:</p>
            <code className="text-[#800000] text-xs">full_name,email,phone,escort_count</code>
            <p className="text-[#4B5563] text-xs mt-2">Phone and escort_count are optional. Download a sample:</p>
            <a
              href={`data:text/csv;charset=utf-8,full_name,email,phone,escort_count\nJohn Doe,john@example.com,+254700000000,2\nJane Smith,jane@example.com,,0`}
              download="guest_import_template.csv"
              className="text-[#800000] text-xs hover:underline mt-1 inline-block"
            >
              Download template
            </a>
          </div>

          {/* File picker */}
          <div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-[#2A2A2A] hover:border-[#800000] rounded-[6px] py-8 text-center transition-colors"
            >
              <div className="text-[#9CA3AF] text-sm">
                {fileName ? (
                  <span className="text-white">{fileName}</span>
                ) : (
                  'Click to select CSV file'
                )}
              </div>
            </button>
          </div>

          {/* Preview */}
          {guests.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[#16A34A] text-sm">{validCount} valid</span>
                {invalidCount > 0 && <span className="text-[#DC2626] text-sm">{invalidCount} will be skipped</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#2A2A2A]">
                      {['Name', 'Email', 'Phone', 'Escorts', 'Status'].map(h => (
                        <th key={h} className="text-left text-[#9CA3AF] px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {guests.slice(0, 8).map((g, i) => (
                      <tr key={i} className={g.valid ? '' : 'opacity-50'}>
                        <td className="px-3 py-2 text-white">{g.full_name || '—'}</td>
                        <td className="px-3 py-2 text-[#9CA3AF]">{g.email || '—'}</td>
                        <td className="px-3 py-2 text-[#9CA3AF]">{g.phone || '—'}</td>
                        <td className="px-3 py-2 text-[#9CA3AF] text-center">{g.escort_count || '0'}</td>
                        <td className="px-3 py-2">
                          {g.valid
                            ? <span className="text-[#16A34A]">✓</span>
                            : <span className="text-[#DC2626]" title={g.error}>✗ {g.error}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {guests.length > 8 && (
                  <p className="text-[#4B5563] text-xs px-3 py-2">…and {guests.length - 8} more rows</p>
                )}
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`rounded-[6px] px-4 py-3 text-sm ${result.imported > 0 ? 'bg-[#16A34A]/10 border border-[#16A34A]/30 text-[#16A34A]' : 'bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626]'}`}>
              {result.imported > 0 && <p>{result.imported} guests imported successfully.</p>}
              {result.errors.map((err, i) => <p key={i} className="text-[#DC2626] text-xs mt-1">{err}</p>)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2A2A2A]">
          <button onClick={onClose} className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-sm px-4 py-2 rounded-[6px] transition-colors">
            {result?.imported ? 'Done' : 'Cancel'}
          </button>
          {!result && validCount > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-[#800000] hover:bg-[#6B0000] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-[6px] transition-colors"
            >
              {importing ? 'Importing…' : `Import ${validCount} Guest${validCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
