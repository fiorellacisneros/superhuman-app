-- Add feedback column to submissions (for admin review notes to student)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS feedback text;
