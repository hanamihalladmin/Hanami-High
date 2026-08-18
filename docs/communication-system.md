# Hanami High communication policy

Hanami High communications are website-native. The product must not open Outlook, Gmail, Apple Mail, or another external email client.

## Required behavior

- No `mailto:` links in the application.
- Students, faculty, staff, and administrators communicate through authenticated portal conversations.
- “Teacher email” means an internal teacher conversation, not internet email.
- Office requests, counseling requests, support cases, and technical help use in-site forms and inboxes.
- Supabase stores conversations, participants, messages, read state, attachments, moderation state, and audit timestamps.
- Row Level Security limits every conversation to its approved participants and authorized moderators.
- Sensitive reports use a separate protected case workflow rather than ordinary messages.
- External notification email, if ever added, may only announce that a portal message exists; it must not contain private message contents.

The messaging schema will be introduced with the authenticated portal checkpoint, using migrations and test accounts only.
