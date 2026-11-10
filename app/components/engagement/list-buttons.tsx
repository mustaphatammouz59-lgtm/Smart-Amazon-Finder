import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import {
  COMPARE_KEY,
  FAVORITES_KEY,
  MAX_COMPARE,
  MAX_FAVORITES,
  loadList,
  saveList,
  subscribeLists,
  toggleInList,
} from '../../lib/client-lists'
import { Button } from '../ui/ui'
import { CheckIcon, ScaleIcon } from '../ui/icons'

/**
 * Client-only engagement controls for the anonymous localStorage lists
 * (see app/lib/client-lists.ts for the persistence design + limitations).
 *
 * SSR / hydration contract: the first render — server and client alike —
 * is always the not-a-member state. Membership is read from localStorage
 * only after mount (useEffect), so there is never a hydration mismatch.
 * Every mounted button subscribes to list changes, so multiple buttons
 * for the same product (card, detail page, tray) stay in sync, including
 * changes made in another tab.
 */

function useClientList(key: string, cap: number) {
  const [list, setList] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const sync = () => setList(loadList(key, cap))
    sync()
    setMounted(true)
    return subscribeLists(sync)
  }, [key, cap])

  const toggle = useCallback(
    (slug: string) => {
      const current = loadList(key, cap)
      const result = toggleInList(current, slug, cap)
      if (result.capped) {
        // Keep local state truthful even though storage did not change.
        setList(current)
        return result
      }
      saveList(key, result.list)
      setList(result.list)
      return result
    },
    [key, cap],
  )

  const replace = useCallback(
    (next: string[]) => {
      saveList(key, next)
      setList(next)
    },
    [key],
  )

  return { list, mounted, toggle, replace }
}

export function FavoriteButton({ slug }: { slug: string }) {
  const { list, toggle } = useClientList(FAVORITES_KEY, MAX_FAVORITES)
  const isFavorite = list.includes(slug)

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      aria-pressed={isFavorite}
      onClick={() => toggle(slug)}
    >
      {isFavorite && <CheckIcon className="h-4 w-4" />}
      {isFavorite ? 'Saved' : 'Save'}
    </Button>
  )
}

export function CompareButton({ slug }: { slug: string }) {
  const { list, toggle } = useClientList(COMPARE_KEY, MAX_COMPARE)
  const inCompare = list.includes(slug)
  const isFull = !inCompare && list.length >= MAX_COMPARE

  if (isFull) {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-pressed={false}
          aria-label="Comparison is full (4 products)"
          title="Comparison is full (4 products)"
          disabled
        >
          <ScaleIcon className="h-4 w-4" />
          Compare
        </Button>
        <span className="text-xs leading-5 text-smoke">Comparison is full (4 products)</span>
      </span>
    )
  }

  return (
    <Button type="button" variant="secondary" size="sm" aria-pressed={inCompare} onClick={() => toggle(slug)}>
      {inCompare ? <CheckIcon className="h-4 w-4" /> : <ScaleIcon className="h-4 w-4" />}
      {inCompare ? 'In compare' : 'Compare'}
    </Button>
  )
}

/**
 * Site-wide fixed tray summarising the comparison list. Rendered from
 * app/root.tsx inside the public layout; it additionally gates itself by
 * pathname so it never appears in the admin area or on /compare itself
 * (where it would be redundant), and renders nothing until mounted with
 * at least one product (SSR-safe).
 */
export function CompareTray() {
  const { pathname } = useLocation()
  const { list, mounted, replace } = useClientList(COMPARE_KEY, MAX_COMPARE)

  if (!mounted || list.length === 0) return null
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return null
  if (pathname === '/compare') return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-navy-100 bg-white/95 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="page-shell flex min-h-14 flex-wrap items-center gap-3 py-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-navy-950">
          <ScaleIcon className="h-5 w-5 text-teal-800" />
          Compare {list.length} {list.length === 1 ? 'product' : 'products'}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/compare"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
          >
            View comparison
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={() => replace([])}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}
