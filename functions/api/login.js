function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
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
    return json({
      ok: true,
      clinic: {
        id: clinic.id,
        institution_no: clinic.institution_no,
        name: clinic.name,
        district: clinic.district,
        address: clinic.address,
        phone: clinic.phone
      }
    });
  } catch (error) {
    return json({ ok: false, error: error.message }, 500);
  }
}
