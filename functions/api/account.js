const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8" }
});

const ACTIVE_STATUS = new Set(["활성", "active", "ACTIVE", ""]);

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB || env.HARUSENSE_DB || env.HARUSENSE_D1;
  if (!db) {
    return json({ ok: false, error: "D1 DB 연결이 없습니다. Cloudflare Pages에서 D1 binding 이름을 DB로 설정해주세요." }, 500);
  }

  let payload = {};
  if (request.method === "POST") {
    try {
      payload = await request.json();
    } catch (err) {
      return json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, 400);
    }
  } else {
    const url = new URL(request.url);
    payload = Object.fromEntries(url.searchParams.entries());
  }

  try {
    switch (payload.action) {
      case "login":
        return json(await login(db, payload));
      case "changePassword":
        return json(await changePassword(db, payload));
      case "updatePrices":
        return json(await updatePrices(db, payload));
      case "getClinicOverrides":
        return json(await getClinicOverrides(db));
      case "addClinicReaction":
        return json(await addClinicReaction(db, payload));
      case "getClinicReactions":
        return json(await getClinicReactions(db, payload));
      case "syncAccount":
        return json(await syncAccount(db, env, payload));
      case "syncAccountHash":
        return json(await syncAccountHash(db, env, payload));
      default:
        return json({ ok: false, error: "알 수 없는 요청입니다." }, 400);
    }
  } catch (err) {
    return json({ ok: false, error: "처리 중 오류가 발생했습니다: " + err.message }, 500);
  }
}

async function login(db, payload) {
  const institutionNo = clean(payload.institution_no);
  const password = String(payload.password || "");
  if (!institutionNo || !password) {
    return { ok: false, error: "요양기관번호와 비밀번호를 입력해주세요." };
  }

  const account = await findAccount(db, institutionNo);
  if (!account || !ACTIVE_STATUS.has(String(account.status || ""))) {
    return { ok: false, error: "요양기관번호 또는 비밀번호가 맞지 않습니다." };
  }
  if (!(await verifyPassword(password, account.password_salt, account.password_hash))) {
    return { ok: false, error: "요양기관번호 또는 비밀번호가 맞지 않습니다." };
  }

  await db.prepare("UPDATE provider_accounts SET last_login_at = datetime('now') WHERE institution_no = ?")
    .bind(institutionNo)
    .run();

  return {
    ok: true,
    institution_no: institutionNo,
    organization_name: account.organization_name || "",
    must_change_password: Number(account.first_password_changed || 0) !== 1,
    clinic: {
      id: institutionNo,
      institution_no: institutionNo,
      name: account.organization_name || "",
      type: account.kind === "약국" ? "pharmacy" : "clinic",
      phone: account.phone || ""
    }
  };
}

async function changePassword(db, payload) {
  const institutionNo = clean(payload.institution_no);
  const currentPassword = String(payload.current_password || "");
  const newPassword = String(payload.new_password || "");
  if (!institutionNo || !currentPassword || !newPassword) {
    return { ok: false, error: "필수 정보가 누락되었습니다." };
  }
  if (newPassword.length < 8) {
    return { ok: false, error: "새 비밀번호는 8자 이상이어야 합니다." };
  }
  if (currentPassword === newPassword) {
    return { ok: false, error: "새 비밀번호는 임시 비밀번호와 달라야 합니다." };
  }

  const account = await findAccount(db, institutionNo);
  if (!account) return { ok: false, error: "계정을 찾을 수 없습니다." };
  if (!(await verifyPassword(currentPassword, account.password_salt, account.password_hash))) {
    return { ok: false, error: "현재 비밀번호가 맞지 않습니다." };
  }

  const salt = crypto.randomUUID();
  const hash = await sha256Hex(salt + ":" + newPassword);
  await db.prepare(`
    UPDATE provider_accounts
    SET password_salt = ?, password_hash = ?, temp_password = '', first_password_changed = 1,
        updated_at = datetime('now'), note = ?
    WHERE institution_no = ?
  `).bind(salt, hash, "비밀번호 변경 완료: " + new Date().toISOString(), institutionNo).run();

  return { ok: true };
}

async function updatePrices(db, payload) {
  const institutionNo = clean(payload.institution_no);
  const password = String(payload.password || "");
  const itemsJson = String(payload.items_json || "");
  if (!institutionNo || !password || !itemsJson) {
    return { ok: false, error: "저장할 정보가 부족합니다." };
  }

  const account = await findAccount(db, institutionNo);
  if (!account || !(await verifyPassword(password, account.password_salt, account.password_hash))) {
    return { ok: false, error: "요양기관번호 또는 비밀번호가 맞지 않습니다." };
  }

  let items;
  try {
    items = JSON.parse(itemsJson);
  } catch (err) {
    return { ok: false, error: "가격 정보 형식이 올바르지 않습니다." };
  }

  const parking = String(payload.parking_available || "") === "true" ? "예" : "";
  const parkingUpdatedAt = parking ? new Date().toISOString() : "";

  await db.prepare(`
    INSERT INTO provider_updates (institution_no, items_json, updated_at, updated_by, status, parking_available, parking_updated_at)
    VALUES (?, ?, datetime('now'), ?, '반영', ?, ?)
    ON CONFLICT(institution_no) DO UPDATE SET
      items_json = excluded.items_json,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by,
      status = '반영',
      parking_available = excluded.parking_available,
      parking_updated_at = excluded.parking_updated_at
  `).bind(institutionNo, JSON.stringify(items), institutionNo, parking, parkingUpdatedAt).run();

  return { ok: true };
}

