Knowledge Seed (Markdown Specs)

Purpose: Quickly populate the admin UI by copying structured content.

Structure:
- fields/*.md — Fields definitions
- document_templates/*.md — Document Templates (name + field references + template checks)
- checks/*.md — Checks with rules
- topics/*.md — Topics: title, tags, faq, documents (template refs), checkIds, responses/textBlocks

Conventions:
- IDs are left blank; use names/keys so you can map them manually in admin.
- Keep labels Ukrainian; keys/aliases are latin slugs.
- Responses textBlocks are the primary material for Vector Store.


