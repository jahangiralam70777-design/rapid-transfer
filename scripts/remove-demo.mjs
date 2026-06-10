import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getDemoUserIds() {
  const ids = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const demoUsers = data.users.filter(u =>
      u.email?.toLowerCase().startsWith("demo@") ||
      u.email?.toLowerCase().includes("student@example.com")
    );
    ids.push(...demoUsers.map(u => u.id));
    if (data.users.length < 200) break;
  }
  return ids;
}

async function deleteFrom(table, filterFn) {
  let deleted = 0;
  let page = 0;
  while (true) {
    const { data, error } = await admin.from(table).select("id").range(page * 100, (page + 1) * 100 - 1);
    if (error) { console.error("select error", table, error.message); break; }
    if (!data || data.length === 0) break;
    const ids = data.filter(filterFn).map(r => r.id);
    if (ids.length > 0) {
      const { error: delErr } = await admin.from(table).delete().in("id", ids);
      if (delErr) console.error("delete error", table, delErr.message);
      else deleted += ids.length;
    }
    if (data.length < 100) break;
    page++;
  }
  return deleted;
}

async function deleteBySlug(table) {
  const { data, error } = await admin.from(table).select("id,slug").ilike("slug", "demo-%");
  if (error) { console.error("select slug error", table, error.message); return 0; }
  const ids = (data ?? []).map(r => r.id);
  if (ids.length === 0) return 0;
  const { error: delErr } = await admin.from(table).delete().in("id", ids);
  if (delErr) { console.error("delete slug error", table, delErr.message); return 0; }
  return ids.length;
}

async function deleteByTags(table) {
  const { data, error } = await admin.from(table).select("id,tags");
  if (error) { console.error("select tags error", table, error.message); return 0; }
  const ids = (data ?? []).filter(r => r.tags && JSON.stringify(r.tags).includes("demo")).map(r => r.id);
  if (ids.length === 0) return 0;
  const { error: delErr } = await admin.from(table).delete().in("id", ids);
  if (delErr) { console.error("delete tags error", table, delErr.message); return 0; }
  return ids.length;
}

async function deleteByTitle(table) {
  const { data, error } = await admin.from(table).select("id,title").ilike("title", "demo-%");
  if (error) { console.error("select title error", table, error.message); return 0; }
  const ids = (data ?? []).map(r => r.id);
  if (ids.length === 0) return 0;
  const { error: delErr } = await admin.from(table).delete().in("id", ids);
  if (delErr) { console.error("delete title error", table, delErr.message); return 0; }
  return ids.length;
}

async function deleteNotifications() {
  const { data, error } = await admin.from("notifications").select("id,title,body").ilike("title", "demo%");
  if (error) { console.error("notif select error", error.message); return 0; }
  const ids = (data ?? []).map(r => r.id);
  if (ids.length === 0) return 0;
  const { error: delErr } = await admin.from("notifications").delete().in("id", ids);
  if (delErr) { console.error("notif delete error", delErr.message); return 0; }
  return ids.length;
}

async function deleteDemoUsers(demoUserIds) {
  let count = 0;
  for (const uid of demoUserIds) {
    // Delete from child tables first
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
    // Finally delete auth user
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) console.error("auth delete error", uid, error.message);
    else count++;
  }
  return count;
}

async function main() {
  console.log("Finding demo user IDs...");
  const demoUserIds = await getDemoUserIds();
  console.log("Found demo users:", demoUserIds.length);

  // Delete content in dependency order (children before parents)
  console.log("\n--- Deleting content ---");

  // 1. Quiz questions (child of quizzes)
  const quizQ = await deleteByTitle("quiz_questions");
  console.log("quiz_questions deleted:", quizQ);

  // 2. MCQs
  const mcq = await deleteByTags("mcqs");
  console.log("mcqs deleted:", mcq);

  // 3. Flash cards
  const flash = await deleteByTags("flash_cards");
  console.log("flash_cards deleted:", flash);

  // 4. Short notes
  const notes = await deleteByTags("short_notes");
  console.log("short_notes deleted:", notes);

  // 5. Video classes
  const vid = await deleteBySlug("video_classes");
  console.log("video_classes deleted:", vid);

  // 6. Quizzes
  const quiz = await deleteBySlug("quizzes");
  console.log("quizzes deleted:", quiz);

  // 7. Question bank resources
  const qb = await deleteBySlug("question_bank_resources");
  console.log("question_bank_resources deleted:", qb);

  // 8. Notifications
  const notif = await deleteNotifications();
  console.log("notifications deleted:", notif);

  // 9. Chapters
  const ch = await deleteBySlug("chapters");
  console.log("chapters deleted:", ch);

  // 10. Subjects
  const subj = await deleteBySlug("subjects");
  console.log("subjects deleted:", subj);

  // 11. Demo users (and all their data)
  if (demoUserIds.length > 0) {
    console.log("\n--- Deleting demo users ---");
    const usersDeleted = await deleteDemoUsers(demoUserIds);
    console.log("demo users deleted:", usersDeleted);
  }

  console.log("\n=== DONE ===");
}

main().catch(e => { console.error(e); process.exit(1); });
