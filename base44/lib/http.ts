import { createClientFromRequest } from "npm:@base44/sdk";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function context(req: Request) {
  const base44 = createClientFromRequest(req);
  let user;
  try {
    user = await base44.auth.me();
  } catch {
    throw new ApiError("AUTH_REQUIRED", "Sign in to continue.", 401);
  }
  if (!user) throw new ApiError("AUTH_REQUIRED", "Sign in to continue.", 401);
  return {
    base44,
    entities: base44.asServiceRole.entities as any,
    user,
    correlationId: req.headers.get("x-correlation-id") ?? crypto.randomUUID(),
  };
}

export async function jsonBody<T>(req: Request): Promise<T> {
  try {
    return await req.json() as T;
  } catch {
    throw new ApiError("INVALID_ACTION", "The request body is not valid JSON.");
  }
}

export function serve(handler: (req: Request) => Promise<unknown>) {
  Deno.serve(async (req) => {
    const started = performance.now();
    try {
      const result = await handler(req);
      return Response.json(result);
    } catch (error) {
      const safe = error instanceof ApiError
        ? error
        : new ApiError("INTERNAL_ERROR", "The operation could not be completed.", 500);
      console.error(JSON.stringify({
        category: safe.code,
        durationMs: Math.round(performance.now() - started),
      }));
      return Response.json(
        { error: { code: safe.code, message: safe.message } },
        { status: safe.status },
      );
    }
  });
}

export async function audit(
  entities: any,
  input: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    correlationId: string;
    metadata?: Record<string, unknown>;
  },
) {
  await entities.AuditLog.create({
    ...input,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  });
}

export async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
