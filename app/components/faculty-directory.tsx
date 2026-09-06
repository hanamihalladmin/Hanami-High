"use client";

import { useMemo, useState } from "react";

const people = [
  { name: "Faculty profiles pending", role: "Languages & Humanities", department: "Humanities", room: "Directory opens with approved faculty accounts" },
  { name: "Faculty profiles pending", role: "Mathematics & Computing", department: "STEM", room: "Directory opens with approved faculty accounts" },
  { name: "Faculty profiles pending", role: "Science & Laboratory Studies", department: "STEM", room: "Directory opens with approved faculty accounts" },
  { name: "Staff profiles pending", role: "Guidance & Student Support", department: "Student Services", room: "Directory opens with approved staff accounts" },
] as const;

export default function FacultyDirectory() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All");
  const filtered = useMemo(() => people.filter((person) => {
    const matchesDepartment = department === "All" || person.department === department;
    const haystack = `${person.name} ${person.role} ${person.department}`.toLowerCase();
    return matchesDepartment && haystack.includes(query.toLowerCase());
  }), [query, department]);

  return <section className="info-section directory-section" id="directory">
    <div className="section-heading"><h2>FACULTY & STAFF DIRECTORY</h2><span>{filtered.length} DIRECTORY AREAS</span></div>
    <div className="directory-controls"><label><span>Search directory</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, roles, or departments" /></label><label><span>Department</span><select value={department} onChange={(event) => setDepartment(event.target.value)}><option>All</option><option>Humanities</option><option>STEM</option><option>Student Services</option></select></label></div>
    <div className="directory-results" aria-live="polite">{filtered.length ? filtered.map((person) => <article key={person.role}><div className="directory-avatar" aria-hidden="true">H</div><div><p className="eyebrow">{person.department}</p><h3>{person.name}</h3><strong>{person.role}</strong><p>{person.room}</p></div></article>) : <p className="no-results">No directory entries match your search.</p>}</div>
  </section>;
}
