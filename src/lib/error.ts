import type { Context } from "hono"
import { z } from "zod"

export const errorHandler = (err: Error, c: Context) => {
  if (err instanceof z.ZodError) {
    return c.json(
      {
        error: { code: "VALIDATION_ERROR", message: "Invalid request payload", issues: err.issues },
      },
      400,
    )
  }

  return c.json({ error: { code: "INTERNAL_SERVER_ERROR", message: err.message } }, 500)
}
