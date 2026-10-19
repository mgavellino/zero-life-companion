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
- Onboarding is enforced at the authenticated shell using persisted owner-only preferences, with optional measurements and explicit health consent; this covers email and social signups without editing the managed auth gate.
- Activity logging uses one authenticated server-only Groq estimator shared by chat and diet; this keeps consent, ownership and uncertainty rules consistent.
- Personal data exports use the caller's RLS client, parent-child policies verify ownership, and identity transitions clear query caches to prevent cross-account content reuse.
- Chat shows only customer-facing prose and action confirmations; raw tool inputs, outputs, reasoning and provider errors must never be rendered.
- Habits use stable definitions plus date-scoped completion rows, never generated daily tasks; this preserves an empty initial agenda and completion history.
- Energy estimates and financial projections use tested pure functions in `src/lib/planning.ts`; persistent inputs stay in owner-scoped tables so results follow saved user data.
- AI chat runs in `src/routes/api/chat.ts` → `src/lib/ai/chat.server.ts` using the user's own free Groq key (GROQ_API_KEY); never route AI through the Lovable AI Gateway (owner requirement).
- Chat is ONE continuous conversation per user (single `threads` row) at `/chat`; the prompt injects `memories` plus tasks/money/meals.
- Voice: premium TTS via ElevenLabs at `/api/tts` (Pro/Max/trial, checked server-side), browser speechSynthesis fallback; speech input via Web Speech API. Chat opens in voice mode by default.
- Diet meals are logged from free text; `logMealAuto` asks Groq for calories/macros.
- Theme (localStorage `zero-theme`) and language (`zero-lang`, i18next in `src/lib/i18n.ts`) are toggled from `Prefs`, present on every page.
- Billing: Paddle via `src/lib/paddle*.ts`; webhook at `src/routes/api/public/payments/webhook.ts` writes `subscriptions`; plan prices/limits live in `src/lib/plans.ts` and must match the payment catalog.
- Admin uses `user_roles` + `has_role()`; never store roles on profiles. Notifications are rows in `notifications` (realtime → toast + browser Notification).
- Plan resolution: effective plan = highest of live subscription and active admin `plan_grants` row; resolved server-side via `getUserPlan` (src/lib/plan.server.ts) and per-plan limits in `LIMITS` (src/lib/plans.ts). Why: admins can grant plans without touching billing.
