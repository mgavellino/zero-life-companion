import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { createThread } from "./chat";

export const Route = createFileRoute("/_authenticated/chat/")({
  beforeLoad: async () => {
    const { data } = await supabase.from("threads").select("id").order("updated_at", { ascending: false }).limit(1);
    const id = data?.[0]?.id ?? (await createThread());
    throw redirect({ to: "/chat/$threadId", params: { threadId: id }, replace: true });
  },
});
