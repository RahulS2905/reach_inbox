import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import { useToast } from "./Toast";

const FormSchema = z.object({
  senderAccountId: z.string().min(1, "Choose a sender"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  startTime: z.string().min(1, "Start time is required"),
  delayMs: z.coerce.number().int().min(0),
  hourlyLimit: z.coerce.number().int().min(1),
});
type FormValues = z.infer<typeof FormSchema>;

interface SenderOption {
  id: string;
  label: string;
}

export function ComposeModal({ onClose }: { onClose: () => void }) {
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [recipientPreviewCount, setRecipientPreviewCount] = useState<number | null>(null);

  const { data: senders } = useQuery<{ items: SenderOption[] }>({
    queryKey: ["senders"],
    queryFn: () => api.get("/api/senders"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { delayMs: 2000, hourlyLimit: 200 },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!file) throw new ApiError(400, "Attach a CSV/TXT recipient list");
      const form = new FormData();
      form.append("senderAccountId", values.senderAccountId);
      form.append("subject", values.subject);
      form.append("body", values.body);
      form.append("startTime", new Date(values.startTime).toISOString());
      form.append("delayMs", String(values.delayMs));
      form.append("hourlyLimit", String(values.hourlyLimit));
      form.append("recipients", file);

      return api.post<{ validRecipients: number; invalidRecipients: string[]; duplicatesRemoved: number }>(
        "/api/emails/schedule",
        form,
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      );
    },
    onSuccess: (result: { validRecipients: number; invalidRecipients: string[]; duplicatesRemoved: number }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-emails"] });
      push(
        `Scheduled ${result.validRecipients} email(s)` +
          (result.invalidRecipients.length ? ` — ${result.invalidRecipients.length} invalid address(es) skipped` : ""),
        "success",
      );
      onClose();
    },
    onError: (err: ApiError) => push(err.message, "error"),
  });

  function handleFileChange(f: File | null) {
    setFile(f);
    setRecipientPreviewCount(null);
    if (!f) return;
    f.text().then((text) => {
      const count = text
        .split(/\r?\n/)
        .flatMap((l) => l.split(","))
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.toLowerCase() !== "email").length;
      setRecipientPreviewCount(count);
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Compose New Email</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit((values) => scheduleMutation.mutate(values))}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600">Sender</label>
            <select {...register("senderAccountId")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select a sender…</option>
              {senders?.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {errors.senderAccountId && <p className="mt-1 text-xs text-red-600">{errors.senderAccountId.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Subject</label>
            <input {...register("subject")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Body</label>
            <textarea {...register("body")} rows={5} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Recipients (CSV or TXT)</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm"
            />
            {recipientPreviewCount !== null && (
              <p className="mt-1 text-xs text-slate-500">{recipientPreviewCount} address(es) detected</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Start time</label>
              <input type="datetime-local" {...register("startTime")} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm" />
              {errors.startTime && <p className="mt-1 text-xs text-red-600">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Delay (ms)</label>
              <input type="number" {...register("delayMs")} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Hourly limit</label>
              <input type="number" {...register("hourlyLimit")} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || scheduleMutation.isPending}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {scheduleMutation.isPending ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
