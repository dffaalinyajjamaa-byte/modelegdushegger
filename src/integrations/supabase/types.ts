export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      aadaa_videos: {
        Row: {
          category: string
          created_at: string | null
          display_order: number | null
          duration: string | null
          id: string
          thumbnail_url: string | null
          title: string
          youtube_url: string
        }
        Insert: {
          category: string
          created_at?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          title: string
          youtube_url: string
        }
        Update: {
          category?: string
          created_at?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          youtube_url?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      afoola_videos: {
        Row: {
          category: string
          created_at: string | null
          display_order: number | null
          duration: string | null
          id: string
          thumbnail_url: string | null
          title: string
          youtube_url: string
        }
        Insert: {
          category: string
          created_at?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          title: string
          youtube_url: string
        }
        Update: {
          category?: string
          created_at?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          youtube_url?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_user_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          blocked_user_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          blocked_user_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      book_ai_chats: {
        Row: {
          answer: string
          book_id: string
          created_at: string | null
          id: string
          page_number: number | null
          question: string
          user_id: string
        }
        Insert: {
          answer: string
          book_id: string
          created_at?: string | null
          id?: string
          page_number?: number | null
          question: string
          user_id: string
        }
        Update: {
          answer?: string
          book_id?: string
          created_at?: string | null
          id?: string
          page_number?: number | null
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_ai_chats_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      book_progress: {
        Row: {
          book_id: string
          bookmarks: Json | null
          completion_percentage: number | null
          created_at: string | null
          current_page: number | null
          id: string
          last_position: string | null
          last_read_at: string | null
          total_pages: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          bookmarks?: Json | null
          completion_percentage?: number | null
          created_at?: string | null
          current_page?: number | null
          id?: string
          last_position?: string | null
          last_read_at?: string | null
          total_pages?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          bookmarks?: Json | null
          completion_percentage?: number | null
          created_at?: string | null
          current_page?: number | null
          id?: string
          last_position?: string | null
          last_read_at?: string | null
          total_pages?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_posts: {
        Row: {
          author_id: string
          channel_id: string
          content: string | null
          created_at: string | null
          id: string
          media_type: string | null
          media_url: string | null
          reactions: Json | null
          views: number | null
        }
        Insert: {
          author_id: string
          channel_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          reactions?: Json | null
          views?: number | null
        }
        Update: {
          author_id?: string
          channel_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          reactions?: Json | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          admins: string[]
          avatar_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          subscribers: string[] | null
          updated_at: string | null
        }
        Insert: {
          admins?: string[]
          avatar_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          subscribers?: string[] | null
          updated_at?: string | null
        }
        Update: {
          admins?: string[]
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          subscribers?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          language: string | null
          message: string
          response: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          message: string
          response?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          message?: string
          response?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          admins: string[] | null
          chat_id: string
          created_at: string | null
          created_by: string | null
          group_avatar_url: string | null
          group_name: string | null
          id: string
          is_group: boolean | null
          members: string[]
          updated_at: string | null
        }
        Insert: {
          admins?: string[] | null
          chat_id: string
          created_at?: string | null
          created_by?: string | null
          group_avatar_url?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean | null
          members: string[]
          updated_at?: string | null
        }
        Update: {
          admins?: string[] | null
          chat_id?: string
          created_at?: string | null
          created_by?: string | null
          group_avatar_url?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean | null
          members?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      content: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          grade_level: string | null
          id: string
          subject: string | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_level?: string | null
          id?: string
          subject?: string | null
          thumbnail_url?: string | null
          title: string
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_level?: string | null
          id?: string
          subject?: string | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      content_likes: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          active_date: string
          challenge_type: string
          content_data: Json | null
          created_at: string | null
          description: string | null
          grade_level: string | null
          id: string
          points: number | null
          subject: string
          title: string
        }
        Insert: {
          active_date: string
          challenge_type: string
          content_data?: Json | null
          created_at?: string | null
          description?: string | null
          grade_level?: string | null
          id?: string
          points?: number | null
          subject: string
          title: string
        }
        Update: {
          active_date?: string
          challenge_type?: string
          content_data?: Json | null
          created_at?: string | null
          description?: string | null
          grade_level?: string | null
          id?: string
          points?: number | null
          subject?: string
          title?: string
        }
        Relationships: []
      }
      daily_stats: {
        Row: {
          ai_interactions: number | null
          created_at: string | null
          date: string
          exams_taken: number | null
          id: string
          learning_time_minutes: number | null
          materials_read: number | null
          tasks_completed: number | null
          user_id: string
          videos_watched: number | null
        }
        Insert: {
          ai_interactions?: number | null
          created_at?: string | null
          date?: string
          exams_taken?: number | null
          id?: string
          learning_time_minutes?: number | null
          materials_read?: number | null
          tasks_completed?: number | null
          user_id: string
          videos_watched?: number | null
        }
        Update: {
          ai_interactions?: number | null
          created_at?: string | null
          date?: string
          exams_taken?: number | null
          id?: string
          learning_time_minutes?: number | null
          materials_read?: number | null
          tasks_completed?: number | null
          user_id?: string
          videos_watched?: number | null
        }
        Relationships: []
      }
      exam_submissions: {
        Row: {
          answers: Json
          exam_id: string
          id: string
          questions_correct: number | null
          questions_wrong: number | null
          score: number | null
          submitted_at: string | null
          time_taken: number | null
          total_marks: number | null
          user_id: string
        }
        Insert: {
          answers: Json
          exam_id: string
          id?: string
          questions_correct?: number | null
          questions_wrong?: number | null
          score?: number | null
          submitted_at?: string | null
          time_taken?: number | null
          total_marks?: number | null
          user_id: string
        }
        Update: {
          answers?: Json
          exam_id?: string
          id?: string
          questions_correct?: number | null
          questions_wrong?: number | null
          score?: number | null
          submitted_at?: string | null
          time_taken?: number | null
          total_marks?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_submissions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          grade_level: string | null
          id: string
          questions: Json
          subject: string
          title: string
          total_marks: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          grade_level?: string | null
          id?: string
          questions: Json
          subject: string
          title: string
          total_marks?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          grade_level?: string | null
          id?: string
          questions?: Json
          subject?: string
          title?: string
          total_marks?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string
          sender_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      live_teacher_sessions: {
        Row: {
          created_at: string | null
          id: string
          language: string | null
          messages: Json | null
          session_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          language?: string | null
          messages?: Json | null
          session_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string | null
          messages?: Json | null
          session_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      live_teacher_settings: {
        Row: {
          auto_speak_responses: boolean | null
          continuous_listening: boolean | null
          created_at: string | null
          id: string
          language_preference: string | null
          speech_speed: number | null
          updated_at: string | null
          user_id: string
          voice_id: string | null
        }
        Insert: {
          auto_speak_responses?: boolean | null
          continuous_listening?: boolean | null
          created_at?: string | null
          id?: string
          language_preference?: string | null
          speech_speed?: number | null
          updated_at?: string | null
          user_id: string
          voice_id?: string | null
        }
        Update: {
          auto_speak_responses?: boolean | null
          continuous_listening?: boolean | null
          created_at?: string | null
          id?: string
          language_preference?: string | null
          speech_speed?: number | null
          updated_at?: string | null
          user_id?: string
          voice_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          reply_to: string | null
          seen_by: string[] | null
          sender_id: string
          status: string | null
          timestamp: string | null
          type: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          reply_to?: string | null
          seen_by?: string[] | null
          sender_id: string
          status?: string | null
          timestamp?: string | null
          type: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          reply_to?: string | null
          seen_by?: string[] | null
          sender_id?: string
          status?: string | null
          timestamp?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["chat_id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_users: {
        Row: {
          created_at: string | null
          id: string
          name: string
          profile_pic: string | null
          search_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          profile_pic?: string | null
          search_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          profile_pic?: string | null
          search_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      national_exams: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          pdf_url: string
          subject: string
          title: string
          year: number
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          pdf_url: string
          subject: string
          title: string
          year: number
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          pdf_url?: string
          subject?: string
          title?: string
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          education_level: string | null
          email: string
          emergency_contact: string | null
          family_phone: string | null
          favorite_subject: string | null
          full_name: string
          goal: string | null
          grade: string | null
          home_address: string | null
          id: string
          is_verified: boolean | null
          last_seen: string | null
          parent_name: string | null
          role: string
          school_name: string | null
          teaching_subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          education_level?: string | null
          email: string
          emergency_contact?: string | null
          family_phone?: string | null
          favorite_subject?: string | null
          full_name: string
          goal?: string | null
          grade?: string | null
          home_address?: string | null
          id?: string
          is_verified?: boolean | null
          last_seen?: string | null
          parent_name?: string | null
          role?: string
          school_name?: string | null
          teaching_subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          education_level?: string | null
          email?: string
          emergency_contact?: string | null
          family_phone?: string | null
          favorite_subject?: string | null
          full_name?: string
          goal?: string | null
          grade?: string | null
          home_address?: string | null
          id?: string
          is_verified?: boolean | null
          last_seen?: string | null
          parent_name?: string | null
          role?: string
          school_name?: string | null
          teaching_subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_sessions: {
        Row: {
          answers: Json | null
          created_at: string | null
          current_question: number | null
          exam_id: string
          id: string
          paused_at: string | null
          time_remaining: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string | null
          current_question?: number | null
          exam_id: string
          id?: string
          paused_at?: string | null
          time_remaining?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string | null
          current_question?: number | null
          exam_id?: string
          id?: string
          paused_at?: string | null
          time_remaining?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      relax_time_videos: {
        Row: {
          category: string
          created_at: string | null
          display_order: number | null
          duration: string | null
          id: string
          language: string
          thumbnail_url: string | null
          title: string
          youtube_url: string
        }
        Insert: {
          category: string
          created_at?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          language: string
          thumbnail_url?: string | null
          title: string
          youtube_url: string
        }
        Update: {
          category?: string
          created_at?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          language?: string
          thumbnail_url?: string | null
          title?: string
          youtube_url?: string
        }
        Relationships: []
      }
      reported_messages: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          reason: string
          reported_by: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          reason: string
          reported_by: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          reason?: string
          reported_by?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reported_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_planner_plans: {
        Row: {
          created_at: string
          id: string
          plan_data: Json
          user_id: string
          week_index: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          plan_data: Json
          user_id: string
          week_index: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          plan_data?: Json
          user_id?: string
          week_index?: number
          year?: number
        }
        Relationships: []
      }
      smart_planner_settings: {
        Row: {
          created_at: string
          day_of_week: string
          dinner_end: string | null
          dinner_start: string | null
          id: string
          rest_end: string | null
          rest_start: string | null
          school_end: string | null
          school_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          dinner_end?: string | null
          dinner_start?: string | null
          id?: string
          rest_end?: string | null
          rest_start?: string | null
          school_end?: string | null
          school_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          dinner_end?: string | null
          dinner_start?: string | null
          id?: string
          rest_end?: string | null
          rest_start?: string | null
          school_end?: string | null
          school_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smart_planner_subjects: {
        Row: {
          created_at: string
          id: string
          priority: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          priority?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          background_color: string | null
          content_type: string
          content_url: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          text_content: string | null
          user_id: string
        }
        Insert: {
          background_color?: string | null
          content_type: string
          content_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          text_content?: string | null
          user_id: string
        }
        Update: {
          background_color?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          text_content?: string | null
          user_id?: string
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      teacher_uploads: {
        Row: {
          content_data: Json | null
          created_at: string | null
          description: string | null
          file_url: string | null
          grade_level: string | null
          id: string
          school: string | null
          subject: string | null
          teacher_id: string
          teacher_name: string
          title: string
          type: string
          views_count: number | null
        }
        Insert: {
          content_data?: Json | null
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          grade_level?: string | null
          id?: string
          school?: string | null
          subject?: string | null
          teacher_id: string
          teacher_name: string
          title: string
          type: string
          views_count?: number | null
        }
        Update: {
          content_data?: Json | null
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          grade_level?: string | null
          id?: string
          school?: string | null
          subject?: string | null
          teacher_id?: string
          teacher_name?: string
          title?: string
          type?: string
          views_count?: number | null
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          chat_id: string
          id: string
          is_typing: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          activity_type: string
          created_at: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          start_time: string | null
          subject: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          start_time?: string | null
          subject?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          start_time?: string | null
          subject?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          points_earned: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          points_earned?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          points_earned?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_rankings: {
        Row: {
          badge_tier: string | null
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          posts_count: number | null
          rank: number | null
          signup_date: string | null
          teacher_points: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badge_tier?: string | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          posts_count?: number | null
          rank?: number | null
          signup_date?: string | null
          teacher_points?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          badge_tier?: string | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          posts_count?: number | null
          rank?: number | null
          signup_date?: string | null
          teacher_points?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          created_at: string
          id: string
          materials_read: number
          tasks_completed: number
          updated_at: string
          user_id: string
          videos_watched: number
        }
        Insert: {
          created_at?: string
          id?: string
          materials_read?: number
          tasks_completed?: number
          updated_at?: string
          user_id: string
          videos_watched?: number
        }
        Update: {
          created_at?: string
          id?: string
          materials_read?: number
          tasks_completed?: number
          updated_at?: string
          user_id?: string
          videos_watched?: number
        }
        Relationships: []
      }
      video_progress: {
        Row: {
          completed: boolean | null
          content_id: string
          created_at: string | null
          id: string
          last_watched_at: string | null
          percentage_watched: number | null
          playback_time: number | null
          total_duration: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          content_id: string
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          percentage_watched?: number | null
          playback_time?: number | null
          total_duration?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          content_id?: string
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          percentage_watched?: number | null
          playback_time?: number | null
          total_duration?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points: {
        Args: { p_activity_type: string; p_points: number; p_user_id: string }
        Returns: undefined
      }
      get_message_thread: {
        Args: { message_id: string }
        Returns: {
          msg_chat_id: string
          msg_content: string
          msg_file_name: string
          msg_file_size: number
          msg_file_url: string
          msg_id: string
          msg_reply_to: string
          msg_seen_by: string[]
          msg_sender_id: string
          msg_status: string
          msg_timestamp: string
          msg_type: string
          thread_level: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_daily_stat: {
        Args: { p_increment?: number; p_stat_type: string; p_user_id: string }
        Returns: undefined
      }
      search_users_similar: {
        Args: { exclude_user_id: string; search_term: string }
        Returns: {
          created_at: string | null
          id: string
          name: string
          profile_pic: string | null
          search_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "messaging_users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_rankings: { Args: never; Returns: undefined }
      update_user_streak: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "teacher", "admin"],
    },
  },
} as const
