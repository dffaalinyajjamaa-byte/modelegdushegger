-- Add grade field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade TEXT;

-- Create users collection for messaging
CREATE TABLE IF NOT EXISTS public.messaging_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  profile_pic TEXT,
  status TEXT DEFAULT 'offline',
  search_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chats collection
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT UNIQUE NOT NULL,
  is_group BOOLEAN DEFAULT FALSE,
  group_name TEXT,
  members UUID[] NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL REFERENCES public.chats(chat_id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('text', 'pdf', 'image', 'audio', 'file')),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'seen')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  seen_by UUID[] DEFAULT ARRAY[]::UUID[]
);

-- Create exams table
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  grade_level TEXT,
  duration_minutes INTEGER,
  total_marks INTEGER,
  questions JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exam_submissions table
CREATE TABLE IF NOT EXISTS public.exam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  answers JSONB NOT NULL,
  score INTEGER,
  total_marks INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reported_messages table for moderation
CREATE TABLE IF NOT EXISTS public.reported_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id)
);

-- Enable RLS
ALTER TABLE public.messaging_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reported_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messaging_users
CREATE POLICY "Users can view all messaging users" ON public.messaging_users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own messaging profile" ON public.messaging_users FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own messaging profile" ON public.messaging_users FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for chats
CREATE POLICY "Users can view their chats" ON public.chats FOR SELECT USING (auth.uid() = ANY(members));
CREATE POLICY "Users can create chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = ANY(members));
CREATE POLICY "Chat members can update" ON public.chats FOR UPDATE USING (auth.uid() = ANY(members));

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chats WHERE chats.chat_id = messages.chat_id AND auth.uid() = ANY(chats.members)
  )
);
CREATE POLICY "Users can send messages to their chats" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chats WHERE chats.chat_id = messages.chat_id AND auth.uid() = ANY(chats.members)
  )
);
CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id);

-- RLS Policies for exams
CREATE POLICY "Everyone can view exams" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Admins can manage exams" ON public.exams FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
);

-- RLS Policies for exam_submissions
CREATE POLICY "Users can view their own submissions" ON public.exam_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create submissions" ON public.exam_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for reported_messages
CREATE POLICY "Users can report messages" ON public.reported_messages FOR INSERT WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Users can view their reports" ON public.reported_messages FOR SELECT USING (auth.uid() = reported_by);

-- RLS Policies for blocked_users
CREATE POLICY "Users can manage their blocked list" ON public.blocked_users FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_chats_members ON public.chats USING GIN(members);
CREATE INDEX IF NOT EXISTS idx_messaging_users_search_id ON public.messaging_users(search_id);
CREATE INDEX IF NOT EXISTS idx_messaging_users_user_id ON public.messaging_users(user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_messaging_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_messaging_users_updated_at BEFORE UPDATE ON public.messaging_users
FOR EACH ROW EXECUTE FUNCTION update_messaging_updated_at();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats
FOR EACH ROW EXECUTE FUNCTION update_messaging_updated_at();