import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oriqgofzpgzxahkowdou.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yaXFnb2Z6cGd6eGFoa293ZG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNjc0ODMsImV4cCI6MjA4MTc0MzQ4M30.pTE3qtZVrDsoeqbSijDrklQHlxeocwH_LwNN47BPyZI';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
