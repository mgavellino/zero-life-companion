import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import i18n from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { MCP_TOOL_NAMES } from "@/lib/mcp/catalog";
import { Page, Card } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/assistentes")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: i18n.t("agents.metaTitle") },
      { name: "description", content: i18n.t("agents.metaDescription") },
      { property: "og:title", content: i18n.t("agents.metaTitle") },
      { property: "og:description", content: i18n.t("agents.metaDescription") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Assistentes,
});

type Grant = { client: { id: string; name?: string; client_name?: string; logo_uri?: string }; granted_at: string };

function Assistentes() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const grants = useQuery({
    queryKey: ["mcp-grants"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.oauth.listGrants();
      if (error) throw error;
      return (data ?? []) as unknown as Grant[];
    },
  });
  const blocks = useQuery({
    queryKey: ["mcp-tool-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mcp_tool_blocks").select("client_id,tool_name");
      if (error) throw error;
      return new Set((data ?? []).map((b) => `${b.client_id}:${b.tool_name}`));
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ clientId, tool, allow }: { clientId: string; tool: string; allow: boolean }) => {
      if (allow) {
        const { error } = await supabase.from("mcp_tool_blocks").delete().eq("client_id", clientId).eq("tool_name", tool);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("signed out");
        const { error } = await supabase.from("mcp_tool_blocks").insert({ user_id: u.user.id, client_id: clientId, tool_name: tool });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp-tool-blocks"] }),
    onError: () => toast.error(t("agents.error")),
  });

  const revoke = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.auth.oauth.revokeGrant({ clientId });
      if (error) throw error;
      await supabase.from("mcp_tool_blocks").delete().eq("client_id", clientId);
    },
    onSuccess: () => { toast.success(t("agents.revoked")); qc.invalidateQueries({ queryKey: ["mcp-grants"] }); qc.invalidateQueries({ queryKey: ["mcp-tool-blocks"] }); },
    onError: () => toast.error(t("agents.error")),
  });

  return (
    <Page title={t("agents.title")} kicker={t("agents.kicker")}>
      {grants.isError || blocks.isError ? (
        <Card>
          <p className="text-sm text-muted-foreground">{t("agents.loadError")}</p>
          <Button className="mt-3" variant="outline" onClick={() => { void grants.refetch(); void blocks.refetch(); }}>{t("agents.retry")}</Button>
        </Card>
      ) : grants.isPending || blocks.isPending ? null : grants.data.length === 0 ? (
        <Card><p className="text-sm text-muted-foreground">{t("agents.empty")}</p></Card>
      ) : (
        <div className="grid gap-4">
          {grants.data.map((g) => {
            const name = g.client.name ?? g.client.client_name ?? g.client.id;
            return (
              <Card key={g.client.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {g.client.logo_uri ? <img src={g.client.logo_uri} alt="" className="size-9 rounded-md" /> : <Bot className="size-9 rounded-md bg-muted p-2" />}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{name}</p>
                      <p className="text-xs text-muted-foreground">{t("agents.since", { date: new Date(g.granted_at).toLocaleDateString(i18n.language) })}</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm">{t("agents.revoke")}</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("agents.revokeTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("agents.revokeBody", { name })}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("agents.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => revoke.mutate(g.client.id)}>{t("agents.revoke")}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <p className="mt-4 text-sm font-medium">{t("agents.tools")}</p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {MCP_TOOL_NAMES.map((tool) => {
                    const allowed = !blocks.data.has(`${g.client.id}:${tool}`);
                    return (
                      <li key={tool} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                        <span className="min-w-0 text-sm">{t(`agents.t_${tool}`)}</span>
                        <Switch checked={allowed} disabled={toggle.isPending} aria-label={t(`agents.t_${tool}`)} onCheckedChange={(v) => toggle.mutate({ clientId: g.client.id, tool, allow: v })} />
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}
