import { createClient } from '@supabase/supabase-js'

const url = 'https://czbtebcvyyrabynvrewt.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YnRlYmN2eXlyYWJ5bnZyZXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODI1NjUsImV4cCI6MjEwMTg1ODU2NX0.wBtjDdhlDGKfwZYFkkZ3BgzQvg-8kdJcKEll6w_sPQs'

export const supabase = createClient(url, key, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
