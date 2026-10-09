// functions/api/contact.ts

export interface Env {
  RESEND_API_KEY: string
  CONTACT_RECIPIENT_EMAIL?: string
  CONTACT_FROM_EMAIL?: string
}

const POST_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: POST_CORS_HEADERS,
  })
}

export async function onRequestPost(context: { env: Env; request: Request }): Promise<Response> {
  const { env, request } = context
  const headers = {
    ...POST_CORS_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
  }

  if (!env.RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration: RESEND_API_KEY missing' }),
      { status: 500, headers }
    )
  }

  try {
    const body = (await request.json()) as {
      name?: string
      email?: string
      subject?: string
      message?: string
      privacy_consent?: boolean
      _hp?: string // Spam honeypot
    }

    if (body._hp) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers })
    }

    const name = body.name?.trim()
    const email = body.email?.trim()
    const subject = body.subject?.trim() || 'General Question'
    const message = body.message?.trim()

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Please provide name, email, and message.' }),
        { status: 400, headers }
      )
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address.' }),
        { status: 400, headers }
      )
    }

    let recipient = (env.CONTACT_RECIPIENT_EMAIL || '').trim()
    const recipientMatch = recipient.match(/<([^>]+)>/)
    if (recipientMatch) {
      recipient = recipientMatch[1].trim()
    }
    if (!recipient || !recipient.includes('@')) {
      recipient = 'support@memecapsule.wtf'
    }

    let fromAddress = (env.CONTACT_FROM_EMAIL || '').trim()
    const emailMatch = fromAddress.match(/<([^>]+)>/)
    if (emailMatch) {
      const emailOnly = emailMatch[1].trim()
      const namePart = fromAddress.replace(/<[^>]+>/, '').trim()
      fromAddress = namePart ? `${namePart} <${emailOnly}>` : `Meme Capsule <${emailOnly}>`
    } else if (fromAddress.includes('@')) {
      fromAddress = `Meme Capsule <${fromAddress}>`
    } else {
      fromAddress = 'Meme Capsule <onboarding@resend.dev>'
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [recipient],
        reply_to: email,
        subject: `[Meme Capsule Inquiry] ${subject} - from ${name}`,
        html: `
          <div style="font-family: sans-serif; background-color: #131313; color: #e5e2e1; padding: 24px; border: 2px solid #9b30ff;">
            <h2 style="color: #f4c300; margin-top: 0; text-transform: uppercase;">New Support Message</h2>
            <p><strong>From:</strong> ${escapeHtml(name)} (&lt;${escapeHtml(email)}&gt;)</p>
            <p><strong>Category:</strong> ${escapeHtml(subject)}</p>
            <div style="background-color: #1c1b1b; border-left: 4px solid #dd0061; padding: 16px; margin: 20px 0; white-space: pre-wrap; font-size: 15px;">
              ${escapeHtml(message)}
            </div>
            <p style="font-size: 12px; color: #888;">Submitted via memecapsule.wtf contact form.</p>
          </div>
        `,
      }),
    })

    const resendData = (await resendRes.json()) as any

    if (!resendRes.ok) {
      const errorMsg =
        resendData?.message ||
        resendData?.error?.message ||
        (typeof resendData?.error === 'string' ? resendData.error : '') ||
        'Failed to dispatch email via Resend'
      return new Response(
        JSON.stringify({ error: errorMsg, details: resendData }),
        { status: resendRes.status, headers }
      )
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers,
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal server error processing contact submission' }),
      { status: 500, headers }
    )
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
