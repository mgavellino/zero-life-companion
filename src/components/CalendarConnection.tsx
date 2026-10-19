import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { getCalendarEvents, startCalendarConnect, completeCalendarConnect, disconnectCalendar } from "@/lib/calendar.functions";

export function CalendarConnection() {
  const [busy,setBusy]=useState(false),qc=useQueryClient();
  const start=useServerFn(startCalendarConnect),complete=useServerFn(completeCalendarConnect),disconnect=useServerFn(disconnectCalendar),getEvents=useServerFn(getCalendarEvents);
  const {data,error}=useQuery({queryKey:["google-calendar"],queryFn:()=>getEvents(),retry:false});
  async function connect(){
    const popup=window.open("","zero-calendar","width=600,height=720");
    if(!popup){toast.error("Permita abrir uma nova janela para conectar sua agenda.");return;}
    setBusy(true);
    try{
      const {authorizationUrl}=await start();
      const outcome=new Promise<{code:string;attempt:string}>((resolve,reject)=>{
        const cleanup=()=>{window.removeEventListener("message",onMessage);clearInterval(poll);clearTimeout(timeout);};
        const onMessage=(event:MessageEvent)=>{if(event.origin!==location.origin||event.source!==popup||event.data?.connectorId!=="google_calendar")return;if(!["calendarComplete","calendarFailed"].includes(event.data?.type))return;cleanup();if(event.data.type==="calendarComplete"&&event.data.code&&event.data.attempt)resolve({code:event.data.code,attempt:event.data.attempt});else reject(new Error("Conexão não concluída."));};
        window.addEventListener("message",onMessage);
        const poll=setInterval(()=>{if(popup.closed){cleanup();reject(new Error("Janela fechada."));}},500);
        const timeout=setTimeout(()=>{cleanup();reject(new Error("Conexão expirada."));},600000);
      });
      popup.location.href=authorizationUrl;
      await complete({data:await outcome});
      await qc.invalidateQueries({queryKey:["google-calendar"]});toast.success("Google Agenda conectado");
    }catch{toast.error("Não foi possível concluir. Confira a autorização da conta Google e tente novamente.");}finally{popup.close();setBusy(false);}
  }
  return <section className="mb-8 border-y py-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarDays className="size-5 text-time" />Google Agenda</h2><div className="flex flex-wrap gap-2">{data?.connected?<><Button variant="outline" size="sm" disabled={busy} onClick={()=>qc.invalidateQueries({queryKey:["google-calendar"]})}><RefreshCw className="size-4" />Atualizar</Button><Button variant="ghost" size="sm" disabled={busy} onClick={async()=>{setBusy(true);try{await disconnect();await qc.invalidateQueries({queryKey:["google-calendar"]});toast.success("Agenda desconectada");}catch{toast.error("Não foi possível desconectar.");}finally{setBusy(false);}}}>Desconectar</Button></>:<Button size="sm" disabled={busy} onClick={connect}>{data?.reconnectRequired?"Reconectar Google Agenda":"Conectar minha agenda"}</Button>}</div></div>{data?.reconnectRequired&&<p className="mt-3 text-sm text-muted-foreground">Renove a autorização da sua agenda.</p>}{error&&<p className="mt-3 text-sm text-muted-foreground">Não foi possível consultar sua agenda agora.</p>}{data?.connected&&<div className="mt-4 space-y-3">{data.events.length===0?<p className="text-sm text-muted-foreground">Sem compromissos nos próximos 7 dias.</p>:data.events.map(e=><div key={e.id} className="min-w-0 border-b pb-3"><p className="break-words text-sm font-medium">{e.title}</p><p className="mt-1 text-xs text-muted-foreground">{e.allDay?`${e.start.split("-").reverse().join("/")} · Dia inteiro`:new Date(e.start).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</p></div>)}</div>}</section>;
}