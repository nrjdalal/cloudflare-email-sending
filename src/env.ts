export interface EmailAddress {
  email: string
  name?: string
}

export interface Attachment {
  content: string | ArrayBuffer
  filename: string
  type: string
  disposition: "attachment" | "inline"
  contentId?: string
}

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
