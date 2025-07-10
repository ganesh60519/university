-- Add task submission fields to tasks table
ALTER TABLE tasks 
ADD COLUMN submission_text TEXT,
ADD COLUMN submitted_at TIMESTAMP NULL,
ADD COLUMN feedback TEXT,
ADD COLUMN reviewed_at TIMESTAMP NULL;

-- Update existing tasks to have proper default status
UPDATE tasks SET status = 'pending' WHERE status IS NULL OR status = '';