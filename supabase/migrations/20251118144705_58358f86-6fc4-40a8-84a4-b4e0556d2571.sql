-- Create user_rankings table for leaderboard and streaks
CREATE TABLE IF NOT EXISTS user_rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_rankings_points ON user_rankings(total_points DESC);
CREATE INDEX idx_user_rankings_user ON user_rankings(user_id);

ALTER TABLE user_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all rankings"
  ON user_rankings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own ranking"
  ON user_rankings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ranking"
  ON user_rankings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create video_progress table for tracking video watch progress
CREATE TABLE IF NOT EXISTS video_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_id UUID NOT NULL,
  playback_time NUMERIC DEFAULT 0,
  total_duration NUMERIC,
  percentage_watched INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

CREATE INDEX idx_video_progress_user ON video_progress(user_id);
CREATE INDEX idx_video_progress_content ON video_progress(content_id);

ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own video progress"
  ON video_progress FOR ALL
  USING (auth.uid() = user_id);

-- Create quiz_sessions table for pause/resume functionality
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_id UUID NOT NULL,
  answers JSONB DEFAULT '{}',
  current_question INTEGER DEFAULT 0,
  time_remaining INTEGER,
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exam_id)
);

CREATE INDEX idx_quiz_sessions_user ON quiz_sessions(user_id);

ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quiz sessions"
  ON quiz_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to award points
CREATE OR REPLACE FUNCTION award_points(p_user_id UUID, p_points INTEGER, p_activity_type TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO user_rankings (user_id, total_points, last_activity_date)
  VALUES (p_user_id, p_points, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE
  SET total_points = user_rankings.total_points + p_points,
      last_activity_date = CURRENT_DATE,
      updated_at = NOW();

  PERFORM update_user_streak(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update rankings
CREATE OR REPLACE FUNCTION update_rankings()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_rankings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_rankings_updated_at
  BEFORE UPDATE ON user_rankings
  FOR EACH ROW
  EXECUTE FUNCTION update_rankings_updated_at();

CREATE TRIGGER update_quiz_sessions_updated_at
  BEFORE UPDATE ON quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_rankings_updated_at();