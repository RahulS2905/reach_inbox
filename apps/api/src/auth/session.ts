import type { Request, Response } from "express";
import { prisma } from "../prisma";
import { env } from "../env";

const COOKIE_NAME = "rib_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSession(userId: string, res: Response) {
  const session = await prisma.session.create({
    data: { userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });

  res.cookie(COOKIE_NAME, session.id, {
    httpOnly: true,
    signed: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });

  return session;
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function readSessionId(req: Request): string | undefined {
  return req.signedCookies?.[COOKIE_NAME];
}

export async function resolveSessionUser(req: Request) {
  const sessionId = readSessionId(req);
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { include: { tenant: true } } },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) {
      // Expired — best-effort cleanup, never blocks the request.
      prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  return session.user;
}

export async function destroySession(req: Request) {
  const sessionId = readSessionId(req);
  if (!sessionId) return;
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
}
