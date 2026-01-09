CREATE TABLE IF NOT EXISTS certificates_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id), -- Vincula con el usuario de Supabase
  student_name TEXT NOT NULL,
  course_level TEXT NOT NULL,
  completion_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE certificates_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own certificates
CREATE POLICY "Users can insert their own certificates" 
ON certificates_history FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to view their own certificates
CREATE POLICY "Users can view their own certificates" 
ON certificates_history FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);
