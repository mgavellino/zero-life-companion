import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Zero" },
      { name: "description", content: "Converse com o Zero, seu assistente pessoal." },
      { property: "og:title", content: "Chat — Zero" },
      { property: "og:description", content: "Converse com o Zero." },
    ],
  }),
  component: ChatLayout,
});

export const threadsQuery = {
  queryKey: ["threads"],
  queryFn: async () => {
    const { data, error } = await supabase.from("threads").select("id,title,updated_at").order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },
};

export async function createThread() {
  const { data, error } = await supabase.from("threads").insert({}).select("id").single();
  if (error) throw error;
  return data.id;
}

function ChatLayout() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: threads = [] } = useQuery(threadsQuery);

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 flex-col border-r lg:flex">
        <div className="p-3">
          <Button
            className="w-full justify-start gap-2"
            onClick={async () => {
              const id = await createThread();
              await qc.invalidateQueries({ queryKey: ["threads"] });
              navigate({ to: "/chat/$threadId", params: { threadId: id } });
            }}
          >
            <Plus className="size-4" /> {t("newChat")}
          </Button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {threads.map((th) => (
            <div key={th.id} className="group flex items-center rounded-lg hover:bg-muted">
              <Link
                to="/chat/$threadId"
                params={{ threadId: th.id }}
                className="min-w-0 flex-1 truncate px-3 py-2 text-sm text-muted-foreground"
                activeProps={{ className: "!text-foreground font-semibold" }}
              >
                {th.title}
              </Link>
              <button
                aria-label={t("delete")}
                className="mr-2 hidden text-muted-foreground hover:text-destructive group-hover:block"
                onClick={async () => {
                  await supabase.from("threads").delete().eq("id", th.id);
                  await qc.invalidateQueries({ queryKey: ["threads"] });
                  navigate({ to: "/chat" });
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 border-t p-3 text-xs text-muted-foreground">
          <Brain className="mt-0.5 size-4 shrink-0 text-primary dark:text-primary" />
          {t("sharedMemory")}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
