import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { SlackStatusDTO } from "@reachinbox/shared";

type SlackChannel = {
  id: string;
  name: string;
};

export function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [channelId, setChannelId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [notice, setNotice] = useState("");

  const { data: slack, isLoading } = useQuery<SlackStatusDTO>({
    queryKey: ["slack-status"],
    queryFn: () => api.get<SlackStatusDTO>("/api/slack/status"),
  });

  const { data: channelData, isLoading: channelsLoading } = useQuery<{
    items: SlackChannel[];
  }>({
    queryKey: ["slack-channels"],
    queryFn: () => api.get<{ items: SlackChannel[] }>("/api/slack/channels"),
    enabled: slack?.connected === true,
  });

  const disconnect = useMutation({
    mutationFn: () => api.post("/api/slack/disconnect", {}),
    onSuccess: async () => {
      setChannelId("");
      setChannelName("");
      setNotice("Slack disconnected.");
      await queryClient.invalidateQueries({ queryKey: ["slack-status"] });
      await queryClient.invalidateQueries({ queryKey: ["slack-channels"] });
    },
    onError: () => setNotice("Could not disconnect Slack. Please try again."),
  });

  const saveChannel = useMutation({
    mutationFn: () =>
      api.post("/api/slack/channel", { channelId, channelName }),
    onSuccess: async () => {
      setNotice(`Notifications enabled for #${channelName}.`);
      await queryClient.invalidateQueries({ queryKey: ["slack-status"] });
    },
    onError: () =>
      setNotice("Could not save the channel. Check the bot's channel access."),
  });

  const handleSlackConnect = () => {
    window.location.assign("/api/slack/oauth/authorize");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect your tools to ReachInbox.
        </p>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
        >
          <div className="flex items-center justify-between gap-3">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="text-slate-500 hover:text-slate-900"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex-1 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 p-2">
                <img
                  src="https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg"
                  alt="Slack"
                  className="h-full w-full"
                />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Slack</h2>
                <p className="text-xs text-slate-500">
                  Campaign notifications
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Receive campaign updates and email failure notifications in a
              Slack channel.
            </p>

            {isLoading && (
              <p className="mt-4 text-sm text-slate-500">Checking connection…</p>
            )}

            {!isLoading && slack?.connected && (
              <div className="mt-4 space-y-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-sm font-medium text-emerald-800">
                  Connected to {slack.teamName}
                </p>

                <label
                  htmlFor="slack-channel"
                  className="block text-xs font-medium text-slate-700"
                >
                  Notification channel
                </label>

                <select
                  id="slack-channel"
                  value={channelId}
                  onChange={(event) => {
                    const selected = channelData?.items.find(
                      (item) => item.id === event.target.value,
                    );
                    setChannelId(selected?.id ?? "");
                    setChannelName(selected?.name ?? "");
                  }}
                  disabled={channelsLoading || saveChannel.isPending}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <option value="">
                    {channelsLoading ? "Loading channels…" : "Select a channel"}
                  </option>
                  {(channelData?.items ?? []).map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>

                {slack.channelName && (
                  <p className="text-xs text-emerald-700">
                    Currently posting to #{slack.channelName}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => saveChannel.mutate()}
                  disabled={!channelId || saveChannel.isPending}
                  className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveChannel.isPending ? "Saving…" : "Save channel"}
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
            {!isLoading &&
              (slack?.connected ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Disconnect this Slack workspace?")) {
                      disconnect.mutate();
                    }
                  }}
                  disabled={disconnect.isPending}
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSlackConnect}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Connect to Slack
                </button>
              ))}
          </div>
        </section>

        <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white opacity-75">
          <div className="flex-1 p-5">
            <h2 className="font-semibold text-slate-900">Google Workspace</h2>
            <p className="mt-2 text-sm text-slate-600">
              Connect a Google account for email sending through OAuth.
            </p>
            <span className="mt-4 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              Coming soon
            </span>
          </div>
          <div className="border-t border-slate-100 bg-slate-50 p-4">
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-400"
            >
              Connect
            </button>
          </div>
        </section>

        <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white opacity-75">
          <div className="flex-1 p-5">
            <h2 className="font-semibold text-slate-900">Webhooks</h2>
            <p className="mt-2 text-sm text-slate-600">
              Send ReachInbox events to your own applications.
            </p>
            <span className="mt-4 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              Coming soon
            </span>
          </div>
          <div className="border-t border-slate-100 bg-slate-50 p-4">
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-400"
            >
              Configure
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
