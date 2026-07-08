import app from "../dist/index.mjs"

export default async function onRequest(ctx: { request: Request }): Promise<Response> {
  return app.fetch(ctx.request)
}
