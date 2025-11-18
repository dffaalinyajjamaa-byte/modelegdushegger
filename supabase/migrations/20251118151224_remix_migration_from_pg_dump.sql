--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: award_points(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.award_points(p_user_id uuid, p_points integer, p_activity_type text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO user_rankings (user_id, total_points, last_activity_date)
  VALUES (p_user_id, p_points, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE
  SET total_points = user_rankings.total_points + p_points,
      last_activity_date = CURRENT_DATE,
      updated_at = NOW();

  PERFORM update_user_streak(p_user_id);
END;
$$;


--
-- Name: increment_daily_stat(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_daily_stat(p_user_id uuid, p_stat_type text, p_increment integer DEFAULT 1) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.daily_stats (user_id, date, tasks_completed, videos_watched, materials_read, ai_interactions, exams_taken)
  VALUES (
    p_user_id,
    CURRENT_DATE,
    CASE WHEN p_stat_type = 'tasks' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'videos' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'materials' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'ai' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type = 'exams' THEN p_increment ELSE 0 END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    tasks_completed = CASE WHEN p_stat_type = 'tasks' THEN daily_stats.tasks_completed + p_increment ELSE daily_stats.tasks_completed END,
    videos_watched = CASE WHEN p_stat_type = 'videos' THEN daily_stats.videos_watched + p_increment ELSE daily_stats.videos_watched END,
    materials_read = CASE WHEN p_stat_type = 'materials' THEN daily_stats.materials_read + p_increment ELSE daily_stats.materials_read END,
    ai_interactions = CASE WHEN p_stat_type = 'ai' THEN daily_stats.ai_interactions + p_increment ELSE daily_stats.ai_interactions END,
    exams_taken = CASE WHEN p_stat_type = 'exams' THEN daily_stats.exams_taken + p_increment ELSE daily_stats.exams_taken END;
END;
$$;


--
-- Name: initialize_user_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.initialize_user_stats() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: update_book_progress_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_book_progress_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_channel_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_channel_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_rankings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_rankings() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  WITH ranked_users AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_points DESC) AS new_rank
    FROM user_rankings
  )
  UPDATE user_rankings
  SET rank = ranked_users.new_rank
  FROM ranked_users
  WHERE user_rankings.user_id = ranked_users.user_id;
END;
$$;


--
-- Name: update_rankings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_rankings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_streak(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_streak(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_rankings
  WHERE user_id = p_user_id;

  IF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
  ELSIF v_last_activity = CURRENT_DATE THEN
    RETURN;
  ELSE
    v_current_streak := 1;
  END IF;

  UPDATE user_rankings
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_type text NOT NULL,
    description text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blocked_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    blocked_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: book_ai_chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_ai_chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    book_id uuid NOT NULL,
    page_number integer,
    question text NOT NULL,
    answer text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: book_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    book_id uuid NOT NULL,
    current_page integer DEFAULT 1,
    total_pages integer,
    last_position text,
    completion_percentage integer DEFAULT 0,
    bookmarks jsonb DEFAULT '[]'::jsonb,
    last_read_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: channel_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text,
    media_url text,
    media_type text,
    views integer DEFAULT 0,
    reactions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    avatar_url text,
    created_by uuid NOT NULL,
    admins uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    subscribers uuid[] DEFAULT ARRAY[]::uuid[],
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    response text,
    language text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id text NOT NULL,
    members text[] NOT NULL,
    is_group boolean DEFAULT false,
    group_name text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    group_avatar_url text,
    admins uuid[] DEFAULT ARRAY[]::uuid[]
);


--
-- Name: content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    type text NOT NULL,
    url text NOT NULL,
    subject text,
    grade_level text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cover_image_url text,
    thumbnail_url text
);


--
-- Name: daily_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    tasks_completed integer DEFAULT 0,
    videos_watched integer DEFAULT 0,
    materials_read integer DEFAULT 0,
    ai_interactions integer DEFAULT 0,
    learning_time_minutes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    exams_taken integer DEFAULT 0
);


--
-- Name: exam_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    user_id uuid NOT NULL,
    answers jsonb NOT NULL,
    score integer,
    total_marks integer,
    submitted_at timestamp with time zone DEFAULT now(),
    time_taken integer,
    questions_correct integer,
    questions_wrong integer
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    subject text NOT NULL,
    grade_level text,
    questions jsonb NOT NULL,
    total_marks integer,
    duration_minutes integer,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id text NOT NULL,
    sender_id uuid NOT NULL,
    type text NOT NULL,
    content text,
    file_url text,
    file_name text,
    file_size integer,
    status text DEFAULT 'sent'::text,
    seen_by text[] DEFAULT ARRAY[]::text[],
    "timestamp" timestamp with time zone DEFAULT now()
);


--
-- Name: messaging_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messaging_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    profile_pic text,
    search_id text,
    status text DEFAULT 'offline'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    avatar_url text,
    grade text,
    role text DEFAULT 'student'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quiz_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    exam_id uuid NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb,
    current_question integer DEFAULT 0,
    time_remaining integer,
    paused_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reported_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reported_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    reported_by uuid NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content_type text NOT NULL,
    content_url text,
    text_content text,
    background_color text,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
    CONSTRAINT stories_content_type_check CHECK ((content_type = ANY (ARRAY['image'::text, 'video'::text, 'text'::text])))
);


