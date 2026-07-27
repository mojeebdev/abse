import { createClient } from "@base44/sdk";

const appId = import.meta.env.VITE_BASE44_APP_ID?.trim();
const githubConnectorId = import.meta.env.VITE_BASE44_GITHUB_CONNECTOR_ID?.trim();

export const hasBase44Project = Boolean(appId) && import.meta.env.MODE !== "test";
export const hasGitHubConnector = Boolean(githubConnectorId);

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

type ConnectorRedirectResult =
  | string
  | {
      url?: unknown;
      authorizationUrl?: unknown;
      redirectUrl?: unknown;
    };

function getConnectorAuthorizationUrl(result: ConnectorRedirectResult): string | null {
  if (typeof result === "string") return result;

  const candidate = result.url ?? result.authorizationUrl ?? result.redirectUrl;
  return typeof candidate === "string" ? candidate : null;
}

export async function connectGitHub(): Promise<void> {
  if (!base44) throw new Error("BASE44_NOT_CONFIGURED");
  if (!githubConnectorId) throw new Error("GITHUB_CONNECTOR_NOT_CONFIGURED");

  const user = await currentUser();
  if (!user) throw new Error("AUTH_REQUIRED");

  const result = (await base44.connectors.connectAppUser(
    githubConnectorId,
  )) as ConnectorRedirectResult;
  const authorizationUrl = getConnectorAuthorizationUrl(result);

  if (!authorizationUrl) {
    throw new Error("INVALID_GITHUB_AUTHORIZATION_URL");
  }

  const parsedUrl = new URL(authorizationUrl, window.location.origin);
  if (parsedUrl.protocol !== "https:" && parsedUrl.origin !== window.location.origin) {
    throw new Error("INVALID_GITHUB_AUTHORIZATION_URL");
  }

  window.location.assign(parsedUrl.toString());
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
