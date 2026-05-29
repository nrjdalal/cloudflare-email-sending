import { sValidator } from "@hono/standard-validator"
import { Hono } from "hono"
import { z } from "zod"

import { aliasSchema, attachmentSchema, type EmailAddress, emailSchema, type Env } from "@/env"
import { bearerAuth } from "@/middlewares"

const recipients = z.union([emailSchema, z.array(emailSchema).min(1)])

const count = (value?: string | string[]) =>
  value === undefined ? 0 : Array.isArray(value) ? value.length : 1

const sendSchema = z
  .object({
    from_alias: aliasSchema,
    from_name: z.string().optional(),
    to: recipients,
    cc: recipients.optional(),
    bcc: recipients.optional(),
    reply_to: emailSchema.optional(),
    subject: z.string().min(1),
    text: z.string().optional(),
    html: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    attachments: z.array(attachmentSchema).max(32).optional(),
  })
  .refine((body) => Boolean(body.text || body.html), {
    message: "one of text or html is required",
    path: ["text"],
  })
  .refine(
    (body) => {
      const total = count(body.to) + count(body.cc) + count(body.bcc)
      return total >= 1 && total <= 50
    },
    { message: "recipient count must be between 1 and 50", path: ["to"] },
  )

export const sendRouter = new Hono<{ Bindings: Env }>().post(
  "/send",
  bearerAuth,
  sValidator("json", sendSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request payload",
            issues: result.error,
          },
        },
        400,
      )
    }
  }),
  async (c) => {
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
    } = c.req.valid("json")

    const from: EmailAddress | string = from_name
      ? { email: `${from_alias}@${c.env.DOMAIN}`, name: from_name }
      : `${from_alias}@${c.env.DOMAIN}`

    try {
      const result = await c.env.EMAIL.send({
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
      return c.json({ data: { from, to, messageId: result.messageId } })
    } catch (err) {
      const { code, message } = err as { code?: string; message?: string }
      return c.json({ error: { code: code ?? "SEND_FAILED", message } }, 502)
    }
  },
)
