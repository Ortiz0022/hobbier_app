import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('room_evidence')
    .select('*, activities(id, points_awarded)');
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

main();