async function getClinicOverrides(db) {
  const rows = await db.prepare(`
    SELECT institution_no, items_json, updated_at, parking_available, parking_updated_at
    FROM provider_updates
    WHERE status IS NULL OR status != '중지'
  `).all();
  const updates = [];

  for (const row of rows.results || []) {
    if (!row.institution_no || !row.items_json) continue;
    try {
      const parking = String(row.parking_available || "").trim();
      updates.push({
        institution_no: String(row.institution_no),
        items: JSON.parse(row.items_json),
        updated_at: row.updated_at || "",
        parking_available: parking === "예" ? "주차 가능" : "",
        provider_parking: parking === "예" ? "주차 가능" : "",
        parking_updated_at: row.parking_updated_at || ""
      });
    } catch (err) {}
  }

  return { ok: true, updates };
}

async async function ensureReactionTable(db) {
  await db.prepare([
    "CREATE TABLE IF NOT EXISTS clinic_reactions (",
    "id INTEGER PRIMARY KEY AUTOINCREMENT,",
    "institution_no TEXT NOT NULL,",
    "emoji TEXT NOT NULL DEFAULT '',",
    "tags_json TEXT NOT NULL DEFAULT '[]',",
    "source TEXT NOT NULL DEFAULT '',",
    "visitor_key TEXT NOT NULL DEFAULT '',",
    "created_at TEXT NOT NULL DEFAULT (datetime('now'))",
    ")"
  ].join("\n")).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_clinic_reactions_inst_time ON clinic_reactions (institution_no, created_at DESC)").run();
}

const ALLOWED_REACTION_TAGS = new Set([
  "실제 가격 동일", "표시 가격과 같았어요", "가격 변동 없었어요", "오늘 기준 동일했어요", "현장 가격 동일",
  "오늘 재고 있었어요", "바로 수령 가능했어요", "재고 확인됐어요", "방문 시 가능했어요", "오늘 기준 확인됨",
  "대기 길지 않았어요", "비교적 빠르게 진행됐어요", "바로 안내받았어요", "오래 기다리지 않았어요", "혼잡하지 않았어요",
  "응대가 깔끔했어요", "안내가 빨랐어요", "설명이 간단명확했어요", "방문 흐름이 빨랐어요", "전체적으로 무난했어요"
]);
const ALLOWED_REACTION_EMOJIS = new Set(["👍", "👌", "😮"]);

function parseReactionTags(raw) {
  let tags = raw;
  if (typeof raw === "string") {
    try { tags = JSON.parse(raw); } catch (err) { tags = []; }
  }
  if (!Array.isArray(tags)) tags = [];
  const out = [];
  for (const tag of tags) {
    const cleanTag = clean(tag);
    if (ALLOWED_REACTION_TAGS.has(cleanTag) && !out.includes(cleanTag)) out.push(cleanTag);
    if (out.length >= 3) break;
  }
  return out;
}

async function addClinicReaction(db, payload) {
  await ensureReactionTable(db);
  const institutionNo = clean(payload.institution_no);
  const emoji = clean(payload.emoji);
  const tags = parseReactionTags(payload.tags || payload.tags_json);
  const source = clean(payload.source) === "qr" ? "qr" : "";
  const visitorKey = clean(payload.visitor_key).slice(0, 80);

  if (!institutionNo) return { ok: false, error: "기관 정보가 없습니다." };
  if (!ALLOWED_REACTION_EMOJIS.has(emoji)) return { ok: false, error: "이모티콘을 선택해주세요." };
  if (!tags.length) return { ok: false, error: "확인 문구를 1개 이상 선택해주세요." };

  await db.prepare([
    "INSERT INTO clinic_reactions (institution_no, emoji, tags_json, source, visitor_key, created_at)",
    "VALUES (?, ?, ?, ?, ?, datetime('now'))"
  ].join("\n")).bind(institutionNo, emoji, JSON.stringify(tags), source, visitorKey).run();

  return await getClinicReactions(db, { institution_no: institutionNo });
}

async function getClinicReactions(db, payload) {
  await ensureReactionTable(db);
  const institutionNo = clean(payload.institution_no);
  if (!institutionNo) return { ok: true, reactions: [] };

  const rows = await db.prepare([
    "SELECT emoji, tags_json, source, created_at",
    "FROM clinic_reactions",
    "WHERE institution_no = ?",
    "ORDER BY datetime(created_at) DESC, id DESC",
    "LIMIT 3"
  ].join("\n")).bind(institutionNo).all();

  const reactions = [];
  for (const row of rows.results || []) {
    let tags = [];
    try { tags = JSON.parse(row.tags_json || "[]"); } catch (err) {}
    reactions.push({ emoji: row.emoji || "", tags, source: row.source || "", created_at: row.created_at || "" });
  }

  return { ok: true, reactions };
}

