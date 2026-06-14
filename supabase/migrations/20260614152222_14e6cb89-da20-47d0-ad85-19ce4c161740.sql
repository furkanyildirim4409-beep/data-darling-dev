SET LOCAL session_replication_role = replica;

UPDATE public.profiles
SET subscription_tier = CASE subscription_tier
  WHEN 'pro' THEN 'elite'
  WHEN 'elite' THEN 'pro'
END,
updated_at = now()
WHERE subscription_tier IN ('pro','elite');

UPDATE public.subscription_events
SET previous_tier = CASE previous_tier WHEN 'pro' THEN 'elite' WHEN 'elite' THEN 'pro' ELSE previous_tier END,
    new_tier      = CASE new_tier      WHEN 'pro' THEN 'elite' WHEN 'elite' THEN 'pro' ELSE new_tier      END
WHERE previous_tier IN ('pro','elite') OR new_tier IN ('pro','elite');

SET LOCAL session_replication_role = origin;