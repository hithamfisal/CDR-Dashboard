/*
  CDR Dashboard MySQL API
  Stores login users, permissions and interface branding/settings in MySQL.
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const mysql = require("mysql2/promise");

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = trimmed.indexOf("=");
    if (equals < 0) continue;
    const key = trimmed.slice(0, equals).trim();
    const value = trimmed.slice(equals + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const PORT = Number(process.env.CDR_API_PORT || process.env.PORT || 4100);
const DB_HOST = process.env.MYSQL_HOST || "127.0.0.1";
const DB_PORT = Number(process.env.MYSQL_PORT || 3306);
const DB_USER = process.env.MYSQL_USER || "root";
const DB_PASSWORD = process.env.MYSQL_PASSWORD || "";
const DB_NAME = process.env.MYSQL_DATABASE || "cdr_dashboard";
const DEFAULT_ALLOWED_ORIGINS = [
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5177",
  "http://127.0.0.1:5178",
  "http://127.0.0.1:5188",
  "http://localhost:5173",
  "http://localhost:5177",
  "http://localhost:5178",
  "http://localhost:5188",
];
const ALLOW_ORIGINS = String(process.env.CDR_ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGINS.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const SESSION_TTL_MS = Number(process.env.CDR_SESSION_TTL_HOURS || 8) * 60 * 60 * 1000;
const SESSION_SECRET = getSessionSecret();
const SCRYPT_PREFIX = "scrypt";
const SCRYPT_PARAMS = { keyLength: 64, cost: 16384, blockSize: 8, parallelization: 1 };
const SEED_DEFAULT_USERS = process.env.CDR_SEED_DEFAULT_USERS === "1";
const MIN_PASSWORD_LENGTH = 12;
const REPORT_SETTINGS_PATH = path.join(process.cwd(), ".cdr-report-settings.json");
const REPORT_ALLOWED_EXTENSIONS = new Set([".csv", ".pdf", ".png", ".pptx", ".xlsx"]);
const REPORT_MAX_FILE_BYTES = Number(process.env.CDR_MAX_REPORT_FILE_BYTES || 80 * 1024 * 1024);

const DEFAULT_SETTINGS = {
  companyName: "CDR Traffic Intelligence",
  adminPortalTitle: "Traffic Workbook Admin",
  adminPortalDescription:
    "System Admin access: upload CDR/Raw files, manage fleetmaps, continue saved data, modify credentials and adjust Admin Settings.",
  customerPortalTitle: "CDR Customer View",
  customerPortalDescription:
    "Customer access: upload sheets, load sample data, continue previous workbooks, view all dashboard tabs and use fleetmap files. Admin Settings and system admin controls are hidden.",
  dashboardHeaderTitle: "CDR Traffic Intelligence Analyzer",
  dashboardHeaderDescription: "CALL DETAIL RECORD ANALYTICS - LIVE INSIGHTS",
  leftLogoName: "Left Logo",
  leftLogoDataUrl: "",
  rightLogoName: "Right Logo",
  rightLogoDataUrl: "",
  uploadHeroImageName: "Upload Page Picture",
  uploadHeroImageDataUrl: "",
  radioShowcaseImageName: "Radio Showcase Picture",
  radioShowcaseImageDataUrl: "",
  defaultTheme: "proposal3",
  showSampleDataButton: true,
  headerLogoSize: 66,
  headerTitleScale: 1,
  compactDashboardLayout: false,
  supportEmail: "support@example.com",
  supportPhone: "+966 000 000 000",
  primaryColor: "#2563eb",
};

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function getSeedUsers() {
  const users = [
    {
      role: "admin",
      username: process.env.CDR_DEFAULT_ADMIN_USERNAME || "admin",
      password: process.env.CDR_DEFAULT_ADMIN_PASSWORD || "",
    },
    {
      role: "customerAdmin",
      username: process.env.CDR_DEFAULT_CUSTOMER_ADMIN_USERNAME || "customeradmin",
      password: process.env.CDR_DEFAULT_CUSTOMER_ADMIN_PASSWORD || "",
    },
    {
      role: "customer",
      username: process.env.CDR_DEFAULT_CUSTOMER_USERNAME || "customer",
      password: process.env.CDR_DEFAULT_CUSTOMER_PASSWORD || "",
    },
  ];

  for (const user of users) {
    if (!user.username || user.password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `CDR_SEED_DEFAULT_USERS=1 requires ${user.role} seed username and a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }
  }

  return users;
}

function getSessionSecret() {
  const secret = String(process.env.CDR_SESSION_SECRET || "").trim();
  const weakPlaceholders = new Set(["", "change-this-to-a-long-random-production-secret", "replace-with-a-long-random-secret"]);
  if (!weakPlaceholders.has(secret) && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("CDR_SESSION_SECRET must be set to a unique random value of at least 32 characters in production.");
  }

  return sha256(`${DB_USER}:${DB_PASSWORD}:${DB_HOST}:${DB_PORT}:${DB_NAME}:cdr-session-secret`);
}

function safeEqualHex(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_PARAMS.keyLength, {
    N: SCRYPT_PARAMS.cost,
    r: SCRYPT_PARAMS.blockSize,
    p: SCRYPT_PARAMS.parallelization,
  }).toString("base64url");
  return [
    SCRYPT_PREFIX,
    SCRYPT_PARAMS.cost,
    SCRYPT_PARAMS.blockSize,
    SCRYPT_PARAMS.parallelization,
    salt,
    hash,
  ].join("$");
}

function verifyPassword(password, storedHash) {
  const stored = String(storedHash || "");
  if (stored.startsWith(`${SCRYPT_PREFIX}$`)) {
    const [, cost, blockSize, parallelization, salt, expectedHash] = stored.split("$");
    if (!cost || !blockSize || !parallelization || !salt || !expectedHash) return false;
    const actualHash = crypto.scryptSync(String(password), salt, Buffer.from(expectedHash, "base64url").length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
    });
    const expectedBuffer = Buffer.from(expectedHash, "base64url");
    return actualHash.length === expectedBuffer.length && crypto.timingSafeEqual(actualHash, expectedBuffer);
  }

  if (/^[a-f0-9]{64}$/i.test(stored)) {
    return safeEqualHex(sha256(password), stored);
  }

  return false;
}

function needsPasswordRehash(storedHash) {
  return !String(storedHash || "").startsWith(`${SCRYPT_PREFIX}$`);
}

function quoteIdentifier(value) {
  return `\`${String(value || "").replace(/`/g, "``")}\``;
}

function resolveCorsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || typeof origin !== "string") return ALLOW_ORIGINS[0] || "null";
  if (ALLOW_ORIGINS.includes(origin)) return origin;

  const host = req.headers.host;
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) return origin;
  return null;
}

function toCamelSettings(row) {
  if (!row) return { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() };
  return {
    companyName: row.company_name,
    adminPortalTitle: row.admin_portal_title,
    adminPortalDescription: row.admin_portal_description,
    customerPortalTitle: row.customer_portal_title,
    customerPortalDescription: row.customer_portal_description,
    dashboardHeaderTitle: row.dashboard_header_title,
    dashboardHeaderDescription: row.dashboard_header_description,
    leftLogoName: row.left_logo_name,
    leftLogoDataUrl: row.left_logo_data_url || "",
    rightLogoName: row.right_logo_name,
    rightLogoDataUrl: row.right_logo_data_url || "",
    uploadHeroImageName: row.upload_hero_image_name,
    uploadHeroImageDataUrl: row.upload_hero_image_data_url || "",
    radioShowcaseImageName: row.radio_showcase_image_name || DEFAULT_SETTINGS.radioShowcaseImageName,
    radioShowcaseImageDataUrl: row.radio_showcase_image_data_url || "",
    defaultTheme: row.default_theme || DEFAULT_SETTINGS.defaultTheme,
    showSampleDataButton: row.show_sample_data_button == null ? DEFAULT_SETTINGS.showSampleDataButton : Boolean(row.show_sample_data_button),
    headerLogoSize: Number(row.header_logo_size || DEFAULT_SETTINGS.headerLogoSize),
    headerTitleScale: Number(row.header_title_scale || DEFAULT_SETTINGS.headerTitleScale),
    compactDashboardLayout: row.compact_dashboard_layout == null ? DEFAULT_SETTINGS.compactDashboardLayout : Boolean(row.compact_dashboard_layout),
    supportEmail: row.support_email,
    supportPhone: row.support_phone,
    primaryColor: row.primary_color,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || new Date().toISOString()),
  };
}

function encodeSessionPayload(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signSessionPayload(encodedPayload) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(encodedPayload).digest("base64url");
}

function makeSession(user) {
  const payload = {
    role: user.role,
    username: user.username,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const encodedPayload = encodeSessionPayload(payload);
  return `${encodedPayload}.${signSessionPayload(encodedPayload)}`;
}

function getSession(req) {
  const token = req.headers["x-cdr-session"];
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = signSessionPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature || "");
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload || payload.expiresAt < Date.now()) return null;
    return {
      role: payload.role,
      username: payload.username,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

function requireRole(req, allowedRoles) {
  const session = getSession(req);
  if (!session || !allowedRoles.includes(session.role)) {
    const error = new Error("Not authorized for this MySQL action.");
    error.statusCode = 401;
    throw error;
  }
  return session;
}


async function tryMysql(pool, sql, params) {
  try {
    await pool.query(sql, params);
  } catch (error) {
    const ignored = new Set(["ER_DUP_FIELDNAME", "ER_CANT_DROP_FIELD_OR_KEY", "ER_DUP_KEYNAME"]);
    if (!ignored.has(error.code)) throw error;
  }
}

function toPublicUser(row) {
  return {
    id: Number(row.id),
    role: row.role,
    username: row.username,
    isActive: Boolean(row.is_active),
    failedAttempts: Number(row.failed_attempts || 0),
    lockedUntil: row.locked_until instanceof Date ? row.locked_until.toISOString() : row.locked_until ? String(row.locked_until) : null,
    lastLoginAt: row.last_login_at instanceof Date ? row.last_login_at.toISOString() : row.last_login_at ? String(row.last_login_at) : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ""),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ""),
  };
}

function toAudit(row) {
  return {
    id: Number(row.id),
    username: row.username || "system",
    role: row.role || "system",
    action: row.action,
    details: row.details || "",
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ""),
  };
}

async function readUsers(pool) {
  const [rows] = await pool.query(
    `SELECT id, role, username, is_active, failed_attempts, locked_until, last_login_at, created_at, updated_at
     FROM cdr_users
     ORDER BY FIELD(role, 'admin','customerAdmin','customer'), username ASC, id ASC`,
  );
  return rows.map(toPublicUser);
}

async function writeAudit(pool, session, action, details = "") {
  try {
    await pool.query(
      `INSERT INTO cdr_audit_logs (username, role, action, details)
       VALUES (:username, :role, :action, :details)`,
      {
        username: session?.username || "system",
        role: session?.role || "system",
        action,
        details: typeof details === "string" ? details.slice(0, 1000) : JSON.stringify(details).slice(0, 1000),
      },
    );
  } catch (error) {
    console.warn("Audit log write failed:", error.message);
  }
}

async function createPool() {
  if (process.env.CDR_SKIP_CREATE_DATABASE !== "1") {
    const rootConnection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });
    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(DB_NAME)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    );
    await rootConnection.end();
  }

  const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    namedPlaceholders: true,
  });

  await ensureSchema(pool);
  return pool;
}

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cdr_users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      role ENUM('admin','customerAdmin','customer') NOT NULL,
      username VARCHAR(120) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_cdr_users_role (role),
      UNIQUE KEY uq_cdr_users_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);



  await tryMysql(pool, "ALTER TABLE cdr_users DROP INDEX uq_cdr_users_role");
  await tryMysql(pool, "ALTER TABLE cdr_users MODIFY password_hash VARCHAR(255) NOT NULL");
  await tryMysql(pool, "ALTER TABLE cdr_users ADD COLUMN failed_attempts INT UNSIGNED NOT NULL DEFAULT 0 AFTER is_active");
  await tryMysql(pool, "ALTER TABLE cdr_users ADD COLUMN locked_until TIMESTAMP NULL AFTER failed_attempts");
  await tryMysql(pool, "ALTER TABLE cdr_users ADD COLUMN last_login_at TIMESTAMP NULL AFTER locked_until");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cdr_audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(120) NOT NULL,
      role VARCHAR(40) NOT NULL,
      action VARCHAR(120) NOT NULL,
      details TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_cdr_audit_logs_created_at (created_at),
      KEY idx_cdr_audit_logs_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cdr_app_settings (
      id TINYINT UNSIGNED NOT NULL DEFAULT 1,
      company_name VARCHAR(180) NOT NULL,
      admin_portal_title VARCHAR(220) NOT NULL,
      admin_portal_description TEXT NOT NULL,
      customer_portal_title VARCHAR(220) NOT NULL,
      customer_portal_description TEXT NOT NULL,
      dashboard_header_title VARCHAR(220) NOT NULL,
      dashboard_header_description VARCHAR(300) NOT NULL,
      left_logo_name VARCHAR(255) NOT NULL,
      left_logo_data_url LONGTEXT NULL,
      right_logo_name VARCHAR(255) NOT NULL,
      right_logo_data_url LONGTEXT NULL,
      upload_hero_image_name VARCHAR(255) NOT NULL,
      upload_hero_image_data_url LONGTEXT NULL,
      radio_showcase_image_name VARCHAR(255) NOT NULL DEFAULT 'Radio Showcase Picture',
      radio_showcase_image_data_url LONGTEXT NULL,
      default_theme VARCHAR(32) NOT NULL DEFAULT 'proposal3',
      show_sample_data_button TINYINT(1) NOT NULL DEFAULT 1,
      header_logo_size SMALLINT UNSIGNED NOT NULL DEFAULT 66,
      header_title_scale DECIMAL(4,2) NOT NULL DEFAULT 1.00,
      compact_dashboard_layout TINYINT(1) NOT NULL DEFAULT 0,
      support_email VARCHAR(180) NOT NULL,
      support_phone VARCHAR(80) NOT NULL,
      primary_color VARCHAR(32) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT chk_cdr_app_settings_singleton CHECK (id = 1)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await tryMysql(pool, "ALTER TABLE cdr_app_settings ADD COLUMN radio_showcase_image_name VARCHAR(255) NOT NULL DEFAULT 'Radio Showcase Picture' AFTER upload_hero_image_data_url");
  await tryMysql(pool, "ALTER TABLE cdr_app_settings ADD COLUMN radio_showcase_image_data_url LONGTEXT NULL AFTER radio_showcase_image_name");
  await tryMysql(pool, "ALTER TABLE cdr_app_settings ADD COLUMN default_theme VARCHAR(32) NOT NULL DEFAULT 'proposal3' AFTER radio_showcase_image_data_url");
  await tryMysql(pool, "ALTER TABLE cdr_app_settings ADD COLUMN show_sample_data_button TINYINT(1) NOT NULL DEFAULT 1 AFTER default_theme");
  await tryMysql(pool, "ALTER TABLE cdr_app_settings ADD COLUMN header_logo_size SMALLINT UNSIGNED NOT NULL DEFAULT 66 AFTER show_sample_data_button");
  await tryMysql(pool, "ALTER TABLE cdr_app_settings ADD COLUMN header_title_scale DECIMAL(4,2) NOT NULL DEFAULT 1.00 AFTER header_logo_size");
  await tryMysql(pool, "ALTER TABLE cdr_app_settings ADD COLUMN compact_dashboard_layout TINYINT(1) NOT NULL DEFAULT 0 AFTER header_title_scale");

  if (SEED_DEFAULT_USERS) {
    for (const user of getSeedUsers()) {
      await pool.query(
        `INSERT INTO cdr_users (role, username, password_hash)
         VALUES (:role, :username, :passwordHash)
         ON DUPLICATE KEY UPDATE role = role;`,
        { role: user.role, username: user.username, passwordHash: hashPassword(user.password) },
      );
    }
  }

  await pool.query(
    `INSERT INTO cdr_app_settings (
      id, company_name, admin_portal_title, admin_portal_description,
      customer_portal_title, customer_portal_description,
      dashboard_header_title, dashboard_header_description,
      left_logo_name, left_logo_data_url,
      right_logo_name, right_logo_data_url,
      upload_hero_image_name, upload_hero_image_data_url,
      radio_showcase_image_name, radio_showcase_image_data_url,
      default_theme, show_sample_data_button,
      header_logo_size, header_title_scale, compact_dashboard_layout,
      support_email, support_phone, primary_color
    ) VALUES (
      1, :companyName, :adminPortalTitle, :adminPortalDescription,
      :customerPortalTitle, :customerPortalDescription,
      :dashboardHeaderTitle, :dashboardHeaderDescription,
      :leftLogoName, :leftLogoDataUrl,
      :rightLogoName, :rightLogoDataUrl,
      :uploadHeroImageName, :uploadHeroImageDataUrl,
      :radioShowcaseImageName, :radioShowcaseImageDataUrl,
      :defaultTheme, :showSampleDataButton,
      :headerLogoSize, :headerTitleScale, :compactDashboardLayout,
      :supportEmail, :supportPhone, :primaryColor
    ) ON DUPLICATE KEY UPDATE id = id;`,
    DEFAULT_SETTINGS,
  );
}

async function readSettings(pool) {
  const [rows] = await pool.query("SELECT * FROM cdr_app_settings WHERE id = 1 LIMIT 1");
  return toCamelSettings(rows[0]);
}

async function updateSettings(pool, settings) {
  const next = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  await pool.query(
    `UPDATE cdr_app_settings SET
      company_name = :companyName,
      admin_portal_title = :adminPortalTitle,
      admin_portal_description = :adminPortalDescription,
      customer_portal_title = :customerPortalTitle,
      customer_portal_description = :customerPortalDescription,
      dashboard_header_title = :dashboardHeaderTitle,
      dashboard_header_description = :dashboardHeaderDescription,
      left_logo_name = :leftLogoName,
      left_logo_data_url = :leftLogoDataUrl,
      right_logo_name = :rightLogoName,
      right_logo_data_url = :rightLogoDataUrl,
      upload_hero_image_name = :uploadHeroImageName,
      upload_hero_image_data_url = :uploadHeroImageDataUrl,
      radio_showcase_image_name = :radioShowcaseImageName,
      radio_showcase_image_data_url = :radioShowcaseImageDataUrl,
      default_theme = :defaultTheme,
      show_sample_data_button = :showSampleDataButton,
      header_logo_size = :headerLogoSize,
      header_title_scale = :headerTitleScale,
      compact_dashboard_layout = :compactDashboardLayout,
      support_email = :supportEmail,
      support_phone = :supportPhone,
      primary_color = :primaryColor
    WHERE id = 1;`,
    next,
  );
  return readSettings(pool);
}

async function readJson(req, maxBytes = Number(process.env.CDR_MAX_JSON_BYTES || 15_000_000)) {
  if (req.body != null) {
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
    const parsedBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "");
    if (!parsedBody) return {};
    try {
      return JSON.parse(parsedBody);
    } catch {
      throw Object.assign(new Error("Invalid JSON body."), { statusCode: 400 });
    }
  }

  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error("Invalid JSON body."), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": res.cdrCorsOrigin || ALLOW_ORIGINS[0] || "null",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-CDR-Session",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  sendJson(res, 404, { error: "API route not found." });
}

function isLocalAddress(address) {
  const value = String(address || "").toLowerCase();
  return value === "127.0.0.1"
    || value === "::1"
    || value === "::ffff:127.0.0.1"
    || value.startsWith("127.")
    || value.startsWith("::ffff:127.");
}

function requireLocalReportApi(req) {
  if (process.env.VERCEL || process.env.CDR_DISABLE_LOCAL_REPORT_API === "1") {
    const error = new Error("Local report folder API is not available in this environment.");
    error.statusCode = 404;
    throw error;
  }
  if (!isLocalAddress(req.socket?.remoteAddress)) {
    const error = new Error("Local report folder API only accepts requests from this computer.");
    error.statusCode = 403;
    throw error;
  }
}

function readReportSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(REPORT_SETTINGS_PATH, "utf8"));
    return {
      downloadDirectory: typeof parsed.downloadDirectory === "string" ? parsed.downloadDirectory : "",
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return { downloadDirectory: "", updatedAt: "" };
  }
}

function writeReportSettings(settings) {
  const next = {
    downloadDirectory: settings.downloadDirectory || "",
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(REPORT_SETTINGS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function normalizeReportDirectory(directory, { create = false } = {}) {
  const input = String(directory || "").trim();
  if (!input) return "";
  if (!path.isAbsolute(input)) {
    const error = new Error("Download directory must be an absolute path.");
    error.statusCode = 400;
    throw error;
  }
  const resolved = path.resolve(input);
  if (create) fs.mkdirSync(resolved, { recursive: true });
  const stat = fs.existsSync(resolved) ? fs.statSync(resolved) : null;
  if (!stat?.isDirectory()) {
    const error = new Error("Download directory does not exist or is not a folder.");
    error.statusCode = 400;
    throw error;
  }
  return resolved;
}

function safeReportFileName(fileName) {
  const rawName = path.basename(String(fileName || "cdr-report.bin"));
  const cleaned = rawName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  if (!cleaned || cleaned === "." || cleaned === "..") {
    const error = new Error("Report file name is invalid.");
    error.statusCode = 400;
    throw error;
  }
  if (!REPORT_ALLOWED_EXTENSIONS.has(path.extname(cleaned).toLowerCase())) {
    const error = new Error("Report file type is not allowed.");
    error.statusCode = 400;
    throw error;
  }
  return cleaned;
}

function uniqueReportPath(directory, fileName) {
  const parsed = path.parse(fileName);
  let candidate = path.join(directory, fileName);
  let index = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(directory, `${parsed.name} (${index})${parsed.ext}`);
    index += 1;
  }
  return candidate;
}

function powershellString(value) {
  return `'${String(value || "").replace(/'/g, "''")}'`;
}

function browseReportDirectory(currentDirectory) {
  if (process.platform !== "win32") {
    const error = new Error("Folder browse is only available on Windows. Type the directory path manually.");
    error.statusCode = 501;
    throw error;
  }

  return new Promise((resolve, reject) => {
    const selectedPath = currentDirectory ? normalizeReportDirectory(currentDirectory) : "";
    const script = [
      "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
      "Add-Type -AssemblyName System.Windows.Forms",
      "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
      "$dialog.Description = 'Select CDR report download folder'",
      "$dialog.ShowNewFolderButton = $true",
      selectedPath ? `$dialog.SelectedPath = ${powershellString(selectedPath)}` : "",
      "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }",
    ].filter(Boolean).join("; ");
    const psPath = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const child = spawn(psPath, ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script], {
      windowsHide: false,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      const error = new Error("Folder picker timed out.");
      error.statusCode = 408;
      reject(error);
    }, 120000);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const error = new Error(stderr.trim() || "Folder picker failed.");
        error.statusCode = 500;
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function handleReportFolderRoutes(req, res, pathname) {
  requireLocalReportApi(req);

  if (req.method === "GET" && pathname === "/api/reports/download-directory") {
    const settings = readReportSettings();
    const directory = settings.downloadDirectory ? normalizeReportDirectory(settings.downloadDirectory) : "";
    return sendJson(res, 200, {
      configured: Boolean(directory),
      directory,
      canBrowse: process.platform === "win32",
      updatedAt: settings.updatedAt,
    });
  }

  if ((req.method === "POST" || req.method === "PUT") && pathname === "/api/reports/download-directory") {
    const body = await readJson(req);
    const directory = normalizeReportDirectory(body.directory, { create: true });
    const settings = writeReportSettings({ downloadDirectory: directory });
    return sendJson(res, 200, {
      ok: true,
      configured: Boolean(settings.downloadDirectory),
      directory: settings.downloadDirectory,
      canBrowse: process.platform === "win32",
      updatedAt: settings.updatedAt,
    });
  }

  if (req.method === "POST" && pathname === "/api/reports/download-directory/clear") {
    const settings = writeReportSettings({ downloadDirectory: "" });
    return sendJson(res, 200, {
      ok: true,
      configured: false,
      directory: "",
      canBrowse: process.platform === "win32",
      updatedAt: settings.updatedAt,
    });
  }

  if (req.method === "POST" && pathname === "/api/reports/download-directory/browse") {
    const body = await readJson(req);
    const directory = await browseReportDirectory(body.currentDirectory || readReportSettings().downloadDirectory || "");
    if (!directory) return sendJson(res, 200, { ok: false, cancelled: true });
    const resolved = normalizeReportDirectory(directory, { create: true });
    const settings = writeReportSettings({ downloadDirectory: resolved });
    return sendJson(res, 200, {
      ok: true,
      configured: true,
      directory: settings.downloadDirectory,
      canBrowse: process.platform === "win32",
      updatedAt: settings.updatedAt,
    });
  }

  if (req.method === "POST" && pathname === "/api/reports/save-generated-file") {
    const body = await readJson(req, Math.ceil(REPORT_MAX_FILE_BYTES * 1.4));
    const settings = readReportSettings();
    const directory = normalizeReportDirectory(settings.downloadDirectory);
    if (!directory) return sendJson(res, 400, { error: "No download directory is configured." });
    const fileName = safeReportFileName(body.fileName);
    const base64 = String(body.base64 || "").replace(/^data:[^,]+,/, "").replace(/\s/g, "");
    if (!base64) return sendJson(res, 400, { error: "Generated file payload is missing." });
    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length || buffer.length > REPORT_MAX_FILE_BYTES) {
      return sendJson(res, 413, { error: "Generated file payload is empty or too large." });
    }
    const filePath = uniqueReportPath(directory, fileName);
    fs.writeFileSync(filePath, buffer);
    return sendJson(res, 200, {
      ok: true,
      fileName: path.basename(filePath),
      directory,
      filePath,
      size: buffer.length,
      savedAt: new Date().toISOString(),
    });
  }

  if (req.method === "POST" && pathname === "/api/reports/reveal-generated-file") {
    const body = await readJson(req);
    const settings = readReportSettings();
    const directory = normalizeReportDirectory(settings.downloadDirectory);
    if (!directory) return sendJson(res, 400, { error: "No download directory is configured." });
    const filePath = path.resolve(String(body.filePath || ""));
    const directoryWithSep = directory.endsWith(path.sep) ? directory : `${directory}${path.sep}`;
    if (filePath !== directory && !filePath.startsWith(directoryWithSep)) {
      return sendJson(res, 400, { error: "Report path is outside the configured download directory." });
    }
    if (!fs.existsSync(filePath)) return sendJson(res, 404, { error: "Generated report file was not found." });
    if (process.platform === "win32") {
      const child = spawn("explorer.exe", ["/select,", filePath], { detached: true, stdio: "ignore", windowsHide: false });
      child.unref();
    } else {
      const child = spawn("xdg-open", [path.dirname(filePath)], { detached: true, stdio: "ignore" });
      child.unref();
    }
    return sendJson(res, 200, { ok: true });
  }

  return null;
}

async function route(pool, req, res) {
  const corsOrigin = resolveCorsOrigin(req);
  if (!corsOrigin) return sendJson(res, 403, { error: "Origin is not allowed for this API." });
  res.cdrCorsOrigin = corsOrigin;
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/reports/")) {
    const handled = await handleReportFolderRoutes(req, res, pathname);
    if (handled !== null) return handled;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    await pool.query("SELECT 1");
    return sendJson(res, 200, { ok: true, database: DB_NAME });
  }

  if (req.method === "GET" && pathname === "/api/app/bootstrap") {
    return sendJson(res, 200, { settings: await readSettings(pool) });
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await readJson(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) return sendJson(res, 400, { error: "Username and password are required." });
    const [rows] = await pool.query(
      "SELECT id, role, username, password_hash, is_active, failed_attempts, locked_until FROM cdr_users WHERE LOWER(username) = LOWER(:username) LIMIT 1",
      { username },
    );
    const user = rows[0];
    const lockedUntil = user?.locked_until instanceof Date ? user.locked_until.getTime() : user?.locked_until ? new Date(user.locked_until).getTime() : 0;
    if (user && lockedUntil && lockedUntil > Date.now()) {
      await writeAudit(pool, { username, role: "system" }, "login_locked", `Locked account attempted login: ${username}`);
      return sendJson(res, 423, { error: "This user is temporarily locked after repeated failed logins. Try again later or reset the password from System Admin." });
    }
    if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
      if (user) {
        const nextAttempts = Number(user.failed_attempts || 0) + 1;
        const shouldLock = nextAttempts >= Number(process.env.CDR_MAX_FAILED_LOGINS || 5);
        await pool.query(
          `UPDATE cdr_users
           SET failed_attempts = :failedAttempts,
               locked_until = ${shouldLock ? "DATE_ADD(NOW(), INTERVAL 15 MINUTE)" : "NULL"}
           WHERE id = :id`,
          { failedAttempts: nextAttempts, id: user.id },
        );
      }
      await writeAudit(pool, { username, role: "system" }, "login_failed", `Failed login for username: ${username}`);
      return sendJson(res, 401, { error: "Invalid username or password." });
    }
    if (needsPasswordRehash(user.password_hash)) {
      await pool.query(
        "UPDATE cdr_users SET password_hash = :passwordHash, failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = :id",
        { id: user.id, passwordHash: hashPassword(password) },
      );
    } else {
      await pool.query("UPDATE cdr_users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = :id", { id: user.id });
    }
    const token = makeSession(user);
    await writeAudit(pool, user, "login_success", `User logged in: ${user.username}`);
    return sendJson(res, 200, { ok: true, role: user.role, username: user.username, token });
  }

  if (req.method === "PUT" && pathname === "/api/app/settings") {
    requireRole(req, ["admin", "customerAdmin"]);
    const session = requireRole(req, ["admin", "customerAdmin"]);
    const body = await readJson(req);
    const settings = await updateSettings(pool, body.settings);
    await writeAudit(pool, session, "settings_updated", "Interface/branding settings were updated.");
    return sendJson(res, 200, { settings });
  }


  if (req.method === "GET" && pathname === "/api/app/users") {
    requireRole(req, ["admin"]);
    return sendJson(res, 200, { users: await readUsers(pool) });
  }

  if (req.method === "POST" && pathname === "/api/app/users") {
    const session = requireRole(req, ["admin"]);
    const body = await readJson(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const role = String(body.role || "customer");
    const isActive = body.isActive !== false;
    if (!["admin", "customerAdmin", "customer"].includes(role)) return sendJson(res, 400, { error: "Invalid role." });
    if (!username || password.length < MIN_PASSWORD_LENGTH) {
      return sendJson(res, 400, { error: `Username is required and password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }
    try {
      await pool.query(
        `INSERT INTO cdr_users (role, username, password_hash, is_active)
         VALUES (:role, :username, :passwordHash, :isActive)`,
        { role, username, passwordHash: hashPassword(password), isActive: isActive ? 1 : 0 },
      );
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return sendJson(res, 409, { error: "Username already exists." });
      throw error;
    }
    await writeAudit(pool, session, "user_created", `Created ${role} user ${username}`);
    return sendJson(res, 200, { users: await readUsers(pool) });
  }

  const userMatch = pathname.match(/^\/api\/app\/users\/(\d+)$/);
  if (req.method === "PUT" && userMatch) {
    const session = requireRole(req, ["admin"]);
    const id = Number(userMatch[1]);
    const body = await readJson(req);
    const username = body.username == null ? null : String(body.username || "").trim();
    const password = body.password == null ? "" : String(body.password || "");
    const role = body.role == null ? null : String(body.role || "");
    const updates = [];
    const params = { id };
    if (username !== null) {
      if (!username) return sendJson(res, 400, { error: "Username is required." });
      updates.push("username = :username");
      params.username = username;
    }
    if (role !== null) {
      if (!["admin", "customerAdmin", "customer"].includes(role)) return sendJson(res, 400, { error: "Invalid role." });
      updates.push("role = :role");
      params.role = role;
    }
    if (password) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return sendJson(res, 400, { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      }
      updates.push("password_hash = :passwordHash", "failed_attempts = 0", "locked_until = NULL");
      params.passwordHash = hashPassword(password);
    }
    if (typeof body.isActive === "boolean") {
      updates.push("is_active = :isActive");
      params.isActive = body.isActive ? 1 : 0;
    }
    if (!updates.length) return sendJson(res, 400, { error: "No changes submitted." });
    try {
      await pool.query(`UPDATE cdr_users SET ${updates.join(", ")} WHERE id = :id`, params);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return sendJson(res, 409, { error: "Username already exists." });
      throw error;
    }
    await writeAudit(pool, session, "user_updated", `Updated user id ${id}`);
    return sendJson(res, 200, { users: await readUsers(pool) });
  }

  if (req.method === "GET" && pathname === "/api/app/audit-logs") {
    requireRole(req, ["admin"]);
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 80)));
    const [rows] = await pool.query(
      `SELECT id, username, role, action, details, created_at
       FROM cdr_audit_logs
       ORDER BY id DESC
       LIMIT :limit`,
      { limit },
    );
    return sendJson(res, 200, { logs: rows.map(toAudit) });
  }

  const credentialMatch = pathname.match(/^\/api\/app\/credentials\/(admin|customerAdmin|customer)$/);
  if (req.method === "PUT" && credentialMatch) {
    requireRole(req, ["admin"]);
    const role = credentialMatch[1];
    const body = await readJson(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || password.length < MIN_PASSWORD_LENGTH) {
      return sendJson(res, 400, { error: `Username is required and password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }
    await pool.query(
      `INSERT INTO cdr_users (role, username, password_hash)
       VALUES (:role, :username, :passwordHash)
       ON DUPLICATE KEY UPDATE username = VALUES(username), password_hash = VALUES(password_hash), is_active = 1, failed_attempts = 0, locked_until = NULL;`,
      { role, username, passwordHash: hashPassword(password) },
    );
    await writeAudit(pool, requireRole(req, ["admin"]), "credential_updated", `Updated credential for role ${role}`);
    return sendJson(res, 200, { ok: true });
  }

  return notFound(res);
}

async function main() {
  const pool = await createPool();
  if (process.argv.includes("--init-only")) {
    console.log(`MySQL database initialized: ${DB_NAME}`);
    await pool.end();
    return;
  }

  const server = http.createServer((req, res) => {
    route(pool, req, res).catch((error) => {
      const statusCode = error.statusCode || 500;
      const message = statusCode >= 500 ? `Dashboard service error: ${error.message}` : error.message;
      console.error(error);
      sendJson(res, statusCode, { error: message });
    });
  });

  server.listen(PORT, () => {
    console.log(`CDR MySQL API running on http://127.0.0.1:${PORT}`);
    console.log(`MySQL database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
  });
}

const SHOULD_START_SERVER =
  require.main === module ||
  process.env.PASSENGER_APP_ENV ||
  process.env.PASSENGER_BASE_URI ||
  process.env.PASSENGER_APP_ROOT ||
  process.env.NODE_ENV === "production";

if (SHOULD_START_SERVER) {
  main().catch((error) => {
    console.error("Failed to start CDR MySQL API:", error);
    process.exit(1);
  });
}

module.exports = {
  createPool,
  route,
  sendJson,
  readSettings,
  updateSettings,
  ensureSchema,
};

module.exports.default = module.exports;
