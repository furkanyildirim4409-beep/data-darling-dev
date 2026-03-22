CREATE TABLE public.team_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own team messages"
    ON public.team_messages FOR SELECT TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert team messages as sender"
    ON public.team_messages FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can update team messages (mark as read)"
    ON public.team_messages FOR UPDATE TO authenticated
    USING (auth.uid() = receiver_id);

CREATE INDEX idx_team_messages_participants ON public.team_messages(sender_id, receiver_id);
CREATE INDEX idx_team_messages_created_at ON public.team_messages(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;