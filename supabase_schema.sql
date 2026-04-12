-- Supabase Schema for "Our Space" (10th Anniversary App)
-- Run this in your Supabase SQL Editor

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  unique_identifier TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  relationship_start_date TIMESTAMP WITH TIME ZONE,
  partner_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Create Diary Entries Table
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  title TEXT,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own diary entries" 
ON public.diary_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view partner's shared diary entries" 
ON public.diary_entries FOR SELECT USING (
  is_shared = true AND 
  auth.uid() IN (
    SELECT partner_id FROM public.profiles WHERE id = public.diary_entries.user_id
  )
);

CREATE POLICY "Users can insert their own diary entries" 
ON public.diary_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diary entries" 
ON public.diary_entries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diary entries" 
ON public.diary_entries FOR DELETE USING (auth.uid() = user_id);


-- 3. Create Chat Messages Table
CREATE TYPE message_type AS ENUM ('text', 'photo', 'video', 'one_time_photo');

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type message_type DEFAULT 'text'::message_type,
  content TEXT NOT NULL, -- either text or media URL
  is_viewed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages they sent or received" 
ON public.chat_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update view status of received messages" 
ON public.chat_messages FOR UPDATE USING (auth.uid() = receiver_id);


-- 4. Create Quiz Questions and Answers
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quiz answers viewable by user and partner" 
ON public.quiz_answers FOR SELECT USING (
  auth.uid() = user_id OR 
  auth.uid() IN (SELECT partner_id FROM public.profiles WHERE id = public.quiz_answers.user_id)
);

CREATE POLICY "Users can insert answers" 
ON public.quiz_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert some default quiz questions
INSERT INTO public.quiz_questions (question_text) VALUES
('Who sleeps more?'),
('Who is more likely to be late?'),
('Who is the better cook?'),
('Who says "I love you" first?');

-- 5. Create Gallery Images Table
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  alt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gallery images are viewable by user and partner" 
ON public.gallery_images FOR SELECT USING (
  auth.uid() = user_id OR 
  auth.uid() IN (SELECT partner_id FROM public.profiles WHERE id = public.gallery_images.user_id)
);

CREATE POLICY "Users can insert gallery images" 
ON public.gallery_images FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Storage Buckets (You may need to create these manually in the dashboard, but here are policies)
-- Create buckets: 'media' 
-- Ensure you manually create a bucket named 'media' in the Supabase Storage dashboard.
