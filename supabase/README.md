# Supabase Project Structure

This directory holds database migrations, Edge Functions, and database/RLS tests for QuestGear.

```text
supabase/
  migrations/
  functions/
  tests/
```

Every feature phase should include its database schema, trusted functions, policies, indexes, and tests in the same implementation slice.
