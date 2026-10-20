import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";

/** Live promotions chosen by admins, shown on the landing page. Renders nothing when none are active. */
export function PromoBanner() {
  const { data } = useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotions").select("id,title,body,cta_label,cta_url,image_url").order("created_at", { ascending: false }).limit(3);
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
  if (!data?.length) return null;
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-6 sm:px-8">
      {data.map((p) => (
        <div key={p.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-primary/40 bg-primary/10 sm:flex-row">
          {p.image_url && <img src={p.image_url} alt="" className="h-40 w-full object-cover sm:h-auto sm:w-56" loading="lazy" />}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-5">
            <p className="font-display text-xl font-semibold">{p.title}</p>
            {p.body && <p className="text-sm text-muted-foreground">{p.body}</p>}
            {p.cta_label && p.cta_url && (
              <div>
                {p.cta_url.startsWith("/") ? <Button asChild><Link to={p.cta_url as "/"}>{p.cta_label}</Link></Button> : <Button asChild><a href={p.cta_url} target="_blank" rel="noopener noreferrer">{p.cta_label}</a></Button>}
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
