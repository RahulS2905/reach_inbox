const SLACK_API = "https://slack.com/api";

export async function postSlackMessage(botToken: string, channelId: string, text: string) {
  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({ channel: channelId, text }),
  });
  const json = (await res.json()) as { ok: boolean; error?: string };
  if (!json.ok) throw new Error(`Slack chat.postMessage failed: ${json.error ?? "unknown_error"}`);
  return json;
}
