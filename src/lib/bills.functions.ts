import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { automaticCategory, billSchema } from "./bills";

export const listBills = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [bills, payments] = await Promise.all([
    context.supabase.from("recurring_bills").select("*").eq("user_id",context.userId).eq("active",true).order("due_day"),
    context.supabase.from("bill_payments").select("bill_id,due_on").eq("user_id",context.userId),
  ]);
  if (bills.error || payments.error) throw new Error("Não foi possível carregar as contas.");
  return { bills: bills.data, payments: payments.data };
});
export const createBill = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => billSchema.parse(input)).handler(async ({ data, context }) => {
  const {error}=await context.supabase.from("recurring_bills").insert({...data,user_id:context.userId,category:automaticCategory(data.title,data.category)});
  if(error) throw new Error("Não foi possível cadastrar a conta.");
  return {ok:true};
});
export const payBill = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => z.object({id:z.string().uuid(),due_on:z.string().date()}).parse(input)).handler(async ({ data, context }) => {
  const {error}=await context.supabase.rpc("pay_monthly_bill",{_bill_id:data.id,_due_on:data.due_on});
  if(error) throw new Error("Não foi possível confirmar o pagamento.");
  return {ok:true};
});
export const archiveBill = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => z.object({id:z.string().uuid()}).parse(input)).handler(async ({ data, context }) => {
  const {error}=await context.supabase.from("recurring_bills").update({active:false}).eq("id",data.id).eq("user_id",context.userId);
  if(error) throw new Error("Não foi possível remover a conta mensal.");
  return {ok:true};
});