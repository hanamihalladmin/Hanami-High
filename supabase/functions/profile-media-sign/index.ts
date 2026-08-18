import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) throw new Error("Missing authorization");

    const body = await req.json() as { viewer_character_id?: string; target_character_id?: string; paths?: string[] };
    const viewerCharacterId = body.viewer_character_id?.trim();
    const targetCharacterId = body.target_character_id?.trim();
    const paths = Array.isArray(body.paths) ? [...new Set(body.paths)].slice(0, 20) : [];
    if (!viewerCharacterId || !targetCharacterId || !paths.length) throw new Error("Missing profile media request fields");
    if (paths.some(path => !path.startsWith(`${targetCharacterId}/`) || path.includes("..") || path.startsWith("/"))) throw new Error("Invalid profile media path");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Server configuration unavailable");

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: allowed, error: permissionError } = await userClient.rpc("can_view_character_profile", { viewer_character_id: viewerCharacterId, target_character_id: targetCharacterId });
    if (permissionError || allowed !== true) return new Response(JSON.stringify({ error: "Profile media is not visible to this character" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data, error } = await adminClient.storage.from("profile-media").createSignedUrls(paths, 300);
    if (error) throw error;

    return new Response(JSON.stringify({ files: data ?? [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unable to sign profile media" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
});
