"use client";

import { FormEvent, useState } from "react";

const entries = [
  { label: "Academic departments", detail: "Courses, honors, and guidance", href: "#academics" },
  { label: "Club directory", detail: "Sports, academic, arts, and service clubs", href: "#clubs" },
  { label: "Part-time jobs", detail: "Jobs and internship-credit placements", href: "#jobs" },
  { label: "School calendar", detail: "Upcoming school and community events", href: "#calendar" },
  { label: "Faculty and staff", detail: "Leadership and school directory", href: "#people" },
];

export default function SiteSearch() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const matches = query.trim() ? entries.filter((entry) => `${entry.label} ${entry.detail}`.toLowerCase().includes(query.toLowerCase())) : [];
  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSubmitted(true); }
  return (
    <section className="site-search" aria-labelledby="search-heading">
      <div><p className="eyebrow" id="search-heading">SEARCH THE SCHOOL NETWORK</p><form role="search" onSubmit={handleSubmit}><label className="sr-only" htmlFor="school-search">Search Hanami High</label><input id="school-search" onChange={(event) => { setQuery(event.target.value); setSubmitted(false); }} placeholder="Try clubs, courses, jobs, or faculty…" type="search" value={query} /><button type="submit">Search</button></form></div>
      {submitted && <div className="search-results" aria-live="polite">{matches.length ? matches.map((entry) => <a href={entry.href} key={entry.label}><strong>{entry.label}</strong><span>{entry.detail}</span></a>) : <p>No public pages matched “{query}”. Try clubs, academics, jobs, calendar, or faculty.</p>}</div>}
    </section>
  );
}
