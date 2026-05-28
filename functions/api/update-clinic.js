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
  if (n < 10000 || n > 1500000) throw new Error("가격 범위를 확인해주세요.");
  return Math.round(n);
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.HARUSENSE_DB) return json({ ok: false, error: "D1 database is not bound" }, 503);
    const body = await request.json();
    const institutionNo = String(body.institution_no || "").trim();
    const password = String(body.password || "").trim();
    if (!institutionNo || password !== `h${institutionNo}`) {
      return json({ ok: false, error: "요양기관번호 또는 비밀번호가 맞지 않습니다." }, 401);
    }
    const clinic = await env.HARUSENSE_DB.prepare("SELECT * FROM clinics WHERE institution_no = ?")
      .bind(institutionNo)
      .first();
    if (!clinic) return json({ ok: false, error: "등록된 병원이 아닙니다." }, 404);

    const items = body.items || {};
    const changedAt = new Date().toISOString();
    for (const [itemKey, item] of Object.entries(items)) {
      const price = validPrice(item.price);
      const inStock = item.in_stock === false ? 0 : 1;
      const old = await env.HARUSENSE_DB.prepare(
        "SELECT price, in_stock FROM clinic_items WHERE clinic_id = ? AND item_key = ?"
      ).bind(clinic.id, itemKey).first();
      await env.HARUSENSE_DB.prepare(
        "UPDATE clinic_items SET price = ?, in_stock = ?, updated_at = ? WHERE clinic_id = ? AND item_key = ?"
      ).bind(price, inStock, changedAt, clinic.id, itemKey).run();
      await env.HARUSENSE_DB.prepare(
        "INSERT INTO change_logs (clinic_id, institution_no, item_key, old_price, new_price, old_stock, new_stock, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(clinic.id, institutionNo, itemKey, old?.price ?? null, price, old?.in_stock ?? null, inStock, changedAt).run();
    }
    await env.HARUSENSE_DB.prepare("UPDATE clinics SET updated_by = ?, updated_at = ? WHERE id = ?")
      .bind("260528", changedAt, clinic.id)
      .run();
    return json({ ok: true, updated_at: changedAt, updated_by: "260528" });
  } catch (error) {
    return json({ ok: false, error: error.message }, 400);
  }
}
