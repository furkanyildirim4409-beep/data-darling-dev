
-- Fix coach profile: set correct role and email
UPDATE public.profiles 
SET role = 'coach', email = 'furkanyildirim4409@gmail.com' 
WHERE id = 'c21a5a19-daaf-4e23-90f6-71179e7f8bcd';

-- Fix athlete profile: set email
UPDATE public.profiles 
SET role = 'athlete', email = 'furkan_yildirim_09@hotmail.com' 
WHERE id = '6a849b37-f399-4300-a9f8-30e7045e1e15';
