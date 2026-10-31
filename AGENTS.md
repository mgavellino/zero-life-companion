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
- Personal metrics render only after saved inputs exist (no zero-filled states).
- Onboarding is enforced in the authenticated shell via owner-only preferences, optional measurements and explicit health consent.
- Unlisted activity calories use one server-only Groq estimator.
- Data access uses the caller's RLS client; child policies verify parent ownership; identity transitions clear query caches.
- Chat renders only customer-facing prose and action confirmations; never raw tool I/O, reasoning or provider errors. Financial receipts render only validated saved fields after persistence.
- Habits are stable definitions plus date-scoped completion rows, never generated daily tasks.
- Energy and financial projections are tested pure functions in `src/lib/planning.ts` fed by owner-scoped tables.
- AI runs in `src/routes/api/chat.ts` → `src/lib/ai/chat.server.ts` with the owner's Groq key; never the Lovable AI Gateway (owner requirement).
- No chat screen: a shared CommandBar on every tab sends one-off text/voice commands to `/api/chat` (saved to the single per-user thread) and shows the reply as a toast; voice is MediaRecorder → `/api/stt` (Whisper), never browser speech recognition.
- Voice: ElevenLabs TTS at `/api/tts` (plan checked server-side) with speechSynthesis fallback; a single text chat includes optional one-utterance microphone dictation for review before sending, with recorder input and Web Speech fallback; no separate voice screen.
- Chat: rule-parsed commands (`src/lib/quick-intent.ts`: money, reminders; meals: owner `custom_foods`, TACO, Open Food Facts; exercise: `custom_exercises`, MET) save with no model call; otherwise generation stops after saved actions with deterministic confirmations (`src/lib/chat-confirmations.ts`); only recent turns reach the model; recovery requests cannot run tools or duplicate the user message.
- Chat uses a height-constrained shell with progress and cancellation beside its composer; explicit cancellation propagates to generation and partial replies are saved by the browser because edge disconnect callbacks are unreliable.
- Voice playback forces full volume and the playback audio session; paused recording disables mic tracks (avoids quiet iOS call routing).
- All user-facing strings use i18n keys in `src/locales/*` (6 languages) merged by `src/lib/i18n.ts`; unit prefs live in `src/lib/units.ts`, money display uses `money()` in `src/lib/data.ts`.
- Billing: Paddle; one webhook writer upserts every `subscription.*` event (out-of-order guarded, DB errors → 500 retry). Access rules (grace, best-of-many subs, one trial) live in tested `src/lib/entitlement.ts`, used by `getUserPlan` and the client hook. Plan changes update the existing subscription; `*_direct` prices are the no-trial variants. Prices in `src/lib/plans.ts` must match the catalog.
- Admin uses `user_roles` + `has_role()`, never profile columns. Notifications are `notifications` rows (realtime → toast).
- Deployment stays host-portable (no Cloudflare-only server code; Node 22 `.nvmrc`): owner also deploys to Vercel.
- External agents connect via the MCP server in `src/lib/mcp/` (OAuth-verified, caller-scoped RLS, no service role); sign-in honours a validated `next`.

- Subdirectories may have their own `AGENTS.md`; read it before changing files there.
- Admin privileged actions (list all users, block/delete, broadcast, coupons) run in `src/lib/admin.functions.ts`, which verifies `has_role` with the caller client before loading the service client; promotions are a public-read, admin-write table.
- Barcode (Open Food Facts server fn) and CSV imports (`src/lib/csv-import.ts`) never use AI.
