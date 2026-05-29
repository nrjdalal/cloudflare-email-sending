interface EmailAddress {
  email: string
  name?: string
}

interface Attachment {
  content: string | ArrayBuffer
  filename: string
  type: string
  disposition: "attachment" | "inline"
  contentId?: string
}

interface EmailMessageBuilder {
  to: string | string[]
  from: string | EmailAddress
  subject: string
  text?: string
  html?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string | EmailAddress
  headers?: Record<string, string>
  attachments?: Attachment[]
}

interface EmailSendResult {
  messageId: string
}

interface EmailBinding {
  send(message: EmailMessageBuilder): Promise<EmailSendResult>
}

interface Env {
  EMAIL: EmailBinding
  DOMAIN: string
  EMAIL_SENDING: string
}

interface SendBody {
  from_alias: string
  from_name?: string
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  reply_to?: string
  subject: string
  text?: string
  html?: string
  headers?: Record<string, string>
  attachments?: Attachment[]
}

const ALIAS_PATTERN = /^[a-z0-9._-]+$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

const toList = (value?: string | string[]) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value]

const validAddresses = (value?: string | string[]) =>
  toList(value).every((addr) => typeof addr === "string" && EMAIL_PATTERN.test(addr))

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (req.method !== "POST" || url.pathname !== "/send") {
      return json({ error: "not_found" }, 404)
    }

    if (req.headers.get("authorization") !== `Bearer ${env.EMAIL_SENDING}`) {
      return json({ error: "unauthorized" }, 401)
    }

    let body: SendBody
    try {
      body = (await req.json()) as SendBody
    } catch {
      return json({ error: "invalid_json" }, 400)
    }

    const {
      from_alias,
      from_name,
      to,
      cc,
      bcc,
      reply_to,
      subject,
      text,
      html,
      headers,
      attachments,
    } = body

    if (!from_alias || !to || !subject || (!text && !html)) {
      return json(
        { error: "missing_fields", required: ["from_alias", "to", "subject", "text|html"] },
        400,
      )
    }
    if (!ALIAS_PATTERN.test(from_alias)) {
      return json({ error: "invalid_from_alias" }, 400)
    }

    // Email Service caps total recipients at 50 across to + cc + bcc.
    const recipientCount = toList(to).length + toList(cc).length + toList(bcc).length
    if (recipientCount === 0 || recipientCount > 50) {
      return json({ error: "invalid_recipient_count", max: 50 }, 400)
    }
    if (!validAddresses(to) || !validAddresses(cc) || !validAddresses(bcc)) {
      return json({ error: "invalid_recipient_address" }, 400)
    }
    if (reply_to && !EMAIL_PATTERN.test(reply_to)) {
      return json({ error: "invalid_reply_to" }, 400)
    }

    const from: EmailAddress | string = from_name
      ? { email: `${from_alias}@${env.DOMAIN}`, name: from_name }
      : `${from_alias}@${env.DOMAIN}`

    try {
      const result = await env.EMAIL.send({
        to,
        from,
        subject,
        ...(text ? { text } : {}),
        ...(html ? { html } : {}),
        ...(cc ? { cc } : {}),
        ...(bcc ? { bcc } : {}),
        ...(reply_to ? { replyTo: reply_to } : {}),
        ...(headers ? { headers } : {}),
        ...(attachments ? { attachments } : {}),
      })
      return json({ ok: true, from, to, messageId: result.messageId })
    } catch (err) {
      const { code, message } = err as { code?: string; message?: string }
      return json({ error: "send_failed", ...(code ? { code } : {}), message }, 502)
    }
  },
}
