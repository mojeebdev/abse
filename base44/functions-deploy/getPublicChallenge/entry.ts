// base44/lib/http.ts
import { createClientFromRequest } from "npm:@base44/sdk";
var ApiError = class extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
};
async function jsonBody(req) {
  try {
    return await req.json();
  } catch {
    throw new ApiError("INVALID_ACTION", "The request body is not valid JSON.");
  }
}
function serve(handler) {
  Deno.serve(async (req) => {
    const started = performance.now();
    try {
      const result = await handler(req);
      return Response.json(result);
    } catch (error) {
      const safe = error instanceof ApiError ? error : new ApiError("INTERNAL_ERROR", "The operation could not be completed.", 500);
      console.error(JSON.stringify({
        category: safe.code,
        durationMs: Math.round(performance.now() - started)
      }));
      return Response.json(
        { error: { code: safe.code, message: safe.message } },
        { status: safe.status }
      );
    }
  });
}

// base44/functions/getPublicChallenge/entry.ts
import { createClientFromRequest as createClientFromRequest2 } from "npm:@base44/sdk";
serve(async (req) => {
  const { shareCode } = await jsonBody(req);
  if (!shareCode || !/^[a-f0-9]{16}$/.test(shareCode)) throw new ApiError("INVALID_CHALLENGE", "Invalid challenge code.");
  const base44 = createClientFromRequest2(req);
  const entities = base44.asServiceRole.entities;
  const challenge = (await entities.Challenge.filter({ shareCode }, "-expiresAt", 1))[0];
  if (!challenge || challenge.status === "cancelled") throw new ApiError("CHALLENGE_NOT_FOUND", "Challenge not found.", 404);
  return {
    challenge: {
      shareCode: challenge.shareCode,
      challengeType: challenge.challengeType,
      status: Date.parse(challenge.expiresAt) <= Date.now() ? "expired" : challenge.status,
      expiresAt: challenge.expiresAt,
      challenger: challenge.challengerSnapshot
    }
  };
});
