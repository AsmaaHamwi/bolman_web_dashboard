-- RLS is enabled on public.companies, but only SELECT/INSERT/UPDATE policies were ever created
-- (see bolman_supabase_auth_rls_complete.sql). With no DELETE policy, Postgres silently denies
-- visibility to every row for that command: `.delete().eq('id', id)` returns success with 0 rows
-- affected instead of an error, which is why deleting a company from the dashboard looked like it
-- worked but the row never disappeared. This mirrors the same authorization already used by the
-- companies_insert_policy: only callers with the manage_companies permission may delete a company.
drop policy if exists companies_delete_policy on public.companies;
create policy companies_delete_policy on public.companies
for delete to authenticated
using (public.has_system_permission('manage_companies'));
