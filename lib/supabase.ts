import { createClient } from '@supabase/supabase-js'

const url = 'https://phgwkxhfedcyqapfhjjt.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3dreGhmZWRjeXFhcGZoamp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMTM4NDEsImV4cCI6MjA5OTY4OTg0MX0.K_pVYZt5Po3epRgKs2rSs02obQ_yp_krjoFC1mW4NQU'

export const supabase = createClient(url, key, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
