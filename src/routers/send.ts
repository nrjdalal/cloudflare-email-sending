import { sValidator } from "@hono/standard-validator"
import { Hono } from "hono"
import { z } from "zod"

import {
  aliasSchema,
  attachmentSchema,
  type EmailAddress,
  emailSchema,
  type Env,
  recipientSchema,
} from "@/env"
import { bearerAuth } from "@/middlewares"

const count = (value?: unknown) =>
  value === undefined ? 0 : Array.isArray(value) ? value.length : 1

const sendSchema = z
  .object({
    to: recipientSchema,
    from_alias: aliasSchema,
    from_name: z.string().optional(),
    subject: z.string().min(1),
    html: z.string().optional(),
    text: z.string().optional(),
    cc: recipientSchema.optional(),
    bcc: recipientSchema.optional(),
    reply_to: emailSchema.optional(),
    attachments: z.array(attachmentSchema).max(32).optional(),
    headers: z.record(z.string(), z.string()).optional(),
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
      to,
      from_alias,
      from_name,
      subject,
      html,
      text,
      cc,
      bcc,
      reply_to,
      attachments,
      headers,
    } = c.req.valid("json")

    const from: EmailAddress | string = from_name
      ? { email: `${from_alias}@${c.env.DOMAIN}`, name: from_name }
      : `${from_alias}@${c.env.DOMAIN}`

    try {
      const result = await c.env.EMAIL.send({
        to,
        from,
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
        ...(cc ? { cc } : {}),
        ...(bcc ? { bcc } : {}),
        ...(reply_to ? { replyTo: reply_to } : {}),
        ...(attachments ? { attachments } : {}),
        ...(headers ? { headers } : {}),
      })
      return c.json({ data: { from, to, messageId: result.messageId } })
    } catch (err) {
      const { code, message } = err as { code?: string; message?: string }
      return c.json({ error: { code: code ?? "SEND_FAILED", message } }, 502)
    }
  },
)
