import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const requiredVariables = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'EXAMPLE_USER_EMAIL',
  'EXAMPLE_USER_PASSWORD'
];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const getOrCreateAuthUser = async () => {
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const existing = usersData.users.find((user) => user.email === process.env.EXAMPLE_USER_EMAIL);
  if (existing) {
    return existing;
  }

  const { data: createdData, error: createError } = await supabase.auth.admin.createUser({
    email: process.env.EXAMPLE_USER_EMAIL,
    password: process.env.EXAMPLE_USER_PASSWORD,
    email_confirm: true
  });

  if (createError || !createdData.user) {
    throw new Error(`Failed to create auth user: ${createError?.message ?? 'Unknown error'}`);
  }

  return createdData.user;
};

const ensureProfile = async (userId) => {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      first_name: 'Example',
      last_name: 'Client',
      role: 'klient'
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(`Failed to upsert profile: ${error.message}`);
  }
};

const run = async () => {
  const user = await getOrCreateAuthUser();
  await ensureProfile(user.id);

  console.log('Example user is ready.');
  console.log(`auth.users.id / profiles.id: ${user.id}`);
  console.log('Set EXAMPLE_USER_ID in backend/.env to this value.');
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
