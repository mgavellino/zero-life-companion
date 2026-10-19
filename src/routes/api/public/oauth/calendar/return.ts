import { createFileRoute } from "@tanstack/react-router";
export const Route=createFileRoute("/api/public/oauth/calendar/return")({server:{handlers:{GET:async({request})=>{
  const url=new URL(request.url);
  const result={type:url.searchParams.get("success")==="true"?"calendarComplete":"calendarFailed",connectorId:url.searchParams.get("connector_id"),code:url.searchParams.get("code"),attempt:url.searchParams.get("attempt")};
  const safe=JSON.stringify(result).replace(/</g,"\\u003c");
  return new Response(`<!doctype html><html lang="pt"><head><title>Google Agenda — Zero</title></head><body><p>Finalizando a conexão. Você pode voltar ao Zero.</p><script>const result=${safe};if(window.opener){window.opener.postMessage(result,window.location.origin);window.close();}history.replaceState(null,'',location.pathname);</script></body></html>`,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
}}}});