const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { visitorName, visitorEmail, body, conversationId } = await request.json();
    if (typeof visitorName !== 'string' || typeof body !== 'string' || !visitorName.trim() || !body.trim()) {
      return new Response(JSON.stringify({ error: 'Visitor name and message are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const notificationEmail = Deno.env.get('ADMIN_NOTIFICATION_EMAIL') || 'emilehitayezu@gmail.com';
    const senderEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'notifications@rwandasmart.org';
    if (!resendApiKey || !notificationEmail || !senderEmail) {
      throw new Error('Email notification secrets are not configured.');
    }

    const safeName = escapeHtml(visitorName.trim());
    const safeEmail = escapeHtml(typeof visitorEmail === 'string' ? visitorEmail.trim() : '');
    const safeBody = escapeHtml(body.trim());
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [notificationEmail],
        subject: `New chatbot inquiry from ${visitorName.trim()}`,
        text: [
          'Someone needs to communicate with Rwanda Smart Systems.',
          `Name: ${visitorName.trim()}`,
          `Email: ${typeof visitorEmail === 'string' && visitorEmail.trim() ? visitorEmail.trim() : 'Not provided'}`,
          `Conversation ID: ${conversationId ?? 'Not available'}`,
          '',
          body.trim(),
        ].join('\n'),
        html: `<h2>New chatbot inquiry</h2><p>Someone needs to communicate with Rwanda Smart Systems.</p><p><strong>Name:</strong> ${safeName}<br><strong>Email:</strong> ${safeEmail || 'Not provided'}<br><strong>Conversation ID:</strong> ${conversationId ?? 'Not available'}</p><p>${safeBody.replaceAll('\n', '<br>')}</p>`,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Resend rejected the email: ${details}`);
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unable to send inquiry email:', error);
    return new Response(JSON.stringify({ error: 'Unable to send inquiry email.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
