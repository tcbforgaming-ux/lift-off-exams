import {createClient} from "npm:@supabase/supabase-js@2";
import {serve} from "https://deno.land/std@0.224.0/http/server.ts";
import {deliverModerationMail} from "../_shared/moderation-mail.ts";
serve(async req=>{
  const secret=Deno.env.get("MODERATION_MAIL_SECRET");
  if(req.method!=="POST")return new Response(null,{status:405});
  if(!secret||req.headers.get("x-moderation-secret")!==secret)return new Response(null,{status:401});
  try{
    const url=Deno.env.get("SUPABASE_URL");const key=Deno.env.get("SERVICE_ROLE_KEY")??Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resend=Deno.env.get("RESEND_API_KEY");const from=Deno.env.get("RESEND_FROM_EMAIL");const app=Deno.env.get("APP_URL");
    if(!url||!key||!resend||!from||!app)throw new Error("Missing mail configuration.");
    const origin=new URL(app);
    if(origin.protocol!=="https:"&&origin.hostname!=="127.0.0.1")throw new Error("Invalid app URL.");
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const outcomes=[];
    for(let i=0;i<20;i++){
      const outcome=await deliverModerationMail(db,async mail=>{
        const link=new URL(mail.path,origin);
        if(link.origin!==origin.origin)throw new Error("Invalid notice path.");
        const response=await fetch("https://api.resend.com/emails",{method:"POST",
          headers:{Authorization:`Bearer ${resend}`,"Content-Type":"application/json","Idempotency-Key":`moderation-${mail.id}`},
          body:JSON.stringify({from,to:mail.email,subject:mail.title,text:`${mail.body}\n\n${link}`})});
        if(!response.ok)throw new Error("Mail provider rejected delivery.");
      });
      outcomes.push(outcome);if(outcome==="empty")break;
    }
    return Response.json({outcomes});
  }catch{return Response.json({error:"Moderation delivery failed."},{status:500});}
});
