# Phase C — Student Portal Rebuild

This phase rebuilds the student-facing layout layer while preserving existing Supabase-backed behavior.

## Layout contract

- 208px desktop workspace navigation with a safe content canvas
- responsive horizontal navigation on smaller screens
- shared navy / sage / ivory / dusty-rose system
- consistent portal gutters and max-widths so cards cannot clip the viewport
- balanced dashboard main column + task rail
- normalized five-day schedule presentation with horizontal overflow instead of compression
- existing per-character color, wallpaper, font, radius, and profile preferences remain supported
- acceptance letters remain stored/reopenable through the existing student document control

## Data contract

No student data systems are replaced in this phase. Existing authentication, characters, classes, assignments, grades, attendance, calendar, messages, school services, social systems, and acceptance records stay intact.
