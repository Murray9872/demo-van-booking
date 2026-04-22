// Returns sanitized booking calendar data — no customer names
// Used by the public booking page at /book

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const SURL = 'https://gtcinsveqrwqakxentfo.supabase.co';
  const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0Y2luc3ZlcXJ3cWFreGVudGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTQzMzksImV4cCI6MjA5MTY3MDMzOX0.BsCaAnqO0x7PsKoAnv776hQWAYx4Qihpp2znesLjBfU';

  try {
    // Use fetch to query Supabase REST API directly (no SDK needed server-side)
    const url = `${SURL}/rest/v1/bookings?select=demo_start_date,duration_days,location,status&status=neq.Cancelled&order=demo_start_date.asc`;
    const resp = await fetch(url, {
      headers: { 'apikey': SKEY, 'Authorization': 'Bearer ' + SKEY }
    });
    const data = await resp.json();

    // Sanitize: strip customer info, only return dates + state + status
    const bookings = (data || []).map(b => {
      const parts = (b.location || '').split(',');
      const s = parts.length >= 2 ? parts[parts.length - 1].trim().replace(/\d/g, '').trim() : '';
      return {
        date: b.demo_start_date,
        duration: parseFloat(b.duration_days || 1),
        state: s.length <= 3 ? s.toUpperCase() : s.substring(0, 2).toUpperCase(),
        status: b.status
      };
    });

    // Get travel buffer setting
    const sUrl = `${SURL}/rest/v1/settings?select=travel_buffer_miles&id=eq.1`;
    const sResp = await fetch(sUrl, {
      headers: { 'apikey': SKEY, 'Authorization': 'Bearer ' + SKEY }
    });
    const sData = await sResp.json();

    return res.status(200).json({
      bookings,
      travelBufferMiles: sData?.[0]?.travel_buffer_miles || 100
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
