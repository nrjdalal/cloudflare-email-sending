import { z } from "zod"

export const aliasSchema = z.string().regex(/^[a-z0-9._-]+$/i)

export const emailSchema = z.email()

export const emailAddressSchema = z.object({
  email: emailSchema,
  name: z.string().optional(),
})
export type EmailAddress = z.infer<typeof emailAddressSchema>

export const addressSchema = z.union([emailSchema, emailAddressSchema])

export const recipientSchema = z.union([addressSchema, z.array(addressSchema).min(1)])

export const attachmentSchema = z.object({
  content: z.union([z.string(), z.instanceof(ArrayBuffer)]),
  filename: z.string(),
  type: z.string(),
  disposition: z.enum(["attachment", "inline"]),
  contentId: z.string().optional(),
})
export type Attachment = z.infer<typeof attachmentSchema>

export const messageSchema = z.object({
  to: recipientSchema,
  from: addressSchema,
  subject: z.string(),
  html: z.string().optional(),
  text: z.string().optional(),
  cc: recipientSchema.optional(),
  bcc: recipientSchema.optional(),
  replyTo: addressSchema.optional(),
  attachments: z.array(attachmentSchema).optional(),
  headers: z.record(z.string(), z.string()).optional(),
})
export type EmailMessageBuilder = z.infer<typeof messageSchema>

export const sendResultSchema = z.object({
  messageId: z.string(),
})
export type EmailSendResult = z.infer<typeof sendResultSchema>

// EmailBinding is a live host object with a method — z.function exists to wrap
// implementations via .implement(), not to model an external method in .parse(),
// and c.env is injected by the runtime (never deserialized), so there is no
// parse boundary. EmailBinding and Env stay hand-written types.
export type EmailBinding = {
  send(message: EmailMessageBuilder): Promise<EmailSendResult>
}

export type Env = {
  EMAIL: EmailBinding
  DOMAIN: string
  EMAIL_SENDING: string
}
