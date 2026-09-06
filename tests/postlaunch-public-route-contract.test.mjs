import test from "node:test";
import assert from "node:assert/strict";
import {access,readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";

const shellUrl=new URL("../app/components/PublicSchoolShell.tsx",import.meta.url);
const shell=await readFile(shellUrl,"utf8");
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

function routeToPage(href){
 const clean=href.split("#")[0].split("?")[0];
 if(!clean||clean==="/")return path.join(root,"app","page.tsx");
 const parts=clean.replace(/^\//,"").replace(/\/$/,"").split("/");
 return path.join(root,"app",...parts,"page.tsx");
}

test("PublicSchoolShell uses Next Link for internal school-network navigation",()=>{
 assert.match(shell,/import Link from "next\/link"/);
 assert.doesNotMatch(shell,/siteHref\(/);
 assert.doesNotMatch(shell,/GITHUB_ACTIONS/);
});

test("every static PublicSchoolShell internal route has a real page",async()=>{
 const hrefs=[...shell.matchAll(/href="(\/[^"]*)"/g)].map(match=>match[1]);
 const routes=[...new Set(hrefs.map(href=>href.split("#")[0]).filter(Boolean))];
 assert.ok(routes.length>=15,"expected the shell to expose the full public network");
 for(const route of routes){
  await assert.doesNotReject(()=>access(routeToPage(route)),`Missing page.tsx for public route ${route}`);
 }
});

test("public support has a real landing page instead of a dead footer link",async()=>{
 const support=await readFile(new URL("../app/support/page.tsx",import.meta.url),"utf8");
 assert.match(support,/Website Support & Bug Reports/);
 assert.match(support,/School → Support Tickets/);
 assert.match(support,/Hanami does not send these reports through personal email/);
});
