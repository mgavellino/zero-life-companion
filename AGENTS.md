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
- Seller policies use public leaf routes and a shared legal layout/link group; refunds refer to the merchant's authoritative policy rather than inventing seller guarantees.
- Mobile and tablet use a complete drawer menu plus persistent bottom shortcuts; layouts use shrinkable grid tracks instead of horizontally scrollable navigation.
- Home-screen installation uses manifest metadata and a shared installation dialog; the only service worker is messaging-only, with no offline app-shell cache.
- Background push uses a dedicated messaging-only service worker and WebCrypto Web Push; VAPID and subscriptions are encrypted in service-role-only storage, destinations are allowlisted, and lock-screen messages contain no personal content.
- Google Calendar uses per-user connector OAuth with single-use owner-bound attempts, encrypted server-only connection handles, and authenticated provider calls; no shared builder calendar is used.
- Monthly bills are owner-scoped definitions with date-scoped payments; an atomic owner-invoker function records payment and expense once, while an authenticated hourly job deduplicates reminders by bill, due date and stage.
- Automatic financial categories share one browser-safe classifier across manual entry, quick capture, chat and monthly bills; explicit user categories take precedence.
- Time tracking stores owner-only categorised duration entries (stacked inside the chosen local day, capped at 24h) and percentages are shares of categorised time; the user logs how time was spent rather than running a stopwatch.
- Personal metrics render only after corresponding saved inputs exist; zero-filled empty states must not imply recorded activity.
- Onboarding is enforced at the authenticated shell using persisted owner-only preferences, with optional measurements and explicit health consent; this covers email and social signups without editing the managed auth gate.
- Activity logging uses one authenticated server-only Groq estimator shared by chat and diet; this keeps consent, ownership and uncertainty rules consistent.
- Personal data exports use the caller's RLS client, parent-child policies verify ownership, and identity transitions clear query caches to prevent cross-account content reuse.
- Chat shows only customer-facing prose and action confirmations; raw tool inputs, outputs, reasoning and provider errors must never be rendered.
- Financial confirmations share a receipt view and render only validated saved fields after successful persistence; this prevents premature success messages and raw tool output exposure.
- Habits use stable definitions plus date-scoped completion rows, never generated daily tasks; this preserves an empty initial agenda and completion history.
- Energy estimates and financial projections use tested pure functions in `src/lib/planning.ts`; persistent inputs stay in owner-scoped tables so results follow saved user data.
- AI chat runs in `src/routes/api/chat.ts` → `src/lib/ai/chat.server.ts` using the user's own free Groq key (GROQ_API_KEY); never route AI through the Lovable AI Gateway (owner requirement).
- Chat is ONE continuous conversation per user (single `threads` row) at `/chat`; the prompt injects `memories` plus tasks/money/meals.
- Chat history reads are owner-scoped and paginated, model context comes from saved messages, and the UI response stream is drained through its save callback; this preserves the continuous conversation across navigation and reloads.
- Voice: premium TTS via ElevenLabs at `/api/tts` (Pro/Max/trial, checked server-side), browser speechSynthesis fallback; speech input via Web Speech API. Chat opens in voice mode by default.
- Diet meals are logged from free text; `logMealAuto` asks Groq for calories/macros.
- Theme (`zero-theme`) and language (`zero-lang`) toggle from `Prefs`. All user-facing strings use i18n keys from `src/locales/*` (6 languages each), merged by `src/lib/i18n.ts` — never hardcode PT strings. Unit prefs (kg/lb, cm/ft, km/mi, 12/24h, currency) live in `src/lib/units.ts`; money display uses `money()` in `src/lib/data.ts`.
- Billing: Paddle via `src/lib/paddle*.ts`; webhook at `src/routes/api/public/payments/webhook.ts` writes `subscriptions`; plan prices/limits live in `src/lib/plans.ts` and must match the payment catalog.
- Admin uses `user_roles` + `has_role()`; never store roles on profiles. Notifications are rows in `notifications` (realtime → toast + browser Notification).
- Plan resolution: effective plan = highest of live subscription and active admin `plan_grants` row; resolved server-side via `getUserPlan` (src/lib/plan.server.ts) and per-plan limits in `LIMITS` (src/lib/plans.ts). Why: admins can grant plans without touching billing.
- Deployment stays host-portable: never hardcode Cloudflare-only assumptions in server code; the Nitro preset is auto-detected outside the sandbox (Vercel included), Node 22 is pinned in `.nvmrc`, and the Vercel deploy needs the server env secrets re-set manually. Why: the owner deploys the frontend to Vercel while keeping the Lovable Cloud backend.
