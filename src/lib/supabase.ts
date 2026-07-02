import { createClient } from '@supabase/supabase-js';

// Use placeholders to prevent the application from crashing on startup if variables are not yet configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Checks if Supabase has been properly configured by the user
 */
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  return !!(
    url &&
    key &&
    url !== 'https://your-supabase-project.supabase.co' &&
    key !== 'your-anon-key' &&
    url.startsWith('https://')
  );
};
