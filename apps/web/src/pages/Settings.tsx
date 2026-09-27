import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import { useToast } from "../components/Toast";
import type { SlackStatusDTO, SenderDTO } from "@reachinbox/shared";

interface SlackChannel {
  id: string;
  name: string;
}

const SenderSchema = z.object({
  label: z.string().min(1, "Label is required"),
  smtpHost: z.string().min(1, "SMTP Host is required"),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpUser: z.string().min(1, "SMTP User is required"),
  smtpPass: z.string().min(1, "SMTP Password is required"),
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
    mutationFn: (channel: SlackChannel) =>
      api.post("/api/slack/channel", { channelId: channel.id, channelName: channel.name }),
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-800">Slack Notifications</h2>
      <p className="mt-1 text-xs text-slate-500">
        Get notified in Slack the moment a sender hits its hourly rate limit or when a campaign completes.
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
                type="button"
                onClick={() => selectChannel.mutate(ch)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  status.channelName === ch.name
                    ? "border-brand-500 bg-brand-50 text-brand-700 font-medium"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                #{ch.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => disconnect.mutate()}
            className="text-xs text-red-500 hover:underline font-medium"
          >
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
  const [verifying, setVerifying] = useState(false);

  const { data } = useQuery<{ items: SenderDTO[] }>({
    queryKey: ["senders"],
    queryFn: () => api.get("/api/senders"),
  });

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<SenderFormValues>({
    resolver: zodResolver(SenderSchema),
    defaultValues: {
      smtpHost: "smtp.ethereal.email",
      smtpPort: 587,
      maxEmailsPerHour: 200,
      minSendIntervalMs: 2000,
    },
  });

  const createSender = useMutation({
    mutationFn: (values: SenderFormValues) => api.post("/api/senders", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senders"] });
      push("Sender account added successfully", "success");
      reset();
      setShowForm(false);
    },
    onError: (err: ApiError) => push(err.message, "error"),
  });

  const deleteSender = useMutation({
    mutationFn: (id: string) => api.delete(`/api/senders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senders"] });
      push("Sender account deleted", "success");
    },
    onError: (err: ApiError) => push(err.message, "error"),
  });

  async function testConnection() {
    const values = getValues();
    if (!values.smtpHost || !values.smtpUser || !values.smtpPass) {
      push("Please fill in SMTP Host, User, and Password before testing connection", "error");
      return;
    }
    setVerifying(true);
    try {
      const res = await api.post<{ ok: boolean; message?: string; error?: string }>("/api/senders/verify", {
        smtpHost: values.smtpHost,
        smtpPort: values.smtpPort,
        smtpUser: values.smtpUser,
        smtpPass: values.smtpPass,
      });
      if (res.ok) {
        push("SMTP Connection & Credentials Verified Successfully! ✅", "success");
      } else {
        push(res.error || "SMTP Verification Failed", "error");
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "SMTP Verification Failed";
      push(msg, "error");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">Sender Accounts (SMTP)</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure SMTP credentials for campaign email delivery (Ethereal test accounts or Real SMTP providers).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition"
        >
          {showForm ? "Cancel" : "+ Add Sender Account"}
        </button>
      </div>

      <ul className="mt-4 divide-y divide-slate-100 text-sm">
        {data?.items.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{s.label}</span>
                {s.isTestSender ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                    Ethereal Test
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                    Real SMTP Provider
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {s.smtpUser} @ {s.smtpHost}:{s.smtpPort}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                {s.maxEmailsPerHour}/hr · {s.minSendIntervalMs}ms limit
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete sender account "${s.label}"?`)) {
                    deleteSender.mutate(s.id);
                  }
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {!data?.items.length && (
          <li className="py-4 text-center text-xs text-slate-400">No sender accounts configured yet.</li>
        )}
      </ul>

      {showForm && (
        <form
          onSubmit={handleSubmit((v) => createSender.mutate(v))}
          className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm"
        >
          <h3 className="font-medium text-slate-800 text-xs uppercase tracking-wider">New SMTP Sender Configuration</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Account Label</label>
              <input
                placeholder="e.g. Production Gmail / SendGrid / Ethereal Test"
                {...register("label")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 focus:outline-brand-500"
              />
              {errors.label && <p className="mt-1 text-xs text-red-600">{errors.label.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">SMTP Host</label>
              <input
                placeholder="smtp.ethereal.email or smtp.gmail.com / smtp.sendgrid.net"
                {...register("smtpHost")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 focus:outline-brand-500"
              />
              {errors.smtpHost && <p className="mt-1 text-xs text-red-600">{errors.smtpHost.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">SMTP Port</label>
              <input
                type="number"
                placeholder="587 or 465"
                {...register("smtpPort")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 focus:outline-brand-500"
              />
              {errors.smtpPort && <p className="mt-1 text-xs text-red-600">{errors.smtpPort.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">SMTP Username / Email</label>
              <input
                placeholder="user@domain.com"
                {...register("smtpUser")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 focus:outline-brand-500"
              />
              {errors.smtpUser && <p className="mt-1 text-xs text-red-600">{errors.smtpUser.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">SMTP Password / App Secret</label>
              <input
                type="password"
                placeholder="••••••••••••"
                {...register("smtpPass")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 focus:outline-brand-500"
              />
              {errors.smtpPass && <p className="mt-1 text-xs text-red-600">{errors.smtpPass.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Max Emails / Hour</label>
              <input
                type="number"
                placeholder="200"
                {...register("maxEmailsPerHour")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 focus:outline-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Min Send Interval (ms)</label>
              <input
                type="number"
                placeholder="2000"
                {...register("minSendIntervalMs")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 focus:outline-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={testConnection}
              disabled={verifying}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {verifying ? "Verifying SMTP Connection…" : "⚡ Test Connection"}
            </button>
            <button
              type="submit"
              disabled={createSender.isPending}
              className="rounded-md bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {createSender.isPending ? "Saving…" : "Save Sender Account"}
            </button>
          </div>
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
