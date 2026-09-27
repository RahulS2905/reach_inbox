import crypto from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { Errors } from "../http/errors";

export function hashRequestBody(body: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

/**
 * Atomically claims an idempotency key inside the caller's transaction.
 * - No existing row: creates one with responseBody = null and lets the
 *   caller proceed to do the work, then call `completeIdempotency`.
 * - Existing row, same request hash, response already recorded: returns
 *   { replay: true, responseBody } so the route can short-circuit.
 * - Existing row, same request hash, response NOT yet recorded: a
 *   concurrent identical request is still in flight -> 409 (client should
 *   retry; safe because no partial campaign was created under this key).
 * - Existing row, different request hash: the key was reused for a
 *   different payload -> 409.
 */
export async function claimIdempotencyKey(
  tx: Prisma.TransactionClient,
  tenantId: string,
  key: string,
  requestHash: string,
): Promise<{ replay: true; responseBody: unknown } | { replay: false }> {
  const existing = await tx.idempotencyKey.findUnique({
    where: { tenantId_key: { tenantId, key } },
  });

  if (!existing) {
    await tx.idempotencyKey.create({
      data: { tenantId, key, requestHash, responseBody: Prisma.JsonNull },
    });
    return { replay: false };
  }

  if (existing.requestHash !== requestHash) {
    throw Errors.conflict("Idempotency-Key was already used with a different request body");
  }

  if (existing.responseBody !== null) {
    return { replay: true, responseBody: existing.responseBody };
  }

  throw Errors.conflict("A request with this Idempotency-Key is already being processed");
}

export async function completeIdempotency(
  tx: Prisma.TransactionClient,
  tenantId: string,
  key: string,
  responseBody: unknown,
) {
  await tx.idempotencyKey.update({
    where: { tenantId_key: { tenantId, key } },
    data: { responseBody: responseBody as Prisma.InputJsonValue },
  });
}
