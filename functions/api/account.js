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
      case "updatePosition":
        return json(await updatePosition(db, payload));
      case "getClinicOverrides":
        return json(await getClinicOverrides(db));
      case "syncAccount":
        return json(await syncAccount(db, env, payload));
      case "syncAccountHash":
        return json(await syncAccountHash(db, env, payload));
      case "addQrFeedback":
        return json(await addQrFeedback(db, payload));
      case "getQrFeedbacks":
        return json(await getQrFeedbacks(db, payload));
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


async function ensureProviderUpdatesNoteColumn(db) {
  try {
    await db.prepare("SELECT provider_note FROM provider_updates LIMIT 1").first();
  } catch (err) {
    try {
      await db.prepare("ALTER TABLE provider_updates ADD COLUMN provider_note TEXT NOT NULL DEFAULT ''").run();
    } catch (alterErr) {}
  }
}
async function updatePrices(db, payload) {
    await ensureProviderUpdatesNoteColumn(db);
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
  const providerNote = clean(payload.provider_note).slice(0, 80);

  await db.prepare(`
    INSERT INTO provider_updates (institution_no, items_json, updated_at, updated_by, status, parking_available, parking_updated_at, provider_note)
    VALUES (?, ?, datetime('now'), ?, '반영', ?, ?, ?)
    ON CONFLICT(institution_no) DO UPDATE SET
      items_json = excluded.items_json,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by,
      status = '반영',
      parking_available = excluded.parking_available,
      parking_updated_at = excluded.parking_updated_at,
      provider_note = excluded.provider_note
  `).bind(institutionNo, JSON.stringify(items), institutionNo, parking, parkingUpdatedAt, providerNote).run();

  return { ok: true };
}

async function getClinicOverrides(db) {
  await ensureProviderUpdatesNoteColumn(db);
  await ensureProviderPositionsTable(db);

  const rows = await db.prepare(`
    SELECT
      u.institution_no,
      u.items_json,
      u.updated_at,
      u.parking_available,
      u.parking_updated_at,
      u.provider_note,
      p.lat AS position_lat,
      p.lng AS position_lng,
      p.position_verified_at,
      p.position_verified_by
    FROM provider_updates u
    LEFT JOIN provider_positions p
      ON p.institution_no = u.institution_no
     AND (p.status IS NULL OR p.status != 'inactive')
    WHERE u.status IS NULL OR u.status NOT IN ('inactive', 'stopped')
  `).all();

  const updates = [];
  for (const row of rows.results || []) {
    if (!row.institution_no) continue;
    let items = {};
    try {
      items = row.items_json ? JSON.parse(row.items_json) : {};
    } catch (err) {
      items = {};
    }

    const parking = String(row.parking_available || '').trim();
    const parkingAvailable = parking === '예' || parking === 'true' || parking.includes('가능');
    updates.push({
      institution_no: String(row.institution_no),
      items,
      updated_at: row.updated_at || '',
      parking_available: parkingAvailable ? '주차 가능' : '',
      provider_parking: parkingAvailable ? '주차 가능' : '',
      parking_updated_at: row.parking_updated_at || '',
      provider_note: String(row.provider_note || '').trim(),
      position_lat: row.position_lat,
      position_lng: row.position_lng,
      position_verified_at: row.position_verified_at || '',
      position_verified_by: row.position_verified_by || ''
    });
  }

  return { ok: true, updates };
}

