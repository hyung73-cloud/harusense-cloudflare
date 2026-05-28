function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

async function getClinics(db) {
  const clinics = await db.prepare("SELECT * FROM clinics ORDER BY name").all();
  const items = await db.prepare("SELECT * FROM clinic_items").all();
  const byClinic = new Map();
  for (const item of items.results || []) {
    if (!byClinic.has(item.clinic_id)) byClinic.set(item.clinic_id, []);
    byClinic.get(item.clinic_id).push(item);
  }
  return (clinics.results || []).map((clinic) => {
    const prices = {};
    const stock = {};
    for (const item of byClinic.get(clinic.id) || []) {
      if (item.price !== null && item.price !== undefined) prices[item.item_key] = Number(item.price);
      stock[item.item_key] = item.in_stock !== 0;
    }
    return {
      id: clinic.id,
      institution_no: clinic.institution_no,
      name: clinic.name,
      district: clinic.district,
      address: clinic.address,
      lat: Number(clinic.lat),
      lng: Number(clinic.lng),
      phone: clinic.phone,
      verified: clinic.verified === 1,
      notes: clinic.notes || "",
      prices,
      stock,
      updated_by: clinic.updated_by,
      updated_at: clinic.updated_at
    };
  });
}

export async function onRequestGet({ env }) {
  try {
    if (!env.HARUSENSE_DB) return json({ error: "D1 database is not bound" }, 503);
    const clinics = await getClinics(env.HARUSENSE_DB);
    return json({ last_updated: new Date().toISOString().slice(0, 10), version: "api-d1", clinics });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
