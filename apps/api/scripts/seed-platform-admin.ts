import { connect, disconnect, User } from '@ethica/db';
import { env } from '../src/config/env.config.js';

// Dev/ops tool — not a route. `isPlatformAdmin` is never accepted through an
// HTTP request (design.md, Tech Decisions: "the flag is never accepted through a
// route (only seed/script)"); this is the script. Idempotent: upsert by e-mail.
// No password (AD-155): the admin signs in with the key sent to this e-mail.
const email = process.env.SEED_EMAIL || 'admin@platform.local';
const name = process.env.SEED_NAME || 'Platform Admin';

const run = async (): Promise<void> => {
  await connect(env.MONGODB_URI);

  await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { name, email, isPlatformAdmin: true, role: [], active: true },
    { upsert: true, setDefaultsOnInsert: true },
  );

  console.log(JSON.stringify({ event: 'seed.platform_admin.done', email }));
  await disconnect();
};

void run();
