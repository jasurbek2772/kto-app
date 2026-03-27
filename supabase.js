import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btedlwsuwkhlugllylvm.supabase.co';
const supabaseAnonKey = 'sb_publishable_DLP-I2nq1dgR0gPqueLUoQ_lkFtFDlu';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);