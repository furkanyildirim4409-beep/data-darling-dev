-- social_posts: allow coaches to update their own posts
CREATE POLICY "Coaches can update own posts"
ON public.social_posts
FOR UPDATE
TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

-- social_posts: allow coaches to delete their own posts
CREATE POLICY "Coaches can delete own posts"
ON public.social_posts
FOR DELETE
TO authenticated
USING (coach_id = auth.uid());

-- coach_stories: allow coaches to update their own stories
CREATE POLICY "Coaches can update own stories"
ON public.coach_stories
FOR UPDATE
TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

-- coach_stories: allow coaches to delete their own stories
CREATE POLICY "Coaches can delete own stories"
ON public.coach_stories
FOR DELETE
TO authenticated
USING (coach_id = auth.uid());