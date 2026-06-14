SET LOCAL session_replication_role = replica;

UPDATE public.profiles
SET subscription_tier = 'pro',
    subscription_status = 'active',
    subscription_current_period_end = now() + interval '30 days',
    subscription_cancel_at_period_end = false,
    updated_at = now()
WHERE id = 'c21a5a19-daaf-4e23-90f6-71179e7f8bcd';

INSERT INTO public.subscription_events (
  id, coach_id, event_type, previous_tier, new_tier, previous_status, new_status, raw_payload
) VALUES (
  'manual_' || extract(epoch from now())::text,
  'c21a5a19-daaf-4e23-90f6-71179e7f8bcd',
  'manual.upgrade',
  'elite', 'pro', 'active', 'active',
  jsonb_build_object('source','manual_admin_upgrade','amount_try',5000,'currency','TRY','note','post-swap re-upgrade to new pro (5000 TL)')
);

SET LOCAL session_replication_role = origin;