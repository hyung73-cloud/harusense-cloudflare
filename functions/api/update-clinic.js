function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function validPrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n)) return null;
  if (n < 10000 || n > 1500000) throw new Error("가격 범위를 확인해주세요. (1만원 ~ 150만원)");
  return Math.round(n);
}

// item_key 예: "mounjaro_2.5mg" → drug="mounjaro", dose="2.5mg"
function splitItemKey(itemKey) {
  const idx = itemKey.indexOf("_");
  if (idx < 0) return { drug: itemKey, dose: "" };
  return { drug: itemKey.slice(0, idx), dose: itemKey.slice(idx + 1) };
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.HARUSENSE_DB) return json({ ok: false, error: "D1 database is not bound" }, 503);

    const body = await request.json();
    const institutionNo = String(body.institution_no || "").trim();
    const password = String(body.password || "").trim();

    // 로그인 검증 (다탄님 의도대로 h+요양기관번호 유지)
    if (!institutionNo || password !== `h${institutionNo}`) {
      return json({ ok: false, error: "요양기관번호 또는 비밀번호가 맞지 않습니다." }, 401);
    }

    const clinic = await env.HARUSENSE_DB.prepare("SELECT * FROM clinics WHERE institution_no = ?")
      .bind(institutionNo)
      .first();
    if (!clinic) return json({ ok: false, error: "등록된 병원이 아닙니다." }, 404);

    const items = body.items || {};
    const changedAt = new Date().toISOString();
    let changedCount = 0;

    for (const [itemKey, item] of Object.entries(items)) {
      const price = validPrice(item.price);
      const inStock = item.in_stock === false ? 0 : 1;
      const { drug, dose } = splitItemKey(itemKey);

      // 기존 값 조회 (변경 이력 기록용)
      const old = await env.HARUSENSE_DB.prepare(
        "SELECT price, in_stock FROM clinic_items WHERE clinic_id = ? AND item_key = ?"
      ).bind(clinic.id, itemKey).first();

      // ── 핵심 수정: UPDATE → UPSERT ──
      // 기존 행이 없으면 INSERT, 있으면 UPDATE. 신규 가격도 반드시 저장됨.
      await env.HARUSENSE_DB.prepare(
        `INSERT INTO clinic_items (clinic_id, item_key, drug, dose, price, in_stock, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(clinic_id, item_key)
         DO UPDATE SET price = excluded.price,
                       in_stock = excluded.in_stock,
                       updated_at = excluded.updated_at`
      ).bind(clinic.id, itemKey, drug, dose, price, inStock, changedAt).run();

      // 실제로 값이 바뀐 경우에만 변경 이력 기록 (불필요한 로그 방지)
      const priceChanged = (old?.price ?? null) !== price;
      const stockChanged = (old?.in_stock ?? null) !== inStock;
      if (!old || priceChanged || stockChanged) {
        await env.HARUSENSE_DB.prepare(
          `INSERT INTO change_logs
           (clinic_id, institution_no, item_key, old_price, new_price, old_stock, new_stock, changed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          clinic.id, institutionNo, itemKey,
          old?.price ?? null, price,
          old?.in_stock ?? null, inStock,
          changedAt
        ).run();
        changedCount++;
      }
    }

    // 의원 단위 갱신 정보 — updated_by를 실제 수정 병원번호로 기록 (기존 고정값 "260528" 버그 수정)
    await env.HARUSENSE_DB.prepare(
      "UPDATE clinics SET updated_by = ?, updated_at = ? WHERE id = ?"
    ).bind(institutionNo, changedAt, clinic.id).run();

    return json({
      ok: true,
      updated_at: changedAt,
      updated_by: institutionNo,
      changed_count: changedCount
    });
  } catch (error) {
    return json({ ok: false, error: error.message }, 400);
  }
}
