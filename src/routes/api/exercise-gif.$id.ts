import { createFileRoute } from "@tanstack/react-router";

// Proxies ExerciseDB demo GIFs so the API key never reaches the browser.
export const Route = createFileRoute("/api/exercise-gif/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = process.env["EXERCISEDB_API_KEY"];
        if (!key || !/^\d{1,6}$/.test(params.id)) return new Response("Not found", { status: 404 });
        const r = await fetch(`https://exercisedb.p.rapidapi.com/image?exerciseId=${params.id}&resolution=360`, {
          headers: { "x-rapidapi-key": key, "x-rapidapi-host": "exercisedb.p.rapidapi.com" },
        });
        if (!r.ok) return new Response("Not found", { status: 404 });
        return new Response(r.body, {
          headers: { "content-type": r.headers.get("content-type") ?? "image/gif", "cache-control": "public, max-age=604800" },
        });
      },
    },
  },
});
