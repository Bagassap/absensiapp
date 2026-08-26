-- Backfill: accounts created before the `mustChangePassword` column existed
-- defaulted to `false` regardless of role. Flag every existing SISWA/GURU
-- account (all seeded with a known shared password) so they are forced to
-- change it on their next login. ADMIN accounts are left untouched.
UPDATE "users"
SET "mustChangePassword" = true
WHERE "role" IN ('SISWA', 'GURU');
