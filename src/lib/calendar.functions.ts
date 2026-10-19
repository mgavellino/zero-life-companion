import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const startCalendarConnect=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {authorizeAppUserOAuth}=await import("@/integrations/lovable/appUserConnector");
  const {getCalendarKey,CALENDAR_SCOPES,CONNECTOR_GATEWAY}=await import("./calendar.server");
  const {createHash,randomBytes}=await import("node:crypto");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const clientKey=process.env["GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"];
  if(!clientKey)throw new Error("Google Agenda ainda não configurado.");
  const request=getRequest(),url=new URL(request.url);
  const sandboxHost=url.hostname==="localhost" ? request.headers.get("x-forwarded-host") : null;
  const nonce=randomBytes(32).toString("base64url");
  const {error}=await supabaseAdmin.from("calendar_oauth_attempts").insert({user_id:context.userId,nonce_hash:createHash("sha256").update(nonce).digest("hex")});
  if(error)throw new Error("Não foi possível iniciar a conexão.");
  const returnUrl=new URL("/api/public/oauth/calendar/return",sandboxHost?`https://${sandboxHost}`:url.origin);returnUrl.searchParams.set("attempt",nonce);
  const {authorizationUrl}=await authorizeAppUserOAuth({gatewayBaseUrl:CONNECTOR_GATEWAY,connectorId:"google_calendar",appUserId:context.userId,clientAPIKey:clientKey,returnUrl:returnUrl.toString(),connectionAPIKey:await getCalendarKey(context.userId)??undefined,credentialsConfiguration:{scopes:CALENDAR_SCOPES}});
  return {authorizationUrl};
});
export const completeCalendarConnect=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({code:z.string().min(1).max(4096),attempt:z.string().min(32).max(100)}).parse(input)).handler(async({data,context})=>{
  const {createHash}=await import("node:crypto");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data:attempt,error}=await supabaseAdmin.from("calendar_oauth_attempts").delete().eq("user_id",context.userId).eq("nonce_hash",createHash("sha256").update(data.attempt).digest("hex")).gt("expires_at",new Date().toISOString()).select("id").maybeSingle();
  if(error||!attempt)throw new Error("Conexão expirada. Tente novamente.");
  const {exchangeAppUserOAuthCode}=await import("@/integrations/lovable/appUserConnector");
  const {saveCalendarKey,CONNECTOR_GATEWAY}=await import("./calendar.server");
  const result=await exchangeAppUserOAuthCode(CONNECTOR_GATEWAY,data.code);
  if(result.connectorId!=="google_calendar")throw new Error("Conexão inválida.");
  await saveCalendarKey(context.userId,result.connectionAPIKey);
  return {ok:true};
});
export const getCalendarEvents=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {calendarCall}=await import("./calendar.server");
  const params=new URLSearchParams({timeMin:new Date().toISOString(),timeMax:new Date(Date.now()+7*86400_000).toISOString(),singleEvents:"true",orderBy:"startTime",maxResults:"50"});
  const result=await calendarCall(context.userId,`/calendar/v3/calendars/primary/events?${params}`);
  if(!result.response)return {connected:false,reconnectRequired:result.reconnectRequired,events:[]};
  const body=await result.response.json() as {items?:{id:string;summary?:string;start?:{date?:string;dateTime?:string};end?:{date?:string;dateTime?:string}}[]};
  return {connected:true,reconnectRequired:false,events:(body.items??[]).map(e=>({id:e.id,title:e.summary??"Compromisso",start:e.start?.dateTime??e.start?.date??"",end:e.end?.dateTime??e.end?.date??"",allDay:!!e.start?.date}))};
});
export const sendTaskToCalendar=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({id:z.string().uuid()}).parse(input)).handler(async({data,context})=>{
  const {data:task}=await context.supabase.from("tasks").select("id,title,due_at,minutes").eq("id",data.id).eq("user_id",context.userId).single();
  if(!task?.due_at)throw new Error("Defina data e hora para enviar este compromisso.");
  const {syncTaskToCalendar}=await import("./calendar.server");
  if(!await syncTaskToCalendar(context.userId,task))throw new Error("Conecte o Google Agenda primeiro.");
  return {ok:true};
});
export const disconnectCalendar=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {getCalendarKey,CONNECTOR_GATEWAY}=await import("./calendar.server");
  const {disconnectAppUser}=await import("@/integrations/lovable/appUserConnector");
  const key=await getCalendarKey(context.userId);
  if(key)await disconnectAppUser({gatewayBaseUrl:CONNECTOR_GATEWAY,connectionAPIKey:key,connectorId:"google_calendar"});
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {error}=await supabaseAdmin.from("app_user_connections").delete().eq("user_id",context.userId).eq("connector_id","google_calendar");
  if(error)throw new Error("Não foi possível desconectar.");
  return {ok:true};
});