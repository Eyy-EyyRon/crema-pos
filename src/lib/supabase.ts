import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Same Supabase project as cafe-web-dashboard and CafePOS — all three apps
// are separate codebases pointed at one shared backend.
const supabaseUrl = 'https://vgiubpgzqygdjrzvvgdf.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXVicGd6cXlnZGpyenZ2Z2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTU1MDAsImV4cCI6MjA4ODQ3MTUwMH0.VrV4u9Z1ZNolxQDIlXyj11f5hsWLX6fC6OiTSrvPx8Q';

// Expo Router-less here, but Expo web still pre-renders/bundles this module
// in a Node context at times where `window`/`localStorage` don't exist;
// AsyncStorage's web shim assumes they do. Route to a no-op off-device so
// client init never throws, matching CafePOS's `.vscode/lib/supabase.ts`.
const isServer = typeof window === 'undefined';

const authStorage = {
  getItem: (key: string) => (isServer ? Promise.resolve(null) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) => (isServer ? Promise.resolve() : AsyncStorage.setItem(key, value)),
  removeItem: (key: string) => (isServer ? Promise.resolve() : AsyncStorage.removeItem(key)),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: !isServer,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