--
-- Name: story_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    viewer_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT now()
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_type text NOT NULL,
    subject text,
    title text NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    duration_minutes integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_rankings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_rankings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    total_points integer DEFAULT 0,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    last_activity_date date DEFAULT CURRENT_DATE,
    rank integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tasks_completed integer DEFAULT 0 NOT NULL,
    videos_watched integer DEFAULT 0 NOT NULL,
    materials_read integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: video_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content_id uuid NOT NULL,
    playback_time numeric DEFAULT 0,
    total_duration numeric,
    percentage_watched integer DEFAULT 0,
    completed boolean DEFAULT false,
    last_watched_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: blocked_users blocked_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_pkey PRIMARY KEY (id);


--
-- Name: blocked_users blocked_users_user_id_blocked_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_user_id_blocked_user_id_key UNIQUE (user_id, blocked_user_id);


--
-- Name: book_ai_chats book_ai_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_ai_chats
    ADD CONSTRAINT book_ai_chats_pkey PRIMARY KEY (id);


--
-- Name: book_progress book_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_progress
    ADD CONSTRAINT book_progress_pkey PRIMARY KEY (id);


--
-- Name: book_progress book_progress_user_id_book_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_progress
    ADD CONSTRAINT book_progress_user_id_book_id_key UNIQUE (user_id, book_id);


--
-- Name: channel_posts channel_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_posts
    ADD CONSTRAINT channel_posts_pkey PRIMARY KEY (id);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chats chats_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_chat_id_key UNIQUE (chat_id);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


--
-- Name: content content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content
    ADD CONSTRAINT content_pkey PRIMARY KEY (id);


--
-- Name: daily_stats daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_pkey PRIMARY KEY (id);


--
-- Name: daily_stats daily_stats_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_user_id_date_key UNIQUE (user_id, date);


--
-- Name: exam_submissions exam_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: messaging_users messaging_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messaging_users
    ADD CONSTRAINT messaging_users_pkey PRIMARY KEY (id);


--
-- Name: messaging_users messaging_users_search_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messaging_users
    ADD CONSTRAINT messaging_users_search_id_key UNIQUE (search_id);


