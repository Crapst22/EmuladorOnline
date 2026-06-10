'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PresencePing() {
  const authedRef = useRef(false)

  useEffect(() => {
    let mounted = true
    let interval: ReturnType<typeof setInterval> | null = null

    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return
      authedRef.current = true

      async function ping() {
        try {
          await fetch('/api/ping', { method: 'POST' })
        } catch { /* ignore */ }
      }

      ping()
      interval = setInterval(() => { if (mounted) ping() }, 8_000)
    }

    init()

    const beacon = () => navigator.sendBeacon('/api/ping')
    window.addEventListener('beforeunload', beacon)

    return () => {
      mounted = false
      if (interval) clearInterval(interval)
      window.removeEventListener('beforeunload', beacon)
      if (authedRef.current) beacon()
    }
  }, [])

  return null
}
