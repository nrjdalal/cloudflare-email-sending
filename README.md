# Cloudflare Email Sending

Cloudflare Worker that sends emails from `<alias>@nrjdalal.com` to arbitrary recipients via [Cloudflare Email Service](https://developers.cloudflare.com/email-service/).

Deployed to: `https://cloudflare-email-sending.nd941z.workers.dev/send`

## How it works

- Worker binds `env.EMAIL` to Cloudflare Email Service via `[[send_email]]` in `wrangler.toml`.
- `POST /send` is gated by a `Bearer` shared secret (`EMAIL_SENDING`).
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

# Update DOMAIN in wrangler.toml to your onboarded domain, then deploy
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

Response: `{ "ok": true, "from": "notes@nrjdalal.com", "to": "recipient@example.com" }`.

## Request schema

| field        | type                      | required         |
| ------------ | ------------------------- | ---------------- |
| `from_alias` | `string` (`[a-z0-9._-]+`) | yes              |
| `to`         | `string \| string[]`      | yes (max 50)     |
| `subject`    | `string`                  | yes              |
| `text`       | `string`                  | one of text/html |
| `html`       | `string`                  | one of text/html |

## Local dev

```bash
bun run dev   # wrangler dev — note: Email Service does not deliver from local
bun run tail  # stream production logs
```

## License

MIT
