import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createPool, route, sendJson } = require("../server/index.cjs");

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = createPool().catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }
  return poolPromise;
}

export default async function handler(req, res) {
  try {
    if (req.url && !req.url.startsWith("/api/")) {
      req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
    }
    const pool = await getPool();
    return await route(pool, req, res);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message = statusCode >= 500 ? `MySQL API error: ${error.message}` : error.message;
    console.error("Vercel CDR API error:", error);
    return sendJson(res, statusCode, { error: message });
  }
}
