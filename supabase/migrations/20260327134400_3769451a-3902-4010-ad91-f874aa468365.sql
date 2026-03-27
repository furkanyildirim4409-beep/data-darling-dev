CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_challenge_id UUID,
  p_winner_id UUID DEFAULT NULL,
  p_is_draw BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_loser_id UUID;
BEGIN
  SELECT * INTO v_challenge FROM challenges
  WHERE id = p_challenge_id AND status = 'disputed'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Challenge not found or not disputed'; END IF;

  IF p_is_draw THEN
    UPDATE challenges SET status = 'completed', winner_id = NULL WHERE id = p_challenge_id;
    RETURN TRUE;
  END IF;

  IF p_winner_id = v_challenge.challenger_id THEN
    v_loser_id := v_challenge.opponent_id;
  ELSIF p_winner_id = v_challenge.opponent_id THEN
    v_loser_id := v_challenge.challenger_id;
  ELSE
    RAISE EXCEPTION 'Invalid winner_id';
  END IF;

  UPDATE challenges SET status = 'completed', winner_id = p_winner_id WHERE id = p_challenge_id;

  IF v_challenge.wager_coins > 0 THEN
    UPDATE profiles SET bio_coins = GREATEST(COALESCE(bio_coins, 0) - v_challenge.wager_coins, 0)
    WHERE id = v_loser_id;

    UPDATE profiles SET bio_coins = COALESCE(bio_coins, 0) + v_challenge.wager_coins
    WHERE id = p_winner_id;
  END IF;

  RETURN TRUE;
END;
$$;