--
-- Name: messaging_users messaging_users_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messaging_users
    ADD CONSTRAINT messaging_users_user_id_key UNIQUE (user_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: quiz_sessions quiz_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_sessions
    ADD CONSTRAINT quiz_sessions_pkey PRIMARY KEY (id);


--
-- Name: quiz_sessions quiz_sessions_user_id_exam_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_sessions
    ADD CONSTRAINT quiz_sessions_user_id_exam_id_key UNIQUE (user_id, exam_id);


--
-- Name: reported_messages reported_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reported_messages
    ADD CONSTRAINT reported_messages_pkey PRIMARY KEY (id);


--
-- Name: stories stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_pkey PRIMARY KEY (id);


--
-- Name: story_views story_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_pkey PRIMARY KEY (id);


--
-- Name: story_views story_views_story_id_viewer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_story_id_viewer_id_key UNIQUE (story_id, viewer_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: user_activity_log user_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_log
    ADD CONSTRAINT user_activity_log_pkey PRIMARY KEY (id);


--
-- Name: user_rankings user_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rankings
    ADD CONSTRAINT user_rankings_pkey PRIMARY KEY (id);


--
-- Name: user_rankings user_rankings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rankings
    ADD CONSTRAINT user_rankings_user_id_key UNIQUE (user_id);


--
-- Name: user_stats user_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_pkey PRIMARY KEY (id);


--
-- Name: user_stats user_stats_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_key UNIQUE (user_id);


--
-- Name: video_progress video_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_progress
    ADD CONSTRAINT video_progress_pkey PRIMARY KEY (id);


--
-- Name: video_progress video_progress_user_id_content_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_progress
    ADD CONSTRAINT video_progress_user_id_content_id_key UNIQUE (user_id, content_id);


--
-- Name: idx_channel_posts_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_posts_channel ON public.channel_posts USING btree (channel_id);


--
-- Name: idx_channels_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channels_public ON public.channels USING btree (is_public);


--
-- Name: idx_quiz_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_sessions_user ON public.quiz_sessions USING btree (user_id);


--
-- Name: idx_stories_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_expires ON public.stories USING btree (expires_at);


--
-- Name: idx_stories_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_user ON public.stories USING btree (user_id);


--
-- Name: idx_user_activity_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_activity_subject ON public.user_activity_log USING btree (user_id, subject);


--
-- Name: idx_user_activity_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_activity_user_created ON public.user_activity_log USING btree (user_id, created_at DESC);


--
-- Name: idx_user_rankings_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_rankings_points ON public.user_rankings USING btree (total_points DESC);


--
-- Name: idx_user_rankings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_rankings_user ON public.user_rankings USING btree (user_id);


--
-- Name: idx_video_progress_content; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_progress_content ON public.video_progress USING btree (content_id);


--
-- Name: idx_video_progress_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_progress_user ON public.video_progress USING btree (user_id);


--
-- Name: profiles on_profile_created_init_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created_init_stats AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.initialize_user_stats();


--
-- Name: channels trigger_update_channel_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_channel_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.update_channel_updated_at();


--
-- Name: book_progress update_book_progress_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_book_progress_timestamp BEFORE UPDATE ON public.book_progress FOR EACH ROW EXECUTE FUNCTION public.update_book_progress_updated_at();


--
-- Name: content update_content_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON public.content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quiz_sessions update_quiz_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_quiz_sessions_updated_at BEFORE UPDATE ON public.quiz_sessions FOR EACH ROW EXECUTE FUNCTION public.update_rankings_updated_at();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_rankings update_user_rankings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_rankings_updated_at BEFORE UPDATE ON public.user_rankings FOR EACH ROW EXECUTE FUNCTION public.update_rankings_updated_at();


--
-- Name: user_stats update_user_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: blocked_users blocked_users_blocked_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_blocked_user_id_fkey FOREIGN KEY (blocked_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: blocked_users blocked_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: book_ai_chats book_ai_chats_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_ai_chats
    ADD CONSTRAINT book_ai_chats_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.content(id) ON DELETE CASCADE;


--
-- Name: book_ai_chats book_ai_chats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_ai_chats
    ADD CONSTRAINT book_ai_chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: book_progress book_progress_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_progress
    ADD CONSTRAINT book_progress_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.content(id) ON DELETE CASCADE;


--
-- Name: book_progress book_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_progress
    ADD CONSTRAINT book_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: channel_posts channel_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_posts
    ADD CONSTRAINT channel_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: channel_posts channel_posts_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_posts
    ADD CONSTRAINT channel_posts_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;


--
-- Name: channels channels_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chats chats_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: content content_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content
    ADD CONSTRAINT content_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: exam_submissions exam_submissions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_submissions exam_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: exams exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: messages messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(chat_id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: messaging_users messaging_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messaging_users
    ADD CONSTRAINT messaging_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reported_messages reported_messages_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reported_messages
    ADD CONSTRAINT reported_messages_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: reported_messages reported_messages_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reported_messages
    ADD CONSTRAINT reported_messages_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: stories stories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: story_views story_views_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_views story_views_viewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_stats user_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chats Authenticated users can create chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create chats" ON public.chats FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: content Authenticated users can create content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create content" ON public.content FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: channel_posts Channel admins can create posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Channel admins can create posts" ON public.channel_posts FOR INSERT WITH CHECK (((auth.uid() = author_id) AND (EXISTS ( SELECT 1
   FROM public.channels
  WHERE ((channels.id = channel_posts.channel_id) AND (auth.uid() = ANY (channels.admins)))))));


--
-- Name: channel_posts Channel admins can delete their posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Channel admins can delete their posts" ON public.channel_posts FOR DELETE USING ((auth.uid() = author_id));


--
-- Name: channels Channel admins can update channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Channel admins can update channels" ON public.channels FOR UPDATE USING ((auth.uid() = ANY (admins)));


--
-- Name: channel_posts Channel admins can update their posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Channel admins can update their posts" ON public.channel_posts FOR UPDATE USING ((auth.uid() = author_id));


--
-- Name: chats Chat members can update chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chat members can update chats" ON public.chats FOR UPDATE USING (((auth.uid())::text = ANY (members)));


--
-- Name: content Content is viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Content is viewable by authenticated users" ON public.content FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: exams Exams are viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Exams are viewable by authenticated users" ON public.exams FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: messaging_users Messaging users are viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Messaging users are viewable by authenticated users" ON public.messaging_users FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: channels Public channels are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public channels are viewable by everyone" ON public.channels FOR SELECT USING (((is_public = true) OR (auth.uid() = ANY (subscribers)) OR (auth.uid() = ANY (admins))));


