import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

/**
 * Subscribes to real-time changes on the given tables.
 * Calls `onRefresh` whenever any row is inserted, updated, or deleted
 * on any of the subscribed tables — on any device, instantly.
 */
export function useRealtime(tables: string[], onRefresh: () => void) {
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh

  useEffect(() => {
    const channelName = `jb-realtime-${tables.sort().join('-')}`
    const channel = supabase.channel(channelName)

    tables.forEach((table) => {
      channel.on(
        'postgres_changes' as Parameters<typeof channel.on>[0],
        { event: '*', schema: 'public', table },
        () => refreshRef.current()
      )
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
