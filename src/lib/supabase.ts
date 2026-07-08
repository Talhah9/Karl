import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://mdpnaeyskpyyrygjweej.supabase.co';
// Public anon key — safe to ship in client bundle
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kcG5hZXlza3B5eXJ5Z2p3ZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Mjk0MDksImV4cCI6MjA5OTEwNTQwOX0.WSHPABiDY9AwdINCV5MLJ0KzEXXZsr36w_03-Imyoxc';

// Safe localStorage wrapper: returns null/no-op during SSR when window is unavailable
const webStorage = {
  getItem: (key: string): Promise<string | null> => {
    if (typeof window === 'undefined') return Promise.resolve(null);
    return Promise.resolve(window.localStorage.getItem(key));
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve();
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve();
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

// Lazy singleton: defer createClient() until first use so SSR/static rendering
// (Node.js, no native WebSocket) never triggers Realtime client initialization.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

// Proxy forwards every property access to the lazily-created client.
// Callers use `supabase.auth`, `supabase.from(...)`, etc. unchanged.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as any)[prop as keyof SupabaseClient];
  },
});
