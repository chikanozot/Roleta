import { createClient } from '@supabase/supabase-js';

// Real credentials provided by the user used as default fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zeqyvgtzrbmfsopyimzi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcXl2Z3R6cmJtZnNvcHlpbXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTM4NTksImV4cCI6MjA5ODU4OTg1OX0.qmh0WEaG3XwfQPX0Z7Z52BA2VV5uwr114nTbiTqUqc0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Checks if Supabase has been properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return supabaseUrl !== 'https://placeholder-project.supabase.co' && !supabaseUrl.includes('your-supabase-project');
};
