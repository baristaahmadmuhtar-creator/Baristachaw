const fs = require('fs');
const content = fs.readFileSync('.env.vercel.production', 'utf8');
const lines = content.split('\n');
let url = '', key = '';
for (const line of lines) {
  if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('SUPABASE_URL=')) url = line.split('=')[1].replace(/"/g, '').trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].replace(/"/g, '').trim();
}
if (!url || !key) { console.error('Missing url or key', {url, key}); process.exit(1); }
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);
supabase.from('payment_receipts').delete().eq('status', 'manual_review').then(x => console.log('Deleted manual_review rows:', x.count, x.error));
supabase.from('payment_receipts').delete().eq('status', 'queued').then(x => console.log('Deleted queued rows:', x.count, x.error));
