const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://mlmpolewfhxdcntxwllu.supabase.co';
// Need the anon key from config
const configPath = './src/config/supabase.js';
const configContent = fs.readFileSync(configPath, 'utf-8');
const anonKeyMatch = configContent.match(/supabaseAnonKey\s*=\s*['"`](.*?)['"`]/);
const anonKey = anonKeyMatch ? anonKeyMatch[1] : null;

if (!anonKey) {
  console.log("No anon key found");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function test() {
  // First login as the user to get auth token
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com', // Not sure if this user exists, maybe I don't need to login
    password: 'password'
  });
  
  // Just try invoking it anonymously to see the exact error response (should be 401 or 500 with json)
  console.log("Invoking without auth...");
  const { data, error } = await supabase.functions.invoke('moderate-activity', {
    body: { title: 'test', description: 'test' }
  });
  
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
