#!/usr/bin/env node
/**
 * One-time script to set publicMetadata.role = 'admin' for a Clerk user
 * (and optionally users.role in Supabase).
 *
 * Usage:
 *   node scripts/set-admin-role.mjs <CLERK_USER_ID>
 * or:
 *   CLERK_USER_ID=user_xxx node scripts/set-admin-role.mjs
 *
 * Required env: CLERK_SECRET_KEY
 * Optional env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (to also set Supabase users.role)
 */

import { createClerkClient } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const userId = process.argv[2] || process.env.CLERK_USER_ID;
if (!userId) {
  console.error('Usage: node scripts/set-admin-role.mjs <CLERK_USER_ID>');
  console.error('   or: CLERK_USER_ID=user_xxx node scripts/set-admin-role.mjs');
  process.exit(1);
}

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error('Set CLERK_SECRET_KEY in the environment.');
  process.exit(1);
}

async function main() {
  const clerk = createClerkClient({ secretKey });
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { role: 'admin' },
  });
  console.log('Clerk: set publicMetadata.role = "admin" for', userId);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('users').update({ role: 'admin' }).eq('id', userId);
    if (error) {
      console.warn('Supabase update warning:', error.message);
      console.warn('Ensure the user row exists (e.g. user has logged in once).');
    } else {
      console.log('Supabase: set users.role = "admin" for', userId);
    }
  } else {
    console.log('Supabase: skipped (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to also update DB).');
  }

  console.log('Done. Have the user refresh the page or re-login so the new session token includes the role.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
