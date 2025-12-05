-- Enable pg_trgm extension for similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create function for fuzzy user search with similarity matching
CREATE OR REPLACE FUNCTION search_users_similar(search_term text, exclude_user_id uuid)
RETURNS SETOF messaging_users AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM messaging_users
  WHERE user_id != exclude_user_id
  AND (
    name ILIKE '%' || search_term || '%'
    OR search_id ILIKE '%' || search_term || '%'
    OR SIMILARITY(LOWER(name), LOWER(search_term)) > 0.2
  )
  ORDER BY 
    CASE 
      WHEN LOWER(name) = LOWER(search_term) THEN 0
      WHEN name ILIKE search_term || '%' THEN 1
      WHEN name ILIKE '%' || search_term || '%' THEN 2
      ELSE 3
    END,
    SIMILARITY(LOWER(name), LOWER(search_term)) DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;