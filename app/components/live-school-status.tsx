"use client";

import {useEffect,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Status="open"|"delayed"|"closed"|"holiday"|"emergency";
type Row={status:Status;message:string};

export default function LiveSchoolStatus(){
 const [row,setRow]=useState<Row>({status:"open",message:"School is operating on the normal schedule."});
 useEffect(()=>{let cancelled=false;async function load(){try{const response=await fetch(`${SUPABASE_URL}/rest/v1/school_status_config?select=status,message&key=eq.main&limit=1`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});if(!response.ok)return;const rows=await response.json() as Row[];if(!cancelled&&rows[0])setRow(rows[0]);}catch{/* Keep safe open-status fallback if the public request fails. */}}load();return()=>{cancelled=true;};},[]);
 return <span title={row.message} style={{display:"block",marginTop:4}}>HANAMI CITY • SCHOOL STATUS: {row.status.toUpperCase()}</span>;
}
