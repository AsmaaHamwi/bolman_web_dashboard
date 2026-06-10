-- Run once on Supabase SQL editor (or via migration) if the main schema was
-- deployed without users_update_company_driver_profile_policy.
-- Fixes: "Cannot coerce the result to a single JSON object" when a company
-- owner/staff edits a driver name/phone (update affected 0 rows under RLS).

DROP POLICY IF EXISTS users_update_company_driver_profile_policy ON public.users;
CREATE POLICY users_update_company_driver_profile_policy ON public.users
FOR UPDATE TO authenticated
USING (
  role = 'driver'
  AND EXISTS (
    SELECT 1
    FROM public.drivers d
    WHERE d.user_id = users.id
      AND public.has_company_permission(d.company_id, 'manage_drivers')
  )
)
WITH CHECK (
  role = 'driver'
  AND EXISTS (
    SELECT 1
    FROM public.drivers d
    WHERE d.user_id = users.id
      AND public.has_company_permission(d.company_id, 'manage_drivers')
  )
);