async function ensureProviderPositionsTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS provider_positions (
      institution_no TEXT PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT NOT NULL DEFAULT '',
      position_verified_at TEXT NOT NULL DEFAULT (datetime('now')),
      position_verified_by TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      note TEXT NOT NULL DEFAULT ''
    )
  `).run();
}

async function updatePosition(db, payload) {
  const institutionNo = clean(payload.institution_no);
  const password = String(payload.password || '');
  const lat = Number(payload.lat);
  const lng = Number(payload.lng);

  if (!institutionNo || !password) {
    return { ok: false, error: '요양기관번호와 비밀번호가 필요합니다.' };
  }
  if (institutionNo !== '12339695') {
    return { ok: false, error: '현재 위치 미세조정은 뉴센스의원 테스트 계정에서만 사용할 수 있습니다.' };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) {
    return { ok: false, error: '저장할 위치 좌표가 올바르지 않습니다.' };
  }

  const account = await findAccount(db, institutionNo);
  if (!account || !(await verifyPassword(password, account.password_salt, account.password_hash))) {
    return { ok: false, error: '요양기관번호 또는 비밀번호가 맞지 않습니다.' };
  }

  await ensureProviderPositionsTable(db);
  await db.prepare(`
    INSERT INTO provider_positions (
      institution_no, lat, lng, updated_at, updated_by,
      position_verified_at, position_verified_by, status, note
    )
    VALUES (?, ?, ?, datetime('now'), ?, datetime('now'), ?, 'active', ?)
    ON CONFLICT(institution_no) DO UPDATE SET
      lat = excluded.lat,
      lng = excluded.lng,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by,
      position_verified_at = excluded.position_verified_at,
      position_verified_by = excluded.position_verified_by,
      status = 'active',
      note = excluded.note
  `).bind(
    institutionNo,
    lat,
    lng,
    institutionNo,
    institutionNo,
    'provider drag position'
  ).run();

  return {
    ok: true,
    institution_no: institutionNo,
    lat,
    lng,
    position_verified_at: new Date().toISOString(),
    position_verified_by: institutionNo
  };
}

async function syncAccount(db, env, payload) {
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

async function ensureQrFeedbackTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS qr_feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution_no TEXT NOT NULL,
      choices_json TEXT NOT NULL DEFAULT '[]',
      emoji TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'qr',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      user_agent TEXT NOT NULL DEFAULT ''
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_qr_feedbacks_institution_created ON qr_feedbacks (institution_no, created_at)").run();
}

async function addQrFeedback(db, payload) {
  const institutionNo = clean(payload.institution_no);
  if (!institutionNo) return { ok: false, error: "institution_no is required" };

  let choices = [];
  try {
    const parsed = JSON.parse(String(payload.choices_json || "[]"));
    if (Array.isArray(parsed)) choices = parsed.map(v => clean(v)).filter(Boolean).slice(0, 3);
  } catch (err) {
    choices = [];
  }

  const emoji = clean(payload.emoji).slice(0, 8);
  if (!choices.length && !emoji) return { ok: false, error: "feedback is empty" };
  if (String(payload.location_verified || "") !== "true") {
    return { ok: false, error: "QR feedback location check failed" };
  }

  await ensureQrFeedbackTable(db);
  await db.prepare(`
    INSERT INTO qr_feedbacks (institution_no, choices_json, emoji, source, user_agent)
    VALUES (?, ?, ?, 'qr', ?)
  `).bind(
    institutionNo,
    JSON.stringify(choices),
    emoji,
    clean(payload.user_agent).slice(0, 240)
  ).run();

  return { ok: true };
}

async function getQrFeedbacks(db, payload) {
  const institutionNo = clean(payload.institution_no);
  await ensureQrFeedbackTable(db);

  const rows = institutionNo
    ? await db.prepare(`
        SELECT institution_no, choices_json, emoji, created_at
        FROM qr_feedbacks
        WHERE institution_no = ?
        ORDER BY created_at DESC
        LIMIT 3
      `).bind(institutionNo).all()
    : await db.prepare(`
        SELECT institution_no, choices_json, emoji, created_at
        FROM qr_feedbacks
        ORDER BY created_at DESC
        LIMIT 3
      `).all();

  const feedbacks = [];
  for (const row of rows.results || []) {
    let choices = [];
    try { choices = JSON.parse(row.choices_json || "[]"); } catch (err) {}
    feedbacks.push({
      institution_no: String(row.institution_no || ""),
      choices,
      emoji: String(row.emoji || ""),
      created_at: row.created_at || ""
    });
  }
  return { ok: true, feedbacks };
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
