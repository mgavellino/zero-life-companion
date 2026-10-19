CREATE TABLE public.recurring_bills (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), title text NOT NULL CHECK(length(title) BETWEEN 1 AND 120), amount numeric NOT NULL CHECK(amount>0), category text NOT NULL DEFAULT 'outros', due_day integer NOT NULL CHECK(due_day BETWEEN 1 AND 31), reminder_days integer NOT NULL DEFAULT 2 CHECK(reminder_days BETWEEN 0 AND 14), starts_on date NOT NULL DEFAULT CURRENT_DATE, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_bills TO authenticated;
GRANT ALL ON public.recurring_bills TO service_role;
ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY bills_owner ON public.recurring_bills FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE TABLE public.bill_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), bill_id uuid NOT NULL REFERENCES public.recurring_bills(id) ON DELETE CASCADE, due_on date NOT NULL, transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL, paid_at timestamptz NOT NULL DEFAULT now(), UNIQUE(bill_id,due_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_payments TO authenticated;
GRANT ALL ON public.bill_payments TO service_role;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_owner ON public.bill_payments FOR ALL TO authenticated USING(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.recurring_bills b WHERE b.id=bill_id AND b.user_id=auth.uid())) WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.recurring_bills b WHERE b.id=bill_id AND b.user_id=auth.uid()));
ALTER TABLE public.notifications ADD COLUMN reminder_key text;
CREATE UNIQUE INDEX notification_reminder_unique ON public.notifications(user_id,reminder_key) WHERE reminder_key IS NOT NULL;
CREATE OR REPLACE FUNCTION public.bill_due_date(y integer,m integer,d integer) RETURNS date LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT make_date(y,m,least(d,extract(day FROM (make_date(y,m,1)+interval '1 month -1 day'))::integer)) $$;
CREATE OR REPLACE FUNCTION public.pay_monthly_bill(_bill_id uuid,_due_on date) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE b public.recurring_bills; tx uuid; BEGIN
 SELECT * INTO b FROM public.recurring_bills WHERE id=_bill_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Conta indisponível'; END IF;
 IF _due_on< b.starts_on OR _due_on<>public.bill_due_date(extract(year FROM _due_on)::integer,extract(month FROM _due_on)::integer,b.due_day) THEN RAISE EXCEPTION 'Vencimento inválido'; END IF;
 SELECT transaction_id INTO tx FROM public.bill_payments WHERE bill_id=b.id AND due_on=_due_on;
 IF FOUND THEN RETURN tx; END IF;
 INSERT INTO public.transactions(user_id,kind,amount,category,description,occurred_on) VALUES(auth.uid(),'expense',b.amount,b.category,b.title,CURRENT_DATE) RETURNING id INTO tx;
 INSERT INTO public.bill_payments(user_id,bill_id,due_on,transaction_id) VALUES(auth.uid(),b.id,_due_on,tx);
 RETURN tx; END $$;
REVOKE ALL ON FUNCTION public.pay_monthly_bill(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pay_monthly_bill(uuid,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.generate_bill_reminders() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE added integer; BEGIN
 INSERT INTO public.notifications(user_id,title,body,kind,link,reminder_key)
 SELECT b.user_id,CASE WHEN due.d < localday.d THEN 'Conta em atraso: ' WHEN due.d=localday.d THEN 'Vence hoje: ' ELSE 'Conta a vencer: ' END||b.title,
 'Vencimento: '||to_char(due.d,'DD/MM/YYYY')||'. Marque como paga em Dinheiro após efetuar o pagamento.', 'reminder','/dinheiro','bill:'||b.id||':'||due.d||':'||CASE WHEN due.d<localday.d THEN 'late' WHEN due.d=localday.d THEN 'due' ELSE 'soon' END
 FROM public.recurring_bills b LEFT JOIN public.user_preferences p ON p.user_id=b.user_id
 CROSS JOIN LATERAL (SELECT (now() AT TIME ZONE coalesce(p.timezone,'America/Sao_Paulo'))::date d) localday
 CROSS JOIN LATERAL generate_series(date_trunc('month',localday.d)-interval '1 month',date_trunc('month',localday.d)+interval '1 month',interval '1 month') mo
 CROSS JOIN LATERAL (SELECT public.bill_due_date(extract(year FROM mo)::integer,extract(month FROM mo)::integer,b.due_day) d) due
 WHERE b.active AND due.d>=b.starts_on AND localday.d BETWEEN due.d-b.reminder_days AND due.d+7 AND NOT EXISTS(SELECT 1 FROM public.bill_payments bp WHERE bp.bill_id=b.id AND bp.due_on=due.d)
 ON CONFLICT (user_id,reminder_key) WHERE reminder_key IS NOT NULL DO NOTHING;
 GET DIAGNOSTICS added=ROW_COUNT; RETURN added; END $$;
REVOKE ALL ON FUNCTION public.generate_bill_reminders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.generate_bill_reminders() TO service_role;