import { decryptSecret, encryptSecret } from "./secret-crypto.server";
import { appUserReconnectRequired, callAsAppUser } from "@/integrations/lovable/appUserConnector";
export const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/calendar.events"];
export const CONNECTOR_GATEWAY = "https://connector-gateway.lovable.dev";
export async function getCalendarKey(userId:string) {
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data,error}=await supabaseAdmin.from("app_user_connections").select("connection_key_ciphertext").eq("user_id",userId).eq("connector_id","google_calendar").maybeSingle();
  if(error)throw new Error("Não foi possível consultar a conexão.");
  return data ? decryptSecret(data.connection_key_ciphertext,"APP_USER_CONNECTION_KEY_SECRET") : null;
}
export async function saveCalendarKey(userId:string,key:string) {
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {error}=await supabaseAdmin.from("app_user_connections").upsert({user_id:userId,connector_id:"google_calendar",connection_key_ciphertext:encryptSecret(key,"APP_USER_CONNECTION_KEY_SECRET"),updated_at:new Date().toISOString()},{onConflict:"user_id,connector_id"});
  if(error)throw new Error("Não foi possível salvar a conexão.");
}
export async function calendarCall(userId:string,path:string,init?:RequestInit) {
  const key=await getCalendarKey(userId);
  if(!key)return {connected:false,reconnectRequired:false,response:null};
  const response=await callAsAppUser({gatewayBaseUrl:CONNECTOR_GATEWAY,connectionAPIKey:key,connectorId:"google_calendar",path,init,requiredScopes:CALENDAR_SCOPES});
  if(await appUserReconnectRequired(response))return {connected:false,reconnectRequired:true,response:null};
  if(!response.ok){console.error("Google Calendar failed",response.status,await response.text());throw new Error("Não foi possível consultar o Google Agenda.");}
  return {connected:true,reconnectRequired:false,response};
}
/** Best-effort: mirror a dated task into the user's Google Calendar with popup reminders so Google sends the notification. Silent when not connected. */
export async function syncTaskToCalendar(userId:string,task:{id:string;title:string;due_at:string|null;minutes?:number|null}) {
  if(!task.due_at||isNaN(Date.parse(task.due_at)))return false;
  const eventId=`zero${task.id.replace(/-/g,"")}`;
  const body=JSON.stringify({id:eventId,summary:task.title,start:{dateTime:new Date(task.due_at).toISOString()},end:{dateTime:new Date(Date.parse(task.due_at)+(task.minutes??30)*60000).toISOString()},reminders:{useDefault:false,overrides:[{method:"popup",minutes:30},{method:"popup",minutes:10},{method:"popup",minutes:0}]}});
  const init={headers:{"Content-Type":"application/json"},body};
  try{
    const put=await calendarCall(userId,`/calendar/v3/calendars/primary/events/${eventId}`,{method:"PUT",...init}).catch(()=>null);
    if(put?.connected)return true;
    if(put&&!put.connected)return false;
    const created=await calendarCall(userId,"/calendar/v3/calendars/primary/events",{method:"POST",...init});
    return created.connected;
  }catch(e){console.error("calendar sync failed",e);return false;}
}
