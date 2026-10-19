import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/bill-reminders")({server:{handlers:{POST:async({request})=>{
  const failure=await authenticateCronRequest(request);
  if(failure) return failure;
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data,error}=await supabaseAdmin.rpc("generate_bill_reminders");
  if(error){console.error("Bill reminders failed",error.code);return Response.json({ok:false},{status:500});}
  return Response.json({ok:true,created:data});
}}}});