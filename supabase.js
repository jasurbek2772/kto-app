import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dbchoqluyhhxbdwcgypc.supabase.co';
const supabaseAnonKey = 'sb_publishable_CiMF8i-5hFPyMp0Ec7DFdQ_IBtJZ5TD';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
