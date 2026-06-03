// Creates a pre-confirmed demo user via the Supabase Admin API.
// Run with the service-role key + demo creds in the environment:
//   DEMO_EMAIL=... DEMO_PASSWORD=... node scripts/create-demo-user.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;

if (!url || !key || !email || !password) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_EMAIL, DEMO_PASSWORD");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // skip the verification email so they can log in immediately
});

if (error) {
  console.error("ERROR:", error.message);
  process.exit(1);
}
console.log("created demo user:", data.user.email, "| id:", data.user.id);
