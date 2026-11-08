import { useCallback, useEffect, useRef, useState } from 'react'

/** Minimal data loader for client-side server-function calls. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], enabled = true) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setData(await fnRef.current())
      setError(null)
    } catch (e) {
      console.error(e)
      setError('تعذر تحميل البيانات، حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  return { data, error, loading, reload, setData }
}
