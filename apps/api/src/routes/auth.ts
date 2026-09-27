import { Router } from "express";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../prisma";
import { env } from "../env";
import { createSession, clearSessionCookie, destroySession } from "../auth/session";
import { requireAuth } from "../middleware/requireAuth";
import { Errors } from "../http/errors";
import type { CurrentUserDTO } from "@reachinbox/shared";

export const authRouter = Router();

const oauthClient = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_CALLBACK_URL,
});

const STATE_COOKIE = "rib_oauth_state";

/**
 * Real Google OAuth authorization-code flow:
 *  1. GET /api/auth/google       -> redirect to Google's consent screen, with a
 *     random `state` value stored in a short-lived signed cookie (CSRF guard).
 *  2. GET /api/auth/google/callback -> validate `state` matches the cookie,
 *     exchange the code for tokens, verify the ID token signature/audience,
 *     upsert the user (creating a new tenant on first login), start a
 *     DB-backed session, and redirect into the dashboard.
 */
authRouter.get("/google", (req, res) => {
  const state = crypto.randomBytes(24).toString("hex");
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    signed: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
    path: "/",
  });

  const url = oauthClient.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account",
  });

  res.redirect(url);
});

authRouter.get("/google/callback", async (req, res, next) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    const expectedState = req.signedCookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { path: "/" });

    if (!code || !state || !expectedState || state !== expectedState) {
      throw Errors.badRequest("Invalid or missing OAuth state");
    }

    const { tokens } = await oauthClient.getToken({ code, redirect_uri: env.GOOGLE_CALLBACK_URL });
    if (!tokens.id_token) throw Errors.badRequest("Google did not return an ID token");

    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw Errors.badRequest("Google ID token missing required claims");

    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { googleId: payload.sub } });
      if (existing) {
        return tx.user.update({
          where: { id: existing.id },
          data: {
            lastLoginAt: new Date(),
            name: payload.name ?? existing.name,
            avatarUrl: payload.picture ?? existing.avatarUrl,
          },
        });
      }

      const tenant = await tx.tenant.create({ data: { name: payload.name ?? payload.email! } });
      return tx.user.create({
        data: {
          tenantId: tenant.id,
          googleId: payload.sub,
          email: payload.email!,
          name: payload.name ?? payload.email!,
          avatarUrl: payload.picture,
          lastLoginAt: new Date(),
        },
      });
    });

    await createSession(user.id, res);
    res.redirect(`${env.APP_BASE_URL}/dashboard`);
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  const u = req.user!;
  const dto: CurrentUserDTO = {
    id: u.id,
    tenantId: u.tenantId,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl ?? null,
  };
  res.json(dto);
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  await destroySession(req);
  clearSessionCookie(res);
  res.status(204).end();
});
