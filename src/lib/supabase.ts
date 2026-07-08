import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mdpnaeyskpyyrygjweej.supabase.co';
// Public anon key — safe to ship in client bundle
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kcG5hZXlza3B5eXJ5Z2p3ZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Mjk0MDksImV4cCI6MjA5OTEwNTQwOX0.WSHPABiDY9AwdINCV5MLJ0KzEXXZsr36w_03-Imyoxc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
