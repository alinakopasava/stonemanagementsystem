import dotenv from 'dotenv';

dotenv.config();

const requiredVariables = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missing = requiredVariables.filter((variable) => !process.env[variable]);
if (missing.length > 0) {
  console.error(
    [
      '',
      '==========================================================================',
      'Missing required environment variable(s): ' + missing.join(', '),
      '',
      'Open backend/.env and fill in the blank values. You can find them in',
      'Supabase dashboard -> Project Settings -> API:',
      '  - SUPABASE_URL              -> "Project URL"',
      '  - SUPABASE_ANON_KEY         -> "Project API keys" -> "anon public"',
      '  - SUPABASE_SERVICE_ROLE_KEY -> "Project API keys" -> "service_role"',
      '',
      'Also paste VITE_SUPABASE_ANON_KEY into frontend/.env.',
      '==========================================================================',
      ''
    ].join('\n')
  );
  process.exit(1);
}

const frontendOrigin = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '');
const cookieSameSite = process.env.COOKIE_SAMESITE ?? 'lax';
const cookieSecure =
  process.env.COOKIE_SECURE === 'true' ||
  frontendOrigin.startsWith('https://') ||
  cookieSameSite === 'none';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  cookieSecure,
  cookieSameSite,
  trustProxy: process.env.TRUST_PROXY === 'true'
};
