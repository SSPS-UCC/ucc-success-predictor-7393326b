ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, student_id, programme, study_centre, level)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone'),
    NULLIF(NEW.raw_user_meta_data ->> 'student_id', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'programme', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'study_centre', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'level', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;