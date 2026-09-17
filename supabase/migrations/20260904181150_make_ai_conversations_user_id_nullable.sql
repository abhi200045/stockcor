/*
# Make ai_conversations.user_id Nullable

## Summary
The `ai_conversations.user_id` column is currently NOT NULL, but with the 
authentication requirement removed, there is no logged-in user to populate it.
This migration makes the column nullable so AI conversations can be created
without a user session.

## Tables Modified
- `ai_conversations`: `user_id` column changed from NOT NULL to nullable.

## Security
No security changes — RLS policies already updated in previous migration.
*/

ALTER TABLE ai_conversations ALTER COLUMN user_id DROP NOT NULL;
