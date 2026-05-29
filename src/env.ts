import { z } from "zod"

export const aliasSchema = z.string().regex(/^[a-z0-9._-]+$/i)

export const emailSchema = z.email()

export const emailAddressSchema = z.object({
  email: emailSchema,
  name: z.string().optional(),
})
export type EmailAddress = z.infer<typeof emailAddressSchema>

export const recipientSchema = z.union([
  emailSchema,
  emailAddressSchema,
  z.array(z.union([emailSchema, emailAddressSchema])).min(1),
])

export const attachmentSchema = z.object({
  content: z.union([z.string(), z.instanceof(ArrayBuffer)]),
  filename: z.string(),
  type: z.string(),
  disposition: z.enum(["attachment", "inline"]),
  contentId: z.string().optional(),
})
export type Attachment = z.infer<typeof attachmentSchema>

export type EmailMessageBuilder = {
  to: string | EmailAddress | (string | EmailAddress)[]
  from: string | EmailAddress
  subject: string
  html?: string
  text?: string
  cc?: string | EmailAddress | (string | EmailAddress)[]
  bcc?: string | EmailAddress | (string | EmailAddress)[]
  replyTo?: string | EmailAddress
  attachments?: Attachment[]
  headers?: Record<string, string>
}

export type EmailSendResult = {
  messageId: string
}

export type EmailBinding = {
  send(message: EmailMessageBuilder): Promise<EmailSendResult>
}

export type Env = {
  EMAIL: EmailBinding
  DOMAIN: string
  EMAIL_SENDING: string
}
