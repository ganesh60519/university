-- Add this migration to add the missing faculty_name column to the attendance table

ALTER TABLE attendance
ADD COLUMN faculty_name VARCHAR(255);
