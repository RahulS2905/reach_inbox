import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { prisma } from "../prisma";
import { env } from "../env";
import { encryptSecret, decryptSecret } from "../crypto";
import { exchangeSlackCode, listSlackChannels, postSlackMessage } from "../slack/client";
import { Errors } from "../http/errors";
import type { SlackStatusDTO } from "@reachinbox/shared";

export const slackRouter = Router();
slackRouter.use(requireAuth);

const STATE_COOKIE = "rib_slack_state";
const SLACK_SCOPES = ["chat:write", "channels:read", "groups:read"].join(",");

slackRouter.get("/oauth/authorize", (req, res) => {
  const state = crypto.randomBytes(24).toString("hex");
  res.cookie(STATE_COOKIE, `${state}:${req.tenantId}:${req.user!.id}`, {
    httpOnly: true,
    signed: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
    path: "/",
  });

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", env.SLACK_CLIENT_ID);
  url.searchParams.set("scope", SLACK_SCOPES);
  url.searchParams.set("redirect_uri", env.SLACK_CALLBACK_URL);
  url.searchParams.set("state", state);

  res.redirect(url.toString());
});

// Reached via a full browser redirect from Slack. Tenant/user identity
// travels inside the signed `state` cookie set in /authorize (validated
// below), since this hop isn't a same-session XHR carrying the normal
// session cookie's auth context in the usual sense.
slackRouter.get("/oauth/callback", async (req, res, next) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    const cookieVal = req.signedCookies?.[STATE_COOKIE] as string | undefined;
    res.clearCookie(STATE_COOKIE, { path: "/" });

    if (!code || !state || !cookieVal) throw Errors.badRequest("Invalid Slack OAuth state");
    const [expectedState, tenantId, userId] = cookieVal.split(":");
    if (state !== expectedState) throw Errors.badRequest("Slack OAuth state mismatch");

    const exchange = await exchangeSlackCode({
      code,
      clientId: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET,
      redirectUri: env.SLACK_CALLBACK_URL,
    });

    const existing = await prisma.slackConnection.findFirst({
      where: { tenantId, teamId: exchange.team.id },
    });

    if (existing) {
      await prisma.slackConnection.update({
        where: { id: existing.id },
        data: {
          accessTokenEncrypted: encryptSecret(exchange.access_token),
          botUserId: exchange.bot_user_id,
          disconnectedAt: null,
        },
      });
    } else {
      await prisma.slackConnection.create({
        data: {
          tenantId,
          teamId: exchange.team.id,
          teamName: exchange.team.name,
          accessTokenEncrypted: encryptSecret(exchange.access_token),
          botUserId: exchange.bot_user_id,
          connectedByUserId: userId,
        },
      });
    }

    res.redirect(`${env.APP_BASE_URL}/settings?slack=connected`);
  } catch (err) {
    next(err);
  }
});

async function activeConnection(tenantId: string) {
  return prisma.slackConnection.findFirst({
    where: { tenantId, disconnectedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

slackRouter.get("/status", async (req, res, next) => {
  try {
    const conn = await activeConnection(req.tenantId!);
    const dto: SlackStatusDTO = conn
      ? { connected: true, teamName: conn.teamName, channelName: conn.channelName ?? undefined }
      : { connected: false };
    res.json(dto);
  } catch (err) {
    next(err);
  }
});

slackRouter.get("/channels", async (req, res, next) => {
  try {
    const conn = await activeConnection(req.tenantId!);
    if (!conn) throw Errors.badRequest("Slack is not connected for this tenant");
    const channels = await listSlackChannels(decryptSecret(conn.accessTokenEncrypted));
    res.json({ items: channels });
  } catch (err) {
    next(err);
  }
});

const SelectChannelSchema = z.object({ channelId: z.string().min(1), channelName: z.string().min(1) });

slackRouter.post("/channel", async (req, res, next) => {
  try {
    const { channelId, channelName } = SelectChannelSchema.parse(req.body);
    const conn = await activeConnection(req.tenantId!);
    if (!conn) throw Errors.badRequest("Slack is not connected for this tenant");

    const token = decryptSecret(conn.accessTokenEncrypted);
    // Verify we can actually post before saving the selection.
    await postSlackMessage(token, channelId, "ReachInbox is now connected to this channel ✅");

    await prisma.slackConnection.update({
      where: { id: conn.id },
      data: { channelId, channelName },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

slackRouter.post("/disconnect", async (req, res, next) => {
  try {
    const conn = await activeConnection(req.tenantId!);
    if (conn) {
      await prisma.slackConnection.update({
        where: { id: conn.id },
        data: { disconnectedAt: new Date() },
      });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
