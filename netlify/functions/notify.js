// Netlify serverless function for email notifications
// Requires RESEND_API_KEY environment variable set in Netlify dashboard
// Get a free API key at https://resend.com — add it in Netlify > Site Settings > Environment Variables

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured — skipping email');
    return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: 'No API key configured' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const ADMIN_EMAIL = 'austin.murray@apera-ai.com';

  let to, subject, html;

  if (data.type === 'new_request') {
    to = ADMIN_EMAIL;
    subject = `🚐 New Van Booking Request — ${data.account} | ${data.location} | ${data.demo_start_date}`;
    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0072C6;padding:16px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">New Van Booking Request</h2>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;color:#6B7280;width:140px;"><strong>Rep Name</strong></td><td style="padding:8px 0;">${data.rep_name}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280;"><strong>Rep Email</strong></td><td style="padding:8px 0;">${data.rep_email}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280;"><strong>Account</strong></td><td style="padding:8px 0;font-weight:700;">${data.account}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280;"><strong>Location</strong></td><td style="padding:8px 0;">${data.location}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280;"><strong>Start Date</strong></td><td style="padding:8px 0;">${data.demo_start_date}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280;"><strong>Duration</strong></td><td style="padding:8px 0;">${data.duration_days} day${data.duration_days > 1 ? 's' : ''}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280;"><strong>Demo Types</strong></td><td style="padding:8px 0;">${(data.demo_types || []).join(', ')}</td></tr>
            ${data.notes ? '<tr><td style="padding:8px 0;color:#6B7280;"><strong>Notes</strong></td><td style="padding:8px 0;">'+data.notes+'</td></tr>' : ''}
          </table>
          <div style="margin-top:20px;padding:12px 16px;background:#F3F4F6;border-radius:6px;font-size:13px;color:#4B5563;">
            Log in to the Demo Van Booking app to approve or deny this request.
          </div>
        </div>
      </div>`;
  } else if (data.type === 'confirmation') {
    to = data.rep_email;
    subject = `✅ Van Booking Confirmed — ${data.account} | ${data.location} | ${data.demo_start_date}`;
    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#059669;padding:16px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">Booking Confirmed!</h2>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <p style="font-size:14px;color:#111827;">Hi ${data.rep_name},</p>
          <p style="font-size:14px;color:#111827;">Your demo van booking has been confirmed:</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
            <tr><td style="padding:8px 0;color:#6B7280;width:140px;"><strong>Account</strong></td><td style="padding:8px 0;font-weight:700;">${data.account}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280;"><strong>Location</strong></td><td style="padding:8px 0;">${data.location}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280;"><strong>Dates</strong></td><td style="padding:8px 0;">${data.demo_start_date} (${data.duration_days} day${data.duration_days > 1 ? 's' : ''})</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280;"><strong>Demo Types</strong></td><td style="padding:8px 0;">${(data.demo_types || []).join(', ')}</td></tr>
            ${data.coordinator_notes ? '<tr><td style="padding:8px 0;color:#6B7280;"><strong>Coordinator Notes</strong></td><td style="padding:8px 0;">'+data.coordinator_notes+'</td></tr>' : ''}
          </table>
          <div style="margin-top:20px;padding:12px 16px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:6px;font-size:13px;color:#065F46;">
            Yannick will be in touch to align on demo strategy before the visit.
          </div>
        </div>
      </div>`;
  } else {
    return { statusCode: 400, body: 'Unknown notification type' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Demo Van Booking <onboarding@resend.dev>',
        to: to,
        subject: subject,
        html: html
      })
    });

    const result = await response.json();
    return { statusCode: response.ok ? 200 : 500, body: JSON.stringify(result) };
  } catch (error) {
    console.error('Email send failed:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
