# GradelabAI Clean Database & Edge Function Structure

This directory contains a clean, modular version of the database schema, migrations, and edge function documentation for GradelabAI. Use this for onboarding, infrastructure setup, or as a reference for extending the project.

## Structure

- `migrations/` — SQL files for all tables, functions, triggers, and RLS policies.
- `edge-functions/` — Documentation and example prompts for all edge/serverless functions, including API request/response payloads and database interaction notes.

## How to Use

- **Migrations:**
  - Apply the SQL files in order to set up a fresh database schema.
  - Each file is modular and can be adapted to your environment.
- **Edge Functions:**
  - Review the documentation and prompts to understand each function's role, API, and security considerations.
  - Use as a template for implementing or extending serverless logic.

## Notes
- This structure is based on the summary in `../db-structure.md` and is designed to be clean and portable.
- For the live project, see `/supabase/migrations/` and `/supabase/functions/`.
- All RLS policies are included for security best practices.

---

*This directory is for documentation and planning only. It does not affect the running project.* 