-- Add edited column to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN edited BOOLEAN DEFAULT FALSE AFTER is_read,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;