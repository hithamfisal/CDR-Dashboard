import { createRequire } from "module";

const require = createRequire(import.meta.url);
const loadedServerModule = require("../server/index.cjs");
const serverModule =
  loadedServerModule && loadedServerModule.default && typeof loadedServerModule.default === "object"
    ? loadedServerModule.default
    : loadedServerModule;

const createPool = serverModule.createPool;
const route = serverModule.route;
const sendJson =
  typeof serverModule.sendJson === "function"
    ? serverModule.sendJson
    : (res, statusCode, payload) => {
        res.statusCode = statusCode;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify(payload));
      };

let poolPromise;

function assertApiModule() {
  if (typeof createPool !== "function" || typeof route !== "function") {
    const exportedKeys = Object.keys(serverModule || {}).join(", ") || "none";
    const error = new Error(
      `CDR API module export error. Expected createPool() and route() from server/index.cjs. Exported keys: ${exportedKeys}`,
    );
    error.statusCode = 500;
    throw error;
  }
}

function getPool() {
  assertApiModule();
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
