import test from "node:test";
import assert from "node:assert/strict";
import {access,readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";

const shell=await readFile(new URL("../app/components/PublicSchoolShell.tsx",import.meta.url),"utf8");
const home=await readFile(new URL("../app/HomeDashboard.tsx",import.meta.url),"utf8");
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

function normalizeRoute(href,base="/"){
 const url=new URL(href,`https://hanami.invalid${base}`);
 return url.pathname;
}
function routeToPage(route){
 if(!route||route==="/")return path.join(root,"app","page.tsx");
 const parts=route.replace(/^\//,"").replace(/\/$/,"").split("/");
 return path.join(root,"app",...parts,"page.tsx");
}
async function assertRoutesExist(routes,label){
 for(const route of routes){
  await assert.doesNotReject(()=>access(routeToPage(route)),`Missing page.tsx for ${label} route ${route}`);
 }
}

test("PublicSchoolShell uses Next Link for internal school-network navigation",()=>{
 assert.match(shell,/import Link from "next\/link"/);
 assert.doesNotMatch(shell,/siteHref\(/);
 assert.doesNotMatch(shell,/GITHUB_ACTIONS/);
});

test("every static PublicSchoolShell internal route has a real page",async()=>{
 const hrefs=[...shell.matchAll(/href="(\/[^"]*)"/g)].map(match=>match[1]);
 const routes=[...new Set(hrefs.map(href=>normalizeRoute(href)).filter(Boolean))];
 assert.ok(routes.length>=15,"expected the shell to expose the full public network");
 await assertRoutesExist(routes,"public shell");
});

test("every static homepage shortcut has a real page",async()=>{
 const hrefs=[...home.matchAll(/href="(\.\.?\/[^"]*)"/g)].map(match=>match[1]);
 const routes=[...new Set(hrefs.map(href=>normalizeRoute(href,"/")).filter(Boolean))];
 assert.ok(routes.length>=15,"expected the homepage to expose the school network shortcuts");
 await assertRoutesExist(routes,"homepage");
});

test("public support has a real landing page instead of a dead footer link",async()=>{
 const support=await readFile(new URL("../app/support/page.tsx",import.meta.url),"utf8");
 assert.match(support,/Website Support & Bug Reports/);
 assert.match(support,/School → Support Tickets/);
 assert.match(support,/Hanami does not send these reports through personal email/);
});
