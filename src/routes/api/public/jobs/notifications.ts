import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Runs every minute: creates upcoming task reminders and delivers pending notices to devices.
export const Route = createFileRoute("/api/public/jobs/notifications")({ staticData: { sitemap: false }, server: { handlers: { POST: async ({ request }) => {
  const failure = await authenticateCronRequest(request);
  if (failure) return failure;
  const { generateTaskReminders } = await import("@/lib/task-reminders.server");
  const { dispatchPendingPush } = await import("@/lib/push.server");
  const created = await generateTaskReminders().catch(() => 0);
  const sent = await dispatchPendingPush(new URL(request.url).origin);
  return Response.json({ ok: true, created, sent });
} } } });
