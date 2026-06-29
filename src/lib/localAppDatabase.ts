import type { ThemeName } from "../types/dashboard";

export type PortalRole = "admin" | "customerAdmin" | "customer";

export type LocalCredential = {
  role: PortalRole;
  username: string;
  passwordHash: string;
  updatedAt: string;
};

export type LocalAppSettings = {
  companyName: string;
  adminPortalTitle: string;
  adminPortalDescription: string;
  customerPortalTitle: string;
  customerPortalDescription: string;
  dashboardHeaderTitle: string;
  dashboardHeaderDescription: string;
  leftLogoName: string;
  leftLogoDataUrl: string;
  rightLogoName: string;
  rightLogoDataUrl: string;
  uploadHeroImageName: string;
  uploadHeroImageDataUrl: string;
  radioShowcaseImageName: string;
  radioShowcaseImageDataUrl: string;
  defaultTheme: ThemeName;
  showSampleDataButton: boolean;
  headerLogoSize: number;
  headerTitleScale: number;
  compactDashboardLayout: boolean;
  supportEmail: string;
  supportPhone: string;
  primaryColor: string;
  updatedAt: string;
};

export const DEFAULT_LOCAL_SETTINGS: LocalAppSettings = {
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
  updatedAt: new Date().toISOString(),
};

const DEFAULT_CREDENTIAL_INPUTS: Record<PortalRole, { username: string; password: string }> = {
  admin: { username: "admin", password: "" },
  customerAdmin: { username: "customeradmin", password: "" },
  customer: { username: "customer", password: "" },
};

function getApiBase() {
  if (typeof window === "undefined") return "/api";
  const configured = (window as typeof window & { __CDR_API_BASE__?: string }).__CDR_API_BASE__;
  return configured?.replace(/\/$/, "") || "/api";
}

function getSessionToken() {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem("cdr_mysql_session_token") || "";
  } catch {
    return "";
  }
}

function setSessionToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem("cdr_mysql_session_token", token);
    else window.sessionStorage.removeItem("cdr_mysql_session_token");
  } catch {
    // ignore browser storage errors
  }
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSessionToken();
  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-CDR-Session": token } : {}),
      },
    });
  } catch {
    throw new Error("Dashboard service is not reachable. Check the API app, internet connection, and api.cdr.hitham.app status.");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // keep payload null for non-json errors
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error)
        : `Dashboard service request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function buildDefaultCredentials(): Record<PortalRole, LocalCredential> {
  return {
    admin: {
      role: "admin",
      username: DEFAULT_CREDENTIAL_INPUTS.admin.username,
      passwordHash: "",
      updatedAt: new Date().toISOString(),
    },
    customerAdmin: {
      role: "customerAdmin",
      username: DEFAULT_CREDENTIAL_INPUTS.customerAdmin.username,
      passwordHash: "",
      updatedAt: new Date().toISOString(),
    },
    customer: {
      role: "customer",
      username: DEFAULT_CREDENTIAL_INPUTS.customer.username,
      passwordHash: "",
      updatedAt: new Date().toISOString(),
    },
  };
}

export async function ensureLocalAppDatabase(): Promise<{
  settings: LocalAppSettings;
  credentials: Record<PortalRole, LocalCredential>;
}> {
  const result = await apiJson<{ settings: Partial<LocalAppSettings> }>("/app/bootstrap");
  return {
    settings: { ...DEFAULT_LOCAL_SETTINGS, ...(result.settings ?? {}) },
    credentials: buildDefaultCredentials(),
  };
}

export async function loadLocalAppSettings(): Promise<LocalAppSettings> {
  const { settings } = await ensureLocalAppDatabase();
  return settings;
}

export async function saveLocalAppSettings(settings: LocalAppSettings): Promise<LocalAppSettings> {
  const result = await apiJson<{ settings: LocalAppSettings }>("/app/settings", {
    method: "PUT",
    body: JSON.stringify({ settings }),
  });
  return { ...DEFAULT_LOCAL_SETTINGS, ...result.settings };
}

export async function verifyLocalCredential(
  role: PortalRole,
  username: string,
  password: string,
): Promise<boolean> {
  const verified = await verifyLocalCredentialByUsername(username, password);
  return verified?.role === role;
}

export async function verifyLocalCredentialByUsername(
  username: string,
  password: string,
): Promise<{ role: PortalRole; username: string; token: string } | null> {
  const normalizedUsername = username.trim();
  if (!normalizedUsername) return null;
  const result = await apiJson<{ ok: boolean; role: PortalRole; username: string; token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: normalizedUsername, password }),
  });
  if (!result.ok) return null;
  setSessionToken(result.token);
  return { role: result.role, username: result.username, token: result.token };
}

export async function updateLocalCredential(
  role: PortalRole,
  username: string,
  password: string,
): Promise<Record<PortalRole, LocalCredential>> {
  await apiJson<{ ok: boolean }>(`/app/credentials/${role}`, {
    method: "PUT",
    body: JSON.stringify({ username: username.trim(), password }),
  });
  return buildDefaultCredentials();
}

export function clearMysqlSessionToken() {
  setSessionToken("");
}

export function getDefaultCredentialHelp(role: PortalRole) {
  return DEFAULT_CREDENTIAL_INPUTS[role];
}

export type AppUserRecord = {
  id: number;
  role: PortalRole;
  username: string;
  isActive: boolean;
  failedAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLogRecord = {
  id: number;
  username: string;
  role: PortalRole | "system";
  action: string;
  details: string;
  createdAt: string;
};

export async function listMysqlUsers(): Promise<AppUserRecord[]> {
  const result = await apiJson<{ users: AppUserRecord[] }>("/app/users");
  return result.users ?? [];
}

export async function createMysqlUser(input: {
  username: string;
  password: string;
  role: PortalRole;
  isActive?: boolean;
}): Promise<AppUserRecord[]> {
  const result = await apiJson<{ users: AppUserRecord[] }>("/app/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.users ?? [];
}

export async function updateMysqlUser(input: {
  id: number;
  username?: string;
  password?: string;
  role?: PortalRole;
  isActive?: boolean;
}): Promise<AppUserRecord[]> {
  const result = await apiJson<{ users: AppUserRecord[] }>(`/app/users/${input.id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return result.users ?? [];
}

export async function listMysqlAuditLogs(limit = 80): Promise<AuditLogRecord[]> {
  const result = await apiJson<{ logs: AuditLogRecord[] }>(`/app/audit-logs?limit=${encodeURIComponent(String(limit))}`);
  return result.logs ?? [];
}
