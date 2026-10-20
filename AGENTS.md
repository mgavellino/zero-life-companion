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
- Module-load failures recover through both global preload events and the router error boundary with a shared reload guard; caught route-import failures must not strand users on a blank page.
- Seller policies use public leaf routes with a shared legal layout; refunds defer to the merchant's authoritative policy.
- Mobile/tablet use a full drawer menu plus bottom shortcuts; layouts use shrinkable grids, never horizontal-scroll navigation.
- Home-screen install uses manifest metadata and a shared dialog; the only service worker is messaging-only (no offline cache).
- Push uses WebCrypto Web Push; VAPID keys and subscriptions are encrypted in service-role-only tables, destinations allowlisted, lock-screen text impersonal. Task reminders and push delivery run in a per-minute server job deduplicated by `reminder_key`; clients never create reminder rows.
- Google Calendar uses per-user connector OAuth with single-use owner-bound attempts and encrypted server-only handles; no shared calendar.
- Monthly bills are owner-scoped definitions plus date-scoped payments; an owner-invoker function records payment and expense once; an hourly job deduplicates reminders by bill, due date and stage.
- One browser-safe classifier assigns financial categories everywhere; explicit user categories win.
- Time tracking stores owner-only categorised durations (stacked per local day, max 24h); percentages are shares of categorised time, no stopwatch.
- Personal metrics render only after saved inputs exist; no zero-filled states implying activity.
- Onboarding is enforced in the authenticated shell via owner-only preferences, optional measurements and explicit health consent.
- Activity calorie estimates use one authenticated server-only Groq estimator shared by chat and diet.
- Data access uses the caller's RLS client; child policies verify parent ownership; identity transitions clear query caches.
- Chat renders only customer-facing prose and action confirmations; never raw tool I/O, reasoning or provider errors. Financial receipts render only validated saved fields after persistence.
- Habits are stable definitions plus date-scoped completion rows, never generated daily tasks.
- Energy and financial projections are tested pure functions in `src/lib/planning.ts` fed by owner-scoped tables.
- AI runs in `src/routes/api/chat.ts` → `src/lib/ai/chat.server.ts` with the owner's Groq key; never the Lovable AI Gateway (owner requirement).
- Chat is one continuous conversation per user (single `threads` row) at `/chat`; history is owner-scoped and paginated, model context comes from saved messages, and the stream is drained through its save callback.
- Voice: ElevenLabs TTS at `/api/tts` (plan checked server-side) with speechSynthesis fallback; a single text chat includes optional one-utterance microphone dictation for review before sending, with recorder input and Web Speech fallback; no separate voice screen.
- Chat generation stops right after a step with saved actions and the server writes deterministic confirmations (`src/lib/chat-confirmations.ts`) instead of a second model call; only recent turns go to the model (free Groq token budget); recovery requests cannot execute tools or duplicate the user message.
- Chat uses a height-constrained shell with progress and cancellation beside its composer; explicit cancellation propagates to generation and partial replies are saved by the browser because edge disconnect callbacks are unreliable.
- Voice playback explicitly uses full application volume and the playback audio session where supported; paused recording disables mic tracks and suspends analysis, then restores recording on resume to avoid quiet iOS call routing.
- All user-facing strings use i18n keys in `src/locales/*` (6 languages) merged by `src/lib/i18n.ts`; unit prefs live in `src/lib/units.ts`, money display uses `money()` in `src/lib/data.ts`.
- Billing: Paddle (`src/lib/paddle*.ts`), webhook writes `subscriptions`; prices/limits in `src/lib/plans.ts` must match the catalog. Effective plan = highest of live subscription and active `plan_grants`, resolved server-side by `getUserPlan`.
- Admin uses `user_roles` + `has_role()`, never profile columns. Notifications are `notifications` rows (realtime → toast).
- Deployment stays host-portable (no Cloudflare-only server code; Node 22 in `.nvmrc`) because the owner also deploys to Vercel with the Lovable Cloud backend.
- External agents connect via the MCP server in `src/lib/mcp/` (OAuth-verified, caller-scoped RLS client, no service role); sign-in honours a validated `next` so the consent route resumes after login.

- MCP tools are wrapped by `guarded()` in `src/lib/mcp/guard.ts`, which denies a tool when the owner has a `mcp_tool_blocks` row for that OAuth client; default is allowed so new connections work immediately.
- Admin privileged actions (list all users, block/delete, broadcast, coupons) run in `src/lib/admin.functions.ts`, which verifies `has_role` with the caller client before loading the service client; promotions are a public-read, admin-write table.
