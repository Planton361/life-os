# Security and Accessibility Instructions

Stand: 2026-06-17  
Status: Active

Security:

- Every user-specific table needs `user_id` and RLS.
- Validate mutations server-side with Zod.
- Never expose secrets in client code.
- Do not weaken Auth/RLS.
- MCP/tools need minimal scope and explicit purpose.

Accessibility:

- One H1 per page.
- Visible focus states.
- Keyboard navigation.
- Labels for inputs.
- Icon-only buttons need accessible names.
- Status cannot rely on color alone.
- Charts need text summary.
