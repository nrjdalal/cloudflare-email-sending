import { z } from "zod"

export const aliasSchema = z.string().regex(/^[a-z0-9._-]+$/i)

export const emailSchema = z.email()

export const emailAddressSchema = z.object({
  email: emailSchema,
  name: z.string().optional(),
})
export type EmailAddress = z.infer<typeof emailAddressSchema>

export const attachmentSchema = z.object({
  content: z.union([z.string(), z.instanceof(ArrayBuffer)]),
  filename: z.string(),
  type: z.string(),
  disposition: z.enum(["attachment", "inline"]),
  contentId: z.string().optional(),
})
export type Attachment = z.infer<typeof attachmentSchema>

export interface EmailMessageBuilder {
  to: string | string[] | EmailAddress | EmailAddress[]
  from: string | EmailAddress
  subject: string
  text?: string
  html?: string
  cc?: string | string[] | EmailAddress | EmailAddress[]
  bcc?: string | string[] | EmailAddress | EmailAddress[]
  replyTo?: string | EmailAddress
  headers?: Record<string, string>
  attachments?: Attachment[]
}

export interface EmailSendResult {
  messageId: string
}

export interface EmailBinding {
  send(message: EmailMessageBuilder): Promise<EmailSendResult>
}

export interface Env {
  EMAIL: EmailBinding
  DOMAIN: string
  EMAIL_SENDING: string
}
