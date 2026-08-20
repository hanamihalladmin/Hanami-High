import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("Discord role sync uses member OAuth authorization without a bot token",async()=>{
  const gateway=await read("app/portal/PortalAuthPanel.tsx");
  const edge=await read("supabase/functions/discord-role-sync/index.ts");
  const owner=await read("app/portal/owner/OwnerDiscordRoleSyncPanel.tsx");
  assert.match(gateway,/identify guilds guilds\.members\.read/);
  assert.match(gateway,/provider_token/);
  assert.match(edge,/users\/@me\/guilds\/\$\{encodeURIComponent\(guildId\)\}\/member/);
  assert.match(edge,/discordUser\.id!==discordUserId/);
  assert.doesNotMatch(edge,/HANAMI_DISCORD_BOT_TOKEN/);
  assert.doesNotMatch(edge,/Authorization:`Bot/);
  assert.match(owner,/owner_set_discord_guild_id/);
  assert.match(owner,/No Discord bot token is required/);
});

test("Owner Discord server configuration stays Owner-gated",async()=>{
  const migration=await read("supabase/migrations/20260819015254_owner_discord_guild_configuration.sql");
  assert.match(migration,/private\.is_owner_discord_user\(\)/);
  assert.match(migration,/owner_set_discord_guild_id/);
  assert.match(migration,/security invoker/i);
  assert.match(migration,/owner_discord_guild_updated/);
});

test("Admin support desk can respond assign tag close and reopen tickets",async()=>{
  const support=await read("app/portal/admin/AdminSupportTicketManager.tsx");
  const workspace=await read("app/portal/admin/AdminWorkspace.tsx");
  const admin=await read("app/portal/admin/AdminPortalClient.tsx");
  assert.match(admin,/AdminWorkspace/);
  assert.match(workspace,/AdminSupportTicketManager/);
  assert.match(workspace,/canModerate/);
  assert.match(support,/Post staff reply/);
  assert.match(support,/Assign to me/);
  assert.match(support,/Save tags/);
  assert.match(support,/Resolved \/ Closed/);
  assert.match(support,/Open \/ Reopened/);
  assert.match(support,/waiting_on_requester/);
});

test("new public school RPCs use invoker wrappers after hardening",async()=>{
  const migration=await read("supabase/migrations/20260819014458_harden_new_public_rpc_boundaries.sql");
  assert.match(migration,/private\.student_todo_feed_internal/);
  assert.match(migration,/private\.owner_bug_detector_feed_internal/);
  assert.match(migration,/security invoker/ig);
  assert.match(migration,/owner bug reports deny direct access/);
});

test("Next.js is pinned to the patched 16.3.1 release",async()=>{
  const pkg=JSON.parse(await read("package.json"));
  assert.equal(pkg.dependencies.next,"16.3.1");
  assert.equal(pkg.devDependencies["eslint-config-next"],"16.3.1");
});
