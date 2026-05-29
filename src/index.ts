import { Hono } from "hono"

import type { Env } from "@/env"
import { errorHandler } from "@/lib/error"
import { sendRouter } from "@/routers"

const app = new Hono<{ Bindings: Env }>()

app.onError(errorHandler)
app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, 404))

const routes = app.route("/", sendRouter)

export type AppType = typeof routes

export default app
