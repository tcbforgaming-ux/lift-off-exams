export type ModerationEmail = {id:string;lease:string;email:string;title:string;body:string;path:string};
export async function deliverModerationMail(
  db: {rpc:(name:string,args?:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>},
  send:(mail:ModerationEmail)=>Promise<void>,
) {
  const result=await db.rpc("claim_moderation_mail");
  if(result.error)throw new Error("Mail claim failed.");
  if(!result.data)return "empty";
  const mail=result.data as ModerationEmail;
  let sent=false;
  try{await send(mail);sent=true;}catch{ /* durable retry is scheduled below */ }
  const ack=await db.rpc("finish_moderation_mail",{p_id:mail.id,p_lease:mail.lease,p_sent:sent});
  if(ack.error||ack.data!==true)throw new Error("Mail acknowledgment failed.");
  return sent?"sent":"retry";
}
