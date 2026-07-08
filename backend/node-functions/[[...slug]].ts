import app from "../dist/index.mjs"

export async function onRequest(ctx) {
  return app.fetch(ctx.request)
}

export default { fetch(request) { return app.fetch(request) } }