function syncAccount(db, env, payload) {
  const expectedToken = String(env.ADMIN_SYNC_TOKEN || "");
  if (!expectedToken || String(payload.token || "") !== expectedToken) {
    return { ok: false, error: "운영자 동기화 권한이 없습니다." };
  }

  const institutionNo = clean(payload.institution_no);
  const organizationName = clean(payload.organization_name);
  const tempPassword = String(payload.temp_password || "");
  if (!institutionNo || !organizationName || !tempPassword) {
    return { ok: false, error: "계정 동기화 정보가 부족합니다." };
  }

  const salt = crypto.randomUUID();
  const hash = await sha256Hex(salt + ":" + tempPassword);
  await db.prepare(`
    INSERT INTO provider_accounts (
      institution_no, organization_name, kind, phone,
      manager_name, manager_role, manager_mobile, manager_email,
      status, password_salt, password_hash, temp_password,
      first_password_changed, issued_at, sent_at, updated_at, note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '활성', ?, ?, ?, 0, datetime('now'), datetime('now'), datetime('now'), ?)
    ON CONFLICT(institution_no) DO UPDATE SET
      organization_name = excluded.organization_name,
      kind = excluded.kind,
      phone = excluded.phone,
      manager_name = excluded.manager_name,
      manager_role = excluded.manager_role,
      manager_mobile = excluded.manager_mobile,
      manager_email = excluded.manager_email,
      status = '활성',
      password_salt = excluded.password_salt,
      password_hash = excluded.password_hash,
      temp_password = excluded.temp_password,
      first_password_changed = 0,
      sent_at = excluded.sent_at,
      updated_at = excluded.updated_at,
      note = excluded.note
  `).bind(
    institutionNo,
    organizationName,
    clean(payload.kind),
    clean(payload.phone),
    clean(payload.manager_name),
    clean(payload.manager_role),
    clean(payload.manager_mobile),
    clean(payload.manager_email),
    salt,
    hash,
    tempPassword,
    "Apps Script 계정 동기화: " + new Date().toISOString()
  ).run();

  return { ok: true, institution_no: institutionNo };
}

async function syncAccountHash(db, env, payload) {
  const expectedToken = String(env.ADMIN_SYNC_TOKEN || "");
  if (!expectedToken || String(payload.token || "") !== expectedToken) {
    return { ok: false, error: "운영자 동기화 권한이 없습니다." };
  }

  const institutionNo = clean(payload.institution_no);
  const organizationName = clean(payload.organization_name);
  const salt = String(payload.password_salt || "");
  const hash = String(payload.password_hash || "");
  if (!institutionNo || !organizationName || !salt || !hash) {
    return { ok: false, error: "계정 Hash 동기화 정보가 부족합니다." };
  }

  const firstChanged = String(payload.first_password_changed || "") === "예" || String(payload.first_password_changed || "") === "1" ? 1 : 0;
  await db.prepare(`
    INSERT INTO provider_accounts (
      institution_no, organization_name, kind, phone,
      manager_name, manager_role, manager_mobile, manager_email,
      status, password_salt, password_hash, temp_password,
      first_password_changed, issued_at, sent_at, updated_at, note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), ?)
    ON CONFLICT(institution_no) DO UPDATE SET
      organization_name = excluded.organization_name,
      kind = excluded.kind,
      phone = excluded.phone,
      manager_name = excluded.manager_name,
      manager_role = excluded.manager_role,
      manager_mobile = excluded.manager_mobile,
      manager_email = excluded.manager_email,
      status = excluded.status,
      password_salt = excluded.password_salt,
      password_hash = excluded.password_hash,
      temp_password = excluded.temp_password,
      first_password_changed = excluded.first_password_changed,
      updated_at = excluded.updated_at,
      note = excluded.note
  `).bind(
    institutionNo,
    organizationName,
    clean(payload.kind),
    clean(payload.phone),
    clean(payload.manager_name),
    clean(payload.manager_role),
    clean(payload.manager_mobile),
    clean(payload.manager_email),
    clean(payload.status) || "활성",
    salt,
    hash,
    String(payload.temp_password || ""),
    firstChanged,
    "Apps Script Hash 계정 동기화: " + new Date().toISOString()
  ).run();

  return { ok: true, institution_no: institutionNo };
}

async function findAccount(db, institutionNo) {
  return await db.prepare("SELECT * FROM provider_accounts WHERE institution_no = ? LIMIT 1")
    .bind(institutionNo)
    .first();
}

async function verifyPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false;
  const hash = await sha256Hex(String(salt) + ":" + String(password));
  return timingSafeEqual(hash, String(expectedHash));
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function clean(value) {
  return String(value || "").trim();
}
