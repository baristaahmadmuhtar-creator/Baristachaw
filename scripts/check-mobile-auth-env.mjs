import { loadEnvFiles } from './lib/env-check.mjs';

const mobileEnv = loadEnvFiles([
  'apps/mobile/.env.production.local',
  'apps/mobile/.env.local',
  'apps/mobile/.env',
]);
const serverEnv = loadEnvFiles([
  '.vercel/.env.production.local',
  '.env.production.local',
  '.env.local',
  '.env',
]);

const checks = [
  {
    label: 'Mobile Supabase URL',
    value: mobileEnv.EXPO_PUBLIC_SUPABASE_URL,
    where: 'apps/mobile/.env or EAS build env',
    validate: (value) => /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value || ''),
  },
  {
    label: 'Mobile Supabase publishable key',
    value: mobileEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || mobileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    where: 'apps/mobile/.env or EAS build env',
    validate: (value) => Boolean(value && value.length >= 20),
  },
  {
    label: 'Server Supabase URL',
    value: serverEnv.SUPABASE_URL || serverEnv.EXPO_PUBLIC_SUPABASE_URL,
    where: 'server runtime or Vercel env',
    validate: (value) => /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value || ''),
  },
  {
    label: 'Server Supabase publishable key',
    value: serverEnv.SUPABASE_PUBLISHABLE_KEY || serverEnv.SUPABASE_ANON_KEY || serverEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    where: 'server runtime or Vercel env',
    validate: (value) => Boolean(value && value.length >= 20),
  },
];

const failures = checks.filter((check) => !check.validate(String(check.value || '').trim()));

if (failures.length > 0) {
  console.error('Mobile auth env is not ready for email/password auth.');
  for (const failure of failures) {
    console.error(`- ${failure.label} is missing or invalid (${failure.where}).`);
  }
  console.error('Google fallback can still work, but email sign-up, email sign-in, and password recovery will stay hidden until these values are set.');
  process.exit(1);
}

console.log('Mobile auth env is ready for Google, email sign-up, email sign-in, and password recovery.');
