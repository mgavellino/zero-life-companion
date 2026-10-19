import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Trash2, Repeat2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { createBill, listBills, payBill, archiveBill } from "@/lib/bills.functions";
import { automaticCategory, billDueDate, billSchema } from "@/lib/bills";
import { money, today } from "@/lib/data";

export function MonthlyBills({ language }: { language: string }) {
  const {data}=useQuery({queryKey:["recurring_bills"],queryFn:()=>listBills()});
  const qc=useQueryClient(), create=useServerFn(createBill), pay=useServerFn(payBill), archive=useServerFn(archiveBill);
  const [f,setF]=useState({title:"",amount:"",due_day:"",reminder_days:"2"});
  const [month,setMonth]=useState(today().slice(0,7)),[busy,setBusy]=useState(false);
  async function refresh(){await qc.invalidateQueries({queryKey:["recurring_bills"]}); await qc.invalidateQueries({queryKey:["transactions"]});}
  return <section className="mb-8 border-y py-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><Repeat2 className="size-5 text-money"/>Contas mensais</h2><Input aria-label="Mês das contas" className="w-auto" type="month" value={month} onChange={e=>setMonth(e.target.value||today().slice(0,7))}/></div>
    <form className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_120px_120px_140px_auto]" onSubmit={async e=>{
      e.preventDefault();const parsed=billSchema.safeParse({...f,amount:Number(f.amount),due_day:Number(f.due_day),reminder_days:Number(f.reminder_days),starts_on:today()});
      if(!parsed.success){toast.error("Confira o nome, valor e dia do vencimento.");return;} setBusy(true);
      try{await create({data:parsed.data});setF({title:"",amount:"",due_day:"",reminder_days:"2"});await refresh();toast.success("Conta mensal cadastrada.");}catch{toast.error("Não foi possível cadastrar a conta.");}finally{setBusy(false);}
    }}>
      <Input aria-label="Nome da conta mensal" placeholder="Água, luz, internet…" required maxLength={120} value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
      <Input aria-label="Valor mensal" placeholder="Valor" type="number" step="0.01" min="0.01" required value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/>
      <Input aria-label="Dia do vencimento" placeholder="Dia (1–31)" type="number" min="1" max="31" required value={f.due_day} onChange={e=>setF({...f,due_day:e.target.value})}/>
      <select aria-label="Antecedência do lembrete" className="h-9 rounded-md border bg-background px-2 text-sm" value={f.reminder_days} onChange={e=>setF({...f,reminder_days:e.target.value})}>{[0,1,2,3,7].map(d=><option key={d} value={d}>{d===0?"No vencimento":`${d} dia${d>1?"s":""} antes`}</option>)}</select>
      <Button disabled={busy} type="submit">Adicionar conta</Button>
    </form>
    {f.title && <p className="mb-4 text-xs text-muted-foreground">Categoria: {automaticCategory(f.title)}</p>}
    {!data?.bills.length && <p className="text-sm text-muted-foreground">Nenhuma conta mensal cadastrada.</p>}
    <div className="space-y-2">{data?.bills.map(b=>{
      const due=billDueDate(month,b.due_day), paid=data.payments.some(p=>p.bill_id===b.id&&p.due_on===due);
      if(due<b.starts_on) return null;
      return <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><div className="min-w-0 flex-1"><p className="break-words font-semibold">{b.title}</p><p className="text-xs text-muted-foreground capitalize">{b.category} · {due.split('-').reverse().join('/')} · {paid?"Paga":due<today()?"Em atraso":"A pagar"}</p></div><span className="font-semibold">{money(Number(b.amount),language)}</span><Button size="sm" variant={paid?"ghost":"outline"} disabled={busy||paid} onClick={async()=>{setBusy(true);try{await pay({data:{id:b.id,due_on:due}});await refresh();toast.success("Pagamento registrado nos gastos.");}catch{toast.error("Não foi possível registrar o pagamento.");}finally{setBusy(false);}}}><Check className="size-4"/>{paid?"Paga":"Marcar paga"}</Button><Button variant="ghost" size="icon" disabled={busy} aria-label={`Remover conta ${b.title}`} onClick={async()=>{try{await archive({data:{id:b.id}});await refresh();}catch{toast.error("Não foi possível remover a conta.");}}}><Trash2 className="size-4"/></Button></div>;
    })}</div>
  </section>;
}