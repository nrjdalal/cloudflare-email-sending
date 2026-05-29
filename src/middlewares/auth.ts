import { createMiddleware } from "hono/factory"

import type { Env } from "@/env"

export const bearerAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const secret = c.env.EMAIL_SENDING

  if (!secret || c.req.header("authorization") !== `Bearer ${secret}`) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, 401)
  }

  return next()
})
