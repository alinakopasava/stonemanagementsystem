import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

/**
 * The account can be given on the command line:
 *
 *   node scripts/create-example-user.js <email> <password> [role]
 *
 * That is the way to seed several accounts in a row. A `.env` file holds one
 * value per key — repeating `EXAMPLE_USER_EMAIL` three times does not create
 * three accounts, it just means two of the three lines are ignored.
 */
const [argEmail, argPassword, argRole] = process.argv.slice(2);

if (argEmail) process.env.EXAMPLE_USER_EMAIL = argEmail;
if (argPassword) process.env.EXAMPLE_USER_PASSWORD = argPassword;
if (argRole) process.env.EXAMPLE_USER_ROLE = argRole;

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

/**
 * Which role the seeded account gets. Defaults to the customer role, so the
 * script keeps behaving as before when the variable is absent. Staff accounts
 * for the system tests are made by setting this to `admin` or `monter`.
 */
const ALLOWED_ROLES = ['klient', 'monter', 'admin'];
const role = process.env.EXAMPLE_USER_ROLE ?? 'klient';

if (!ALLOWED_ROLES.includes(role)) {
  throw new Error(
    `EXAMPLE_USER_ROLE must be one of: ${ALLOWED_ROLES.join(', ')}. Got "${role}".`
  );
}

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
    // The account is reused, but the password is set again from the environment:
    // otherwise a value changed in `.env` would silently disagree with the one
    // the account actually has, and every sign-in would fail for no visible
    // reason. Confirmation is re-asserted for the same purpose.
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: process.env.EXAMPLE_USER_PASSWORD,
      email_confirm: true
    });

    if (updateError) {
      throw new Error(`Failed to refresh the existing user: ${updateError.message}`);
    }

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
      last_name: role.charAt(0).toUpperCase() + role.slice(1),
      role
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

  console.log(`Example user is ready with the ${role} role.`);
  console.log(`auth.users.id / profiles.id: ${user.id}`);
  console.log('Set EXAMPLE_USER_ID in backend/.env to this value.');
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
