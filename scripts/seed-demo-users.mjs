import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const USERS = [
  { email: "demo@admin.com", password: "Admin@1234", role: "admin", display_name: "Demo Admin" },
  { email: "demo@student.com", password: "Demo@1234", role: "student", display_name: "Alex Morgan" },
];
async function findByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}
for (const u of USERS) {
  let user = await findByEmail(u.email);
  if (user) {
    const { data } = await admin.auth.admin.updateUserById(user.id, { password: u.password, email_confirm: true });
    user = data.user;
    console.log("updated", u.email, user.id);
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true, user_metadata: { display_name: u.display_name } });
    if (error) throw error;
    user = data.user;
    console.log("created", u.email, user.id);
  }
  await admin.from("profiles").upsert({ id: user.id, display_name: u.display_name, status: "active" }, { onConflict: "id" });
  await admin.from("user_roles").upsert({ user_id: user.id, role: u.role }, { onConflict: "user_id,role" });
}
console.log("done");
