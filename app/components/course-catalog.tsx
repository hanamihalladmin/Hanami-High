"use client";

import {useEffect,useMemo,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Course={id:string;code:string;title:string;department:string;description:string;credits:number};

export default function CourseCatalog(){
 const [courses,setCourses]=useState<Course[]>([]);const [status,setStatus]=useState("Loading course catalog…");
 const [query,setQuery]=useState("");const [department,setDepartment]=useState("All");
 useEffect(()=>{let cancelled=false;async function load(){try{const response=await fetch(`${SUPABASE_URL}/rest/v1/academic_courses?select=id,code,title,department,description,credits&order=code.asc`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY},cache:"no-store"});if(!response.ok)throw new Error();const rows=await response.json() as Course[];if(!cancelled){setCourses(rows);setStatus(rows.length?`${rows.length} course${rows.length===1?"":"s"} published in the catalog.`:"No courses have been published yet.");}}catch{if(!cancelled)setStatus("The course catalog could not be loaded right now.");}}void load();return()=>{cancelled=true;};},[]);
 const departments=useMemo(()=>["All",...Array.from(new Set(courses.map(course=>course.department))).sort()],[courses]);
 const matches=useMemo(()=>courses.filter(course=>(department==="All"||course.department===department)&&`${course.code} ${course.title} ${course.description}`.toLowerCase().includes(query.toLowerCase())),[courses,query,department]);
 return <section className="info-section course-section" id="courses"><div className="section-heading"><h2>COURSE CATALOG</h2><span>{matches.length} SHOWN</span></div><p className="content-note" aria-live="polite">{status}</p><div className="course-controls"><label><span>Search courses</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search title, code, or topic"/></label><label><span>Department</span><select value={department} onChange={event=>setDepartment(event.target.value)}>{departments.map(value=><option key={value}>{value}</option>)}</select></label></div><div className="course-results" aria-live="polite">{matches.length?matches.map(course=><article key={course.id}><div className="course-code"><strong>{course.code}</strong><span>{course.credits} CR</span></div><div><p className="eyebrow">{course.department}</p><h3>{course.title}</h3><p>{course.description||"Course description not posted yet."}</p></div></article>):<p className="no-results">{courses.length?"No courses match those filters.":"No courses have been added for the school year yet."}</p>}</div><p className="content-note">Enrollment availability and teacher assignments appear in the Student Portal after Administration creates the school schedule.</p></section>;
}
