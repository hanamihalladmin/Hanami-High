import { useEffect, useRef, useState } from 'react'
import { normalizeRoute } from '../app/navigation'
import { supabase } from '../lib/supabase'
import type { HanamiSearchResult } from '../types/database'
import type { ShellRoute } from '../types/navigation'

type Props = {
  open: boolean
  onClose: () => void
  onNavigate: (route: ShellRoute) => void
}

export function GlobalSearch({ open, onClose, onNavigate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HanamiSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      const client = supabase
      if (!client) return
      setLoading(true)
      setError(null)
      const { data, error: searchError } = await client.rpc('search_hanami', {
        p_query: trimmed,
        p_limit: 12,
      })
      if (cancelled) return
      setLoading(false)
      if (searchError) {
        setError(searchError.message)
        return
      }
      setResults(data ?? [])
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query])

  if (!open) return null

  function choose(result: HanamiSearchResult) {
    if (result.document_type === 'character' && result.entity_id) {
      onNavigate({ section: 'profile', subsection: 'view-profile', targetId: result.entity_id })
    } else {
      onNavigate(normalizeRoute(result.section, result.subsection ?? undefined))
    }
    setQuery('')
    setResults([])
    onClose()
  }

  return (
    <div className="shell-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="global-search-dialog" role="dialog" aria-modal="true" aria-label="Search Hanami High">
        <header>
          <span aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Hanami High…"
            aria-label="Search Hanami High"
          />
          <kbd>ESC</kbd>
        </header>
        <div className="global-search-results">
          {!query.trim() && (
            <div className="search-empty-state">
              <strong>Search the Hanami network</strong>
              <span>Find pages and active campus identities. Clubs, classes, posts, and events will join this same index as their modules are built.</span>
            </div>
          )}
          {loading && <div className="search-status">Searching…</div>}
          {error && <div className="identity-notice error">{error}</div>}
          {!loading && query.trim() && !error && results.length === 0 && (
            <div className="search-empty-state"><strong>No matches found</strong><span>Try another name or section.</span></div>
          )}
          {results.map((result) => (
            <button className="search-result-row" type="button" key={result.id} onClick={() => choose(result)}>
              <span className="search-result-type">{result.document_type === 'character' ? '☺' : '↗'}</span>
              <span><strong>{result.title}</strong><small>{result.subtitle || result.section}</small></span>
              <em>{result.document_type}</em>
            </button>
          ))}
        </div>
        <footer><span>↵ Open</span><span>⌘K Search anywhere</span></footer>
      </section>
    </div>
  )
}
