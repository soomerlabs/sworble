-- SWORBL — abuse damage-caps (run in the SQL editor, once).
-- Supabase has no per-IP limiter for REST reads; what we CAN do is cap how
-- much database time any single anonymous/authenticated query may burn.
-- Every legitimate sworbl query answers in milliseconds — a 2s ceiling is
-- 100x headroom for us and a hard wall for pathological queries.
alter role anon set statement_timeout = '2s';
alter role authenticated set statement_timeout = '2s';

-- (the third limiter is a Dashboard setting, not SQL:
--  Authentication → Rate Limits → Anonymous sign-ins ≈ 10/hour/IP)
