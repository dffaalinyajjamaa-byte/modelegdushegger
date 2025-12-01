-- Add reply_to column to messages table for threading
ALTER TABLE messages 
ADD COLUMN reply_to uuid REFERENCES messages(id) ON DELETE SET NULL;

-- Add index for better performance on thread queries
CREATE INDEX idx_messages_reply_to ON messages(reply_to);

-- Create a function to get thread messages recursively
CREATE OR REPLACE FUNCTION get_message_thread(message_id uuid)
RETURNS TABLE (
  msg_id uuid,
  msg_chat_id text,
  msg_sender_id uuid,
  msg_type text,
  msg_content text,
  msg_file_url text,
  msg_file_name text,
  msg_file_size integer,
  msg_status text,
  msg_timestamp timestamp with time zone,
  msg_seen_by text[],
  msg_reply_to uuid,
  thread_level integer
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE thread AS (
    -- Get the root message
    SELECT 
      m.id,
      m.chat_id,
      m.sender_id,
      m.type,
      m.content,
      m.file_url,
      m.file_name,
      m.file_size,
      m.status,
      m.timestamp,
      m.seen_by,
      m.reply_to,
      0 as level
    FROM messages m
    WHERE m.id = message_id
    
    UNION ALL
    
    -- Get all replies recursively
    SELECT 
      m.id,
      m.chat_id,
      m.sender_id,
      m.type,
      m.content,
      m.file_url,
      m.file_name,
      m.file_size,
      m.status,
      m.timestamp,
      m.seen_by,
      m.reply_to,
      t.level + 1
    FROM messages m
    INNER JOIN thread t ON m.reply_to = t.id
  )
  SELECT 
    thread.id,
    thread.chat_id,
    thread.sender_id,
    thread.type,
    thread.content,
    thread.file_url,
    thread.file_name,
    thread.file_size,
    thread.status,
    thread.timestamp,
    thread.seen_by,
    thread.reply_to,
    thread.level
  FROM thread
  ORDER BY thread.timestamp ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_message_thread(uuid) TO authenticated;