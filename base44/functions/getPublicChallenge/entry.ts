import { ApiError, jsonBody, serve } from "../../lib/http.ts";
import { createClientFromRequest } from "npm:@base44/sdk";

serve(async (req) => {
  const { shareCode } = await jsonBody<{ shareCode?: string }>(req);
  if (!shareCode || !/^[a-f0-9]{16}$/.test(shareCode)) throw new ApiError("INVALID_CHALLENGE", "Invalid challenge code.");
  const base44 = createClientFromRequest(req);
  const entities = base44.asServiceRole.entities as any;
  const challenge = (await entities.Challenge.filter({ shareCode }, "-expiresAt", 1))[0];
  if (!challenge || challenge.status === "cancelled") throw new ApiError("CHALLENGE_NOT_FOUND", "Challenge not found.", 404);
  return {
    challenge: {
      shareCode: challenge.shareCode,
      challengeType: challenge.challengeType,
      status: Date.parse(challenge.expiresAt) <= Date.now() ? "expired" : challenge.status,
      expiresAt: challenge.expiresAt,
      challenger: challenge.challengerSnapshot,
    },
  };
});