--
-- Name: blocked_users Users can block other users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can block other users" ON public.blocked_users FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: channels Users can create channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create channels" ON public.channels FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: messages Users can create messages in their chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create messages in their chats" ON public.messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.chat_id = messages.chat_id) AND ((auth.uid())::text = ANY (chats.members)))))));


--
-- Name: book_ai_chats Users can create own book chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own book chats" ON public.book_ai_chats FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: reported_messages Users can create reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reports" ON public.reported_messages FOR INSERT WITH CHECK ((auth.uid() = reported_by));


--
-- Name: story_views Users can create story views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create story views" ON public.story_views FOR INSERT WITH CHECK ((auth.uid() = viewer_id));


--
-- Name: activities Users can create their own activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own activities" ON public.activities FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_messages Users can create their own chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own chat messages" ON public.chat_messages FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: messaging_users Users can create their own messaging profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own messaging profile" ON public.messaging_users FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: stories Users can create their own stories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own stories" ON public.stories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: exam_submissions Users can create their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own submissions" ON public.exam_submissions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tasks Users can create their own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own tasks" ON public.tasks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: stories Users can delete their own stories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own stories" ON public.stories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: tasks Users can delete their own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_activity_log Users can insert own activity log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own activity log" ON public.user_activity_log FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_stats Users can insert own daily stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own daily stats" ON public.daily_stats FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_rankings Users can insert own ranking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own ranking" ON public.user_rankings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_stats Users can insert their own stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own stats" ON public.user_stats FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: book_progress Users can manage own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own progress" ON public.book_progress USING ((auth.uid() = user_id));


--
-- Name: blocked_users Users can unblock users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unblock users" ON public.blocked_users FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: messages Users can update messages in their chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update messages in their chats" ON public.messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.chat_id = messages.chat_id) AND ((auth.uid())::text = ANY (chats.members))))));


--
-- Name: user_activity_log Users can update own activity log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own activity log" ON public.user_activity_log FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: daily_stats Users can update own daily stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own daily stats" ON public.daily_stats FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_rankings Users can update own ranking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own ranking" ON public.user_rankings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: messaging_users Users can update their own messaging profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own messaging profile" ON public.messaging_users FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_stats Users can update their own stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own stats" ON public.user_stats FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: tasks Users can update their own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_rankings Users can view all rankings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all rankings" ON public.user_rankings FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: chats Users can view chats they are members of; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view chats they are members of" ON public.chats FOR SELECT USING (((auth.uid())::text = ANY (members)));


--
-- Name: messages Users can view messages in their chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.chat_id = messages.chat_id) AND ((auth.uid())::text = ANY (chats.members))))));


--
-- Name: user_activity_log Users can view own activity log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own activity log" ON public.user_activity_log FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: book_ai_chats Users can view own book chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own book chats" ON public.book_ai_chats FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: daily_stats Users can view own daily stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own daily stats" ON public.daily_stats FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: channel_posts Users can view posts from subscribed channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view posts from subscribed channels" ON public.channel_posts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.channels
  WHERE ((channels.id = channel_posts.channel_id) AND ((channels.is_public = true) OR (auth.uid() = ANY (channels.subscribers)))))));


--
-- Name: stories Users can view stories from their contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view stories from their contacts" ON public.stories FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() IN ( SELECT DISTINCT (unnest(chats.members))::uuid AS unnest
   FROM public.chats
  WHERE ((auth.uid())::text = ANY (chats.members))))));


--
-- Name: story_views Users can view story views for their own stories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view story views for their own stories" ON public.story_views FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.stories
  WHERE ((stories.id = story_views.story_id) AND (stories.user_id = auth.uid())))));


--
-- Name: activities Users can view their own activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own activities" ON public.activities FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: blocked_users Users can view their own blocked list; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own blocked list" ON public.blocked_users FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can view their own chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own chat messages" ON public.chat_messages FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: reported_messages Users can view their own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own reports" ON public.reported_messages FOR SELECT USING ((auth.uid() = reported_by));


--
-- Name: user_stats Users can view their own stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own stats" ON public.user_stats FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: exam_submissions Users can view their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own submissions" ON public.exam_submissions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tasks Users can view their own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tasks" ON public.tasks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: quiz_sessions Users manage own quiz sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own quiz sessions" ON public.quiz_sessions USING ((auth.uid() = user_id));


--
-- Name: video_progress Users manage own video progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own video progress" ON public.video_progress USING ((auth.uid() = user_id));


--
-- Name: activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

--
-- Name: book_ai_chats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.book_ai_chats ENABLE ROW LEVEL SECURITY;

--
-- Name: book_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.book_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: channel_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.channel_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: channels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

--
-- Name: content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: exams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: messaging_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messaging_users ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: reported_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reported_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: stories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

--
-- Name: story_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: user_rankings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_rankings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: video_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


