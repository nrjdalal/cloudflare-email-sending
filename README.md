# Cloudflare Email Sending

Cloudflare Worker that sends emails from `<alias>@nrjdalal.com` to arbitrary recipients via [Cloudflare Email Service](https://developers.cloudflare.com/email-service/).

Deployed to: `https://cloudflare-email-sending.nd941z.workers.dev/send`

## How it works

- Built on [Hono](https://hono.dev) with `zod` + `@hono/standard-validator` for request validation.
- Worker binds `env.EMAIL` to Cloudflare Email Service via `send_email` in `wrangler.jsonc`.
- `POST /send` is gated by a `Bearer` shared secret (`EMAIL_SENDING`) via middleware.
- The Worker interpolates `<from_alias>@nrjdalal.com` server-side — callers cannot spoof the domain.
- SPF, DKIM, and DMARC are auto-configured by Cloudflare on the onboarded domain.

## Prerequisites

1. **Domain onboarded to Email Service** — Cloudflare Dashboard → **Compute > Email Service > Email Sending** → **Onboard Domain** → pick your domain → let Cloudflare add the SPF / DKIM / MX records. Wait for all records to show **Locked** (5–15 min for DNS propagation).
2. **Workers Paid plan** — required to send to arbitrary recipients. The free tier is restricted to verified Email Routing destinations only.

## Setup

```bash
bun install

bunx wrangler login

# Set the shared bearer secret used by clients
printf %s 'your-long-random-secret' | bunx wrangler secret put EMAIL_SENDING

# Update DOMAIN in wrangler.jsonc to your onboarded domain, then deploy
bun run deploy
```

## Send

```bash
curl -X POST https://cloudflare-email-sending.nd941z.workers.dev/send \
  -H "Authorization: Bearer $EMAIL_SENDING" \
  -H "Content-Type: application/json" \
  -d '{
    "from_alias": "notes",
    "to": "recipient@example.com",
    "subject": "test",
    "text": "hello from cloudflare email service"
  }'
```

Success: `{ "data": { "from": "notes@nrjdalal.com", "to": "recipient@example.com", "messageId": "..." } }`.

Errors return `{ "error": { "code": "...", "message": "..." } }`:

- `UNAUTHORIZED` (401) — missing or wrong bearer token
- `VALIDATION_ERROR` (400) — invalid payload; includes `issues[]` from the schema
- `INVALID_MESSAGE` (500) — server-built message failed validation (e.g. misconfigured `DOMAIN`)
- `SEND_FAILED` (502) — Email Service rejected the send; `code` mirrors the upstream error code
- `INVALID_UPSTREAM_RESPONSE` (502) — Email Service returned an unexpected response shape
- `NOT_FOUND` (404) — unknown route

## Request schema

Fields follow the [Cloudflare Email Service](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/) message order (`from` is built server-side from `from_alias`/`from_name`).

| field         | type                              | required                    |
| ------------- | --------------------------------- | --------------------------- |
| `to`          | `string \| EmailAddress \| (…)[]` | yes (max 50 total)          |
| `from_alias`  | `string` (`[a-z0-9._-]+`)         | no (default `admin`)        |
| `from_name`   | `string`                          | no (default `Neeraj Dalal`) |
| `subject`     | `string`                          | yes                         |
| `html`        | `string`                          | one of html/text            |
| `text`        | `string`                          | one of html/text            |
| `cc`          | `string \| EmailAddress \| (…)[]` | no                          |
| `bcc`         | `string \| EmailAddress \| (…)[]` | no                          |
| `reply_to`    | `string`                          | no                          |
| `attachments` | `Attachment[]`                    | no (max 32)                 |
| `headers`     | `Record<string, string>`          | no                          |

`EmailAddress` is `{ email: string, name?: string }`. `Attachment` is `{ content, filename, type, disposition, contentId? }`, where `content` is a base64-encoded string and `disposition` is `"attachment" | "inline"`.

## Project structure

```
src/
  index.ts            # Hono app: onError, notFound, mounts the router
  env.ts              # zod schemas (single source of truth) + inferred types + runtime binding types
  lib/error.ts        # error handler (ZodError → VALIDATION_ERROR)
  middlewares/auth.ts # bearer-token auth
  routers/send.ts     # POST /send — validates the request, builds + sends the message
```

## Local dev

```bash
bun run dev   # wrangler dev — the send_email binding is remote (remote: true), so env.EMAIL.send() delivers real email even when running locally
bun run tail  # stream production logs
```

## License

MIT
