import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tsdkhlgcfnbcshypnlqq.supabase.co';
const supabaseAnonKey = 'sb_publishable_vpJlqrEkul72zQKAJ71APw_LVlYZlNd';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
