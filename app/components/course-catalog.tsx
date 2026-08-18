"use client";

import { useMemo, useState } from "react";

const courses = [
  { code:"ENG-101", title:"Literature & Composition I", department:"Humanities", level:"Foundation", credits:2, description:"Close reading, discussion, research, and clear academic writing." },
  { code:"JPN-201", title:"Japanese Language & Culture", department:"Humanities", level:"Intermediate", credits:2, description:"Language development through modern texts, media, and cultural study." },
  { code:"MAT-201", title:"Geometry & Mathematical Reasoning", department:"Mathematics", level:"Intermediate", credits:2, description:"Spatial reasoning, proof, measurement, modeling, and problem solving." },
  { code:"MAT-302", title:"Advanced Functions", department:"Mathematics", level:"Honors", credits:2, description:"Functions, trigonometry, modeling, and preparation for advanced study." },
  { code:"BIO-201", title:"Biology Laboratory", department:"Sciences", level:"Intermediate", credits:2, description:"Cells, genetics, ecology, scientific investigation, and laboratory practice." },
  { code:"PHY-301", title:"Honors Physics", department:"Sciences", level:"Honors", credits:2, description:"Motion, energy, waves, electricity, experimental design, and analysis." },
  { code:"ART-110", title:"Studio Art & Visual Storytelling", department:"Arts & Design", level:"Foundation", credits:1, description:"Drawing, color, composition, mixed media, critique, and portfolio practice." },
  { code:"CSE-220", title:"Creative Computing", department:"Pathways", level:"Intermediate", credits:1, description:"Programming, interactive media, digital responsibility, and project design." },
] as const;

export default function CourseCatalog(){
  const [query,setQuery]=useState(""); const [department,setDepartment]=useState("All"); const [level,setLevel]=useState("All");
  const matches=useMemo(()=>courses.filter(course=>(department==="All"||course.department===department)&&(level==="All"||course.level===level)&&`${course.code} ${course.title} ${course.description}`.toLowerCase().includes(query.toLowerCase())),[query,department,level]);
  return <section className="info-section course-section" id="courses"><div className="section-heading"><h2>COURSE CATALOG</h2><span>{matches.length} COURSES SHOWN</span></div><div className="course-controls"><label><span>Search courses</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search title, code, or topic"/></label><label><span>Department</span><select value={department} onChange={event=>setDepartment(event.target.value)}><option>All</option><option>Humanities</option><option>Mathematics</option><option>Sciences</option><option>Arts & Design</option><option>Pathways</option></select></label><label><span>Level</span><select value={level} onChange={event=>setLevel(event.target.value)}><option>All</option><option>Foundation</option><option>Intermediate</option><option>Honors</option></select></label></div><div className="course-results" aria-live="polite">{matches.length?matches.map(course=><article key={course.code}><div className="course-code"><strong>{course.code}</strong><span>{course.credits} CR</span></div><div><p className="eyebrow">{course.department} • {course.level}</p><h3>{course.title}</h3><p>{course.description}</p></div></article>):<p className="no-results">No courses match those filters.</p>}</div><p className="content-note">This public guide is a planning overview. Enrollment availability, prerequisites, and teacher assignments appear in the student portal.</p></section>;
}
