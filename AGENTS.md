<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- AI chat runs in `src/routes/api/chat.ts` → `src/lib/ai/chat.server.ts` using the user's own Google Gemini key (GEMINI_API_KEY); never route AI through the Lovable AI Gateway (owner requirement).
- Chat threads are separate but share one memory: the server prompt injects `memories`, recent messages from other threads and the user's tasks/money/meals/workouts.
- Exercise demos come from ExerciseDB (RapidAPI, EXERCISEDB_API_KEY), GIFs proxied via `/api/exercise-gif/$id` so the key stays server-side.
- Theme (localStorage `zero-theme`) and language (`zero-lang`, i18next in `src/lib/i18n.ts`) are toggled from `Prefs`, present on every page.
