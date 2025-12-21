-- Create folders table for organizing notes
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notes table for cloud storage
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Folders RLS policies
CREATE POLICY "Users can view their own folders" 
ON public.folders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders" 
ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
ON public.folders FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
ON public.folders FOR DELETE USING (auth.uid() = user_id);

-- Notes RLS policies
CREATE POLICY "Users can view their own notes" 
ON public.notes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" 
ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
ON public.notes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
ON public.notes FOR DELETE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_folders_updated_at
BEFORE UPDATE ON public.folders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();