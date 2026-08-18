import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GUILD_ID = Deno.env.get("HANAMI_DISCORD_GUILD_ID") ?? "";
const BOT_TOKEN = Deno.env.get("HANAMI_DISCORD_BOT_TOKEN") ?? "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {status, headers:{"content-type":"application/json","cache-control":"no-store"}});
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({error:"Method not allowed"},405);
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({error:"Authentication required"},401);

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {headers:{Authorization:authorization, apikey:SERVICE_ROLE_KEY}});
  if (!userResponse.ok) return json({error:"Invalid Hanami session"},401);
  const user = await userResponse.json() as {id?:string;user_metadata?:Record<string,unknown>;identities?:Array<{provider?:string;identity_data?:Record<string,unknown>}>};
  if (!user.id) return json({error:"Hanami account unavailable"},401);

  const discordIdentity = user.identities?.find(identity=>identity.provider==="discord");
  const identityData = discordIdentity?.identity_data ?? user.user_metadata ?? {};
  const discordUserId = String(identityData.provider_id ?? identityData.sub ?? identityData.id ?? "");
  if (!/^\d{16,22}$/.test(discordUserId)) return json({error:"Discord identity unavailable"},400);

  if (!GUILD_ID || !BOT_TOKEN) return json({configured:false,sync_status:"pending",message:"Discord guild synchronization is waiting for server secrets."},503);

  let roles:string[]=[]; let syncStatus="synced"; let lastError:string|null=null;
  const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(GUILD_ID)}/members/${encodeURIComponent(discordUserId)}`, {headers:{Authorization:`Bot ${BOT_TOKEN}`}});
  if (memberResponse.status===404) syncStatus="not_member";
  else if (!memberResponse.ok) {syncStatus="error"; lastError=`Discord member lookup failed (${memberResponse.status})`;}
  else {const member = await memberResponse.json() as {roles?:string[]}; roles = Array.isArray(member.roles) ? member.roles.filter(role=>/^\d+$/.test(role)) : [];}

  const upsertResponse = await fetch(`${SUPABASE_URL}/rest/v1/account_discord_role_sync?on_conflict=user_id`, {
    method:"POST",
    headers:{apikey:SERVICE_ROLE_KEY,Authorization:`Bearer ${SERVICE_ROLE_KEY}`,"content-type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},
    body:JSON.stringify({user_id:user.id,discord_user_id:discordUserId,role_ids:roles,synced_at:new Date().toISOString(),sync_status:syncStatus,last_error:lastError})
  });
  if (!upsertResponse.ok) return json({error:"Role cache update failed"},500);
  if (syncStatus==="error") return json({configured:true,sync_status:syncStatus,error:lastError},502);
  return json({configured:true,sync_status:syncStatus,roles_synced:roles.length});
});
