import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gsbwfojhvjspujtzdsvf.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzYndmb2podmpzcHVqdHpkc3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTM2NDIsImV4cCI6MjA5MTU2OTY0Mn0.soXoj4O_Wx9ADP7uaWf9lP3hkky8MtKvAM7Y7grjVxs";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'ours-space-auth',
    flowType: 'pkce'
  }
});
