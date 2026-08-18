import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});}

Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const authorization=req.headers.get("authorization")??"";
 if(!authorization.startsWith("Bearer "))return json({error:"Authentication required"},401);
 const body=await req.json().catch(()=>null) as {conversation_id?:string;storage_path?:string}|null;
 if(!body?.conversation_id||!body?.storage_path)return json({error:"conversation_id and storage_path required"},400);
 if(!/^[-0-9a-f]{36}$/i.test(body.conversation_id))return json({error:"Invalid conversation"},400);
 const userResponse=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{Authorization:authorization,apikey:SERVICE_ROLE_KEY}});
 if(!userResponse.ok)return json({error:"Invalid Hanami session"},401);
 const user=await userResponse.json() as {id?:string};
 if(!user.id)return json({error:"Hanami account unavailable"},401);
 const ownedResponse=await fetch(`${SUPABASE_URL}/rest/v1/characters?owner_user_id=eq.${encodeURIComponent(user.id)}&select=id`,{headers:{apikey:SERVICE_ROLE_KEY,Authorization:`Bearer ${SERVICE_ROLE_KEY}`}});
 if(!ownedResponse.ok)return json({error:"Character lookup failed"},500);
 const owned=(await ownedResponse.json() as Array<{id:string}>).map(row=>row.id);
 if(!owned.length)return json({error:"No Hanami character"},403);
 const participants=await fetch(`${SUPABASE_URL}/rest/v1/conversation_participants?conversation_id=eq.${encodeURIComponent(body.conversation_id)}&character_id=in.(${owned.map(id=>`\"${id}\"`).join(",")})&select=character_id&limit=1`,{headers:{apikey:SERVICE_ROLE_KEY,Authorization:`Bearer ${SERVICE_ROLE_KEY}`}});
 if(!participants.ok)return json({error:"Conversation access check failed"},500);
 const rows=await participants.json() as Array<{character_id:string}>;
 if(!rows.length)return json({error:"Conversation access denied"},403);
 const attachment=await fetch(`${SUPABASE_URL}/rest/v1/message_attachments?conversation_id=eq.${encodeURIComponent(body.conversation_id)}&storage_path=eq.${encodeURIComponent(body.storage_path)}&select=storage_path&limit=1`,{headers:{apikey:SERVICE_ROLE_KEY,Authorization:`Bearer ${SERVICE_ROLE_KEY}`}});
 if(!attachment.ok||!(await attachment.json() as unknown[]).length)return json({error:"Attachment not found"},404);
 const sign=await fetch(`${SUPABASE_URL}/storage/v1/object/sign/message-media/${body.storage_path}`,{method:"POST",headers:{apikey:SERVICE_ROLE_KEY,Authorization:`Bearer ${SERVICE_ROLE_KEY}`,"content-type":"application/json"},body:JSON.stringify({expiresIn:300})});
 if(!sign.ok)return json({error:"Signed URL could not be created"},500);
 const signed=await sign.json() as {signedURL?:string;signedUrl?:string};
 const path=signed.signedURL??signed.signedUrl;
 if(!path)return json({error:"Signed URL unavailable"},500);
 return json({signed_url:path.startsWith("http")?path:`${SUPABASE_URL}/storage/v1${path}`,expires_in:300});
});
