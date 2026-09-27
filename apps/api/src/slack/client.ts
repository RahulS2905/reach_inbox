const SLACK_API = "https://slack.com/api";

interface SlackResponse {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

async function callSlack(method: string, token: string | undefined, body: Record<string, unknown>) {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as SlackResponse;
  if (!json.ok) throw new Error(`Slack API ${method} failed: ${json.error ?? "unknown_error"}`);
  return json;
}

export async function exchangeSlackCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const res = await fetch(`${SLACK_API}/oauth.v2.access`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
    }),
  });
  const json = (await res.json()) as SlackResponse & {
    access_token: string;
    bot_user_id: string;
    team: { id: string; name: string };
  };
  if (!json.ok) throw new Error(`Slack OAuth exchange failed: ${json.error ?? "unknown_error"}`);
  return json;
}

export async function listSlackChannels(botToken: string) {
  const json = await callSlack("conversations.list", botToken, {
    types: "public_channel,private_channel",
    limit: 200,
  });
  return json.channels as Array<{ id: string; name: string }>;
}

export async function postSlackMessage(botToken: string, channelId: string, text: string) {
  return callSlack("chat.postMessage", botToken, { channel: channelId, text });
}
