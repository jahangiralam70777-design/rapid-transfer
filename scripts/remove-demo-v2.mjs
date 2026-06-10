import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAllRows(table, columns) {
  const rows = [];
  let page = 0;
  while (true) {
    const { data, error } = await admin.from(table).select(columns).range(page * 200, (page + 1) * 200 - 1);
    if (error) { console.error("select error", table, error.message); break; }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 200) break;
    page++;
  }
  return rows;
}

function isDemo(row) {
  const s = JSON.stringify(row).toLowerCase();
  return s.includes('"demo') || s.includes('demo_fake') || s.includes('demo-') || s.includes('dQw4w9WgXcQ');
}

async function deleteRows(table, ids) {
  if (ids.length === 0) return 0;
  const { error } = await admin.from(table).delete().in("id", ids);
  if (error) { console.error("delete error", table, error.message); return 0; }
  return ids.length;
}

async function cleanTable(table, columns) {
  const rows = await getAllRows(table, columns);
  const demoRows = rows.filter(isDemo);
  console.log(`${table}: ${rows.length} total, ${demoRows.length} demo`);
  if (demoRows.length > 0) {
    const ids = demoRows.map(r => r.id);
    await deleteRows(table, ids);
  }
  return demoRows.length;
}

async function main() {
  // Clean content tables
  await cleanTable("quiz_questions", "id,question_text");
  await cleanTable("quizzes", "id,title");
  await cleanTable("video_classes", "id,title");
  await cleanTable("question_bank_resources", "id,title");
  await cleanTable("notifications", "id,title,body");
  await cleanTable("levels", "id,name");
  await cleanTable("media_assets", "id,title");
  await cleanTable("content_versions", "id");
  await cleanTable("site_pages", "id,title");
  await cleanTable("site_page_sections", "id");
  await cleanTable("homepage_sections", "id,title");
  await cleanTable("site_settings", "id,key");
  
  // Check for any remaining demo users
  const { data: allUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const demoUsers = (allUsers?.users ?? []).filter(u => 
    u.email?.toLowerCase().startsWith("demo@") ||
    u.email?.toLowerCase().includes("student@example.com")
  );
  console.log(`\nRemaining demo users: ${demoUsers.length}`);
  
  for (const u of demoUsers) {
    const uid = u.id;
    await admin.from("user_login_events").delete().eq("user_id", uid);
    await admin.from("activity_events").delete().eq("user_id", uid);
    await admin.from("study_sessions").delete().eq("user_id", uid);
    await admin.from("exam_attempts").delete().eq("user_id", uid);
    await admin.from("quiz_sessions").delete().eq("user_id", uid);
    await admin.from("mcq_bookmarks").delete().eq("user_id", uid);
    await admin.from("mcq_wrong_questions").delete().eq("user_id", uid);
    await admin.from("notification_reads").delete().eq("user_id", uid);
    await admin.from("user_roles").delete().eq("user_id", uid);
    await admin.from("profiles").delete().eq("id", uid);
    await admin.from("user_sessions").delete().eq("user_id", uid);
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) console.error("auth delete error", uid, error.message);
    else console.log("deleted user", u.email);
  }
  
  // Clean activity_events and system_error_logs with demo references
  const acts = await getAllRows("activity_events", "id,metadata");
  const demoActs = acts.filter(a => isDemo(a));
  console.log(`activity_events: ${acts.length} total, ${demoActs.length} demo`);
  await deleteRows("activity_events", demoActs.map(r => r.id));

  console.log("\n=== Cleanup complete ===");
}

main().catch(e => { console.error(e); process.exit(1); });
