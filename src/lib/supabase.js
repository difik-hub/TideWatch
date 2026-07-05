import { createClient } from '@supabase/supabase-js'

// Публичные ключи проекта (anon-ключ безопасен для клиента: доступ к данным
// ограничен RLS-политиками — юзер видит только свою строку).
const SUPABASE_URL = 'https://kxebsydsyotfkwcfsxez.supabase.co'
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4ZWJzeWRzeW90Zmt3Y2ZzeGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzc0OTAsImV4cCI6MjA5ODc1MzQ5MH0.Zs2x6J5OeLhqkWR2jSkYjWpPS_wxJ67kEggyLbjKRsk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
