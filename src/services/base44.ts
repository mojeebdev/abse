import { createClient } from "@base44/sdk";
import type { GitHubMetrics } from "../domain/types";

const appId = import.meta.env.VITE_BASE44_APP_ID?.trim();

export const hasBase44Project = Boolean(appId) && import.meta.env.MODE !== "test";

export const base44 = hasBase44Project && appId ? createClient({ appId }) : null;

const BLOCKED_RETURN_PATHS = [
  "/login",
  "/logout",
  "/api/external-auth/callback",
];

export function getSafeReturnPath(
  rawValue: string | null | undefined,
  fallback = "/github-link",
): string {
  if (!rawValue) return fallback;

  let value = rawValue;
  try {
    value = decodeURIComponent(rawValue);
  } catch {
    value = rawValue;
  }

  try {
    const url = new URL(value, window.location.origin);

    if (url.origin !== window.location.origin) {
      return fallback;
    }

    if (
      BLOCKED_RETURN_PATHS.some(
        (path) => url.pathname === path || url.pathname.startsWith(`${path}/`),
      )
    ) {
      return fallback;
    }

    if (url.searchParams.has("from_url")) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export async function redirectToAbseLogin(
  requestedReturnPath = "/github-link",
): Promise<void> {
  if (!base44) throw new Error("BASE44_NOT_CONFIGURED");

  const returnPath = getSafeReturnPath(requestedReturnPath, "/github-link");
  await Promise.resolve(base44.auth.redirectToLogin(returnPath));
}

export async function currentUser() {
  if (!base44) return null;
  try {
    return await base44.auth.me();
  } catch {
    return null;
  }
}

export function normalizeGitHubUsername(rawValue: string): string {
  return rawValue.trim().replace(/^@+/, "").trim();
}

export function validateGitHubUsername(rawValue: string): boolean {
  const username = normalizeGitHubUsername(rawValue);
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}[a-zA-Z0-9])?$/.test(username) && username.length >= 1 && username.length <= 39;
}

export interface PublicGitHubImportResult {
  status: string;
  username: string;
  metrics: GitHubMetrics;
  forgeProfile: {
    calculationVersion: string;
    totalForgePoints: number;
    primaryAffinity: string;
    secondaryAffinities: string[];
    potentials: Record<string, number>;
    explanation: Array<{
      key: string;
      label: string;
      raw: number;
      normalized: number;
      cap: number;
      points: number;
    }>;
    traits: Array<{
      key: string;
      name: string;
      description: string;
      evidence: string;
    }>;
  };
}

export async function importPublicGitHubProfile(username: string): Promise<PublicGitHubImportResult> {
  if (!base44) throw new Error("BASE44_NOT_CONFIGURED");
  return invokeAbseFunction<PublicGitHubImportResult>("importPublicGitHubProfile", { username });
}

export async function invokeAbseFunction<TResponse>(
  name: string,
  payload: Record<string, unknown> = {},
): Promise<TResponse> {
  if (!base44) throw new Error("BASE44_NOT_CONFIGURED");
  const result = await base44.functions.invoke(name as never, payload);
  return result.data as TResponse;
}

export async function invokeAbseFunctionWithHeaders<TResponse>(
  name: string,
  payload: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<TResponse> {
  if (!base44) throw new Error("BASE44_NOT_CONFIGURED");
  const response = await base44.functions.fetch(name as never, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.code ?? "INTERNAL_ERROR");
  return data as TResponse;
}

export function trackAbseEvent(
  eventName: string,
  properties: Record<string, string | number | boolean> = {},
): void {
  if (!base44) return;
  void base44.analytics.track({ eventName, properties });
}
