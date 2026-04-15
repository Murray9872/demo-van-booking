// Vercel serverless function for email notifications
// Requires RESEND_API_KEY environment variable in Vercel dashboard
// Free tier at resend.com — 100 emails/day

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured — skipping email');
    return res.status(200).json({ skipped: true, reason: 'No API key configured' });
  }

  const data = req.body;
  if (!data || !data.to) {
    return res.status(400).json({ error: 'Missing "to" field' });
  }

  let subject, html;
  const RED = '#E8192C';
  const GREEN = '#059669';
  const AMBER = '#D97706';

  const header = (color, title) => `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:${color};padding:16px 24px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">${title}</h2>
      </div>
      <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 8px 8px;">`;

  const footer = `</div></div>`;
  const row = (label, value) => value ? `<tr><td style="padding:8px 0;color:#6B7280;width:140px;"><strong>${label}</strong></td><td style="padding:8px 0;">${value}</td></tr>` : '';
  const dur = (d) => d < 1 ? 'Half day' : d + ' day' + (d > 1 ? 's' : '');

  if (data.type === 'new_request') {
    subject = `🚐 New Van Booking Request — ${data.account} | ${data.location} | ${data.demo_start_date}`;
    html = header(RED, 'New Van Booking Request') + `
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${row('Rep Name', data.rep_name)}
          ${row('Rep Email', data.rep_email)}
          ${row('Account', '<strong>' + data.account + '</strong>')}
          ${row('Location', data.location)}
          ${row('Start Date', data.demo_start_date)}
          ${row('Duration', dur(data.duration_days))}
          ${row('Demo Types', (data.demo_types || []).join(', '))}
          ${row('Notes', data.notes)}
        </table>
        <div style="margin-top:20px;padding:12px 16px;background:#F3F4F6;border-radius:6px;font-size:13px;color:#4B5563;">
          Log in to the Demo Van Booking app to approve or deny this request.
        </div>
      ${footer}`;

  } else if (data.type === 'confirmation') {
    subject = `✅ Van Booking Confirmed — ${data.account} | ${data.location} | ${data.demo_start_date}`;
    html = header(GREEN, 'Booking Confirmed!') + `
        <p style="font-size:14px;color:#111827;">Hi ${data.rep_name},</p>
        <p style="font-size:14px;color:#111827;margin-top:8px;">Your demo van booking has been confirmed:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
          ${row('Account', '<strong>' + data.account + '</strong>')}
          ${row('Location', data.location)}
          ${row('Dates', data.demo_start_date + ' (' + dur(data.duration_days) + ')')}
          ${row('Demo Types', (data.demo_types || []).join(', '))}
          ${row('Coordinator Notes', data.coordinator_notes)}
        </table>
        <div style="margin-top:20px;padding:12px 16px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:6px;font-size:13px;color:#065F46;">
          Yannick will be in touch to align on demo strategy before the visit.
        </div>
      ${footer}`;

  } else if (data.type === 'denied') {
    subject = `❌ Van Booking Cancelled — ${data.account} | ${data.location}`;
    html = header('#991B1B', 'Booking Cancelled') + `
        <p style="font-size:14px;color:#111827;">Hi ${data.rep_name},</p>
        <p style="font-size:14px;color:#111827;margin-top:8px;">Your demo van booking has been cancelled:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
          ${row('Account', '<strong>' + data.account + '</strong>')}
          ${row('Location', data.location)}
          ${row('Dates', data.demo_start_date + ' (' + dur(data.duration_days) + ')')}
          ${row('Coordinator Notes', data.coordinator_notes)}
        </table>
        <div style="margin-top:20px;padding:12px 16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:6px;font-size:13px;color:#991B1B;">
          Please reach out to the coordinator if you have questions or want to reschedule.
        </div>
      ${footer}`;

  } else if (data.type === 'hold') {
    subject = `⏸️ Van Booking On Hold — ${data.account} | ${data.location}`;
    html = header(AMBER, 'Booking On Hold') + `
        <p style="font-size:14px;color:#111827;">Hi ${data.rep_name},</p>
        <p style="font-size:14px;color:#111827;margin-top:8px;">Your demo van booking has been placed on hold:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
          ${row('Account', '<strong>' + data.account + '</strong>')}
          ${row('Location', data.location)}
          ${row('Dates', data.demo_start_date + ' (' + dur(data.duration_days) + ')')}
          ${row('Coordinator Notes', data.coordinator_notes)}
        </table>
        <div style="margin-top:20px;padding:12px 16px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:6px;font-size:13px;color:#92400E;">
          The coordinator will follow up with you on next steps.
        </div>
      ${footer}`;

  } else {
    return res.status(400).json({ error: 'Unknown notification type: ' + data.type });
  }

  const recipients = Array.isArray(data.to) ? data.to : [data.to];

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Demo Van Booking <onboarding@resend.dev>',
        to: recipients,
        subject: subject,
        html: html
      })
    });

    const result = await response.json();
    console.log('Email result:', JSON.stringify(result));
    return res.status(response.ok ? 200 : 500).json(result);
  } catch (error) {
    console.error('Email send failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
