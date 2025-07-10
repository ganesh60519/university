-- Update task status enum to include submitted and rejected
ALTER TABLE tasks MODIFY COLUMN status ENUM('pending','in_progress','submitted','completed','rejected') DEFAULT 'pending';