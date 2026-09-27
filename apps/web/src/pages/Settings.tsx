import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import { useToast } from "../components/Toast";
import type { SlackStatusDTO } from "@reachinbox/shared";

interface SlackChannel {
  id: string;
  name: string;
}
interface SenderOption {
  id: string;
  label: string;
  smtpHost: string;
  smtpUser: string;
  maxEmailsPerHour: number;
  minSendIntervalMs: number;
}

const SenderSchema = z.object({
  label: z.string().min(1),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().default(587),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  maxEmailsPerHour: z.coerce.number().int().min(1).default(200),
  minSendIntervalMs: z.coerce.number().int().min(0).default(2000),
});
type SenderFormValues = z.infer<typeof SenderSchema>;

function SlackSettings() {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const { data: status } = useQuery<SlackStatusDTO>({
    queryKey: ["slack-status"],
    queryFn: () => api.get("/api/slack/status"),
  });
  const { data: channels } = useQuery<{ items: SlackChannel[] }>({
    queryKey: ["slack-channels"],
    queryFn: () => api.get("/api/slack/channels"),
    enabled: !!status?.connected,
  });

  const selectChannel = useMutation({
    mutationFn: (channel: SlackChannel) => api.post("/api/slack/channel", { channelId: channel.id, channelName: channel.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slack-status"] });
      push("Slack channel connected — check it for a confirmation message", "success");
    },
    onError: (err: ApiError) => push(err.message, "error"),
  });

  const disconnect = useMutation({
    mutationFn: () => api.post("/api/slack/disconnect"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["slack-status"] }),
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-medium text-slate-800">Slack notifications</h2>
      <p className="mt-1 text-xs text-slate-500">
        Get notified in Slack the moment a sender hits its hourly rate limit.
      </p>

      {!status?.connected ? (
        <a
          href="/api/slack/oauth/authorize"
          className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Connect Slack
        </a>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-emerald-700">
            Connected to <strong>{status.teamName}</strong>
            {status.channelName ? ` — posting to #${status.channelName}` : " — choose a channel below"}
          </p>
          <div className="flex flex-wrap gap-2">
            {channels?.items.map((ch) => (
              <button
                key={ch.id}
                onClick={() => selectChannel.mutate(ch)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  status.channelName === ch.name ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
                }`}
              >
                #{ch.name}
              </button>
            ))}
          </div>
          <button onClick={() => disconnect.mutate()} className="text-xs text-red-500 hover:underline">
            Disconnect Slack
          </button>
        </div>
      )}
    </div>
  );
}

function SendersSettings() {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data } = useQuery<{ items: SenderOption[] }>({
    queryKey: ["senders"],
    queryFn: () => api.get("/api/senders"),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SenderFormValues>({
    resolver: zodResolver(SenderSchema),
    defaultValues: { smtpHost: "smtp.ethereal.email", smtpPort: 587, maxEmailsPerHour: 200, minSendIntervalMs: 2000 },
  });

  const createSender = useMutation({
    mutationFn: (values: SenderFormValues) => api.post("/api/senders", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senders"] });
      push("Sender added", "success");
      reset();
      setShowForm(false);
    },
    onError: (err: ApiError) => push(err.message, "error"),
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-800">Sender accounts</h2>
        <button onClick={() => setShowForm((s) => !s)} className="text-xs font-medium text-brand-600 hover:underline">
          {showForm ? "Cancel" : "+ Add sender"}
        </button>
      </div>

      <ul className="mt-3 divide-y divide-slate-100 text-sm">
        {data?.items.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2">
            <span>{s.label}</span>
            <span className="text-xs text-slate-400">
              {s.maxEmailsPerHour}/hr · {s.minSendIntervalMs}ms spacing
            </span>
          </li>
        ))}
        {!data?.items.length && <li className="py-2 text-xs text-slate-400">No senders configured yet.</li>}
      </ul>

      {showForm && (
        <form onSubmit={handleSubmit((v) => createSender.mutate(v))} className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <input placeholder="Label" {...register("label")} className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5" />
          <input placeholder="SMTP host" {...register("smtpHost")} className="rounded-md border border-slate-300 px-2 py-1.5" />
          <input type="number" placeholder="Port" {...register("smtpPort")} className="rounded-md border border-slate-300 px-2 py-1.5" />
          <input placeholder="SMTP user" {...register("smtpUser")} className="rounded-md border border-slate-300 px-2 py-1.5" />
          <input placeholder="SMTP password" type="password" {...register("smtpPass")} className="rounded-md border border-slate-300 px-2 py-1.5" />
          <input type="number" placeholder="Max emails/hour" {...register("maxEmailsPerHour")} className="rounded-md border border-slate-300 px-2 py-1.5" />
          <input type="number" placeholder="Min interval (ms)" {...register("minSendIntervalMs")} className="rounded-md border border-slate-300 px-2 py-1.5" />
          {errors.label && <p className="col-span-2 text-xs text-red-600">{errors.label.message}</p>}
          <button type="submit" className="col-span-2 rounded-md bg-brand-600 py-1.5 text-white">
            Save sender
          </button>
        </form>
      )}
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
      <SlackSettings />
      <SendersSettings />
    </div>
  );
}
