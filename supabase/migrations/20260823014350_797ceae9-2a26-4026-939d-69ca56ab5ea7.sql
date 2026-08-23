-- 1. Audit trail
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read audit trail" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Users write own audit entries" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);

-- 2. Recommendation note versions
CREATE TABLE public.recommendation_note_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL,
  version integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL,
  is_active boolean NOT NULL,
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recommendation_note_versions TO authenticated;
GRANT ALL ON public.recommendation_note_versions TO service_role;
ALTER TABLE public.recommendation_note_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read note versions" ON public.recommendation_note_versions
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX rec_note_versions_note_idx ON public.recommendation_note_versions (note_id, version DESC);

CREATE OR REPLACE FUNCTION public.snapshot_recommendation_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE next_version integer;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
  FROM public.recommendation_note_versions WHERE note_id = NEW.id;
  INSERT INTO public.recommendation_note_versions
    (note_id, version, title, body, category, is_active, edited_by)
  VALUES (NEW.id, next_version, NEW.title, NEW.body, NEW.category, NEW.is_active, auth.uid());
  RETURN NEW;
END;
$$;

CREATE TRIGGER recommendation_notes_versioning
AFTER INSERT OR UPDATE ON public.recommendation_notes
FOR EACH ROW EXECUTE FUNCTION public.snapshot_recommendation_note();

-- 3. Recommendation templates
CREATE TABLE public.recommendation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendation_templates TO authenticated;
GRANT ALL ON public.recommendation_templates TO service_role;
ALTER TABLE public.recommendation_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage templates" ON public.recommendation_templates
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER recommendation_templates_updated_at
BEFORE UPDATE ON public.recommendation_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.recommendation_templates (name, title, body, category) VALUES
('CA 40% push', 'Protect your 40% continuous assessment marks',
 'Quizzes, assignments, presentations and practicals together carry 40% of every course mark. Submit every piece of coursework, keep a copy, and treat each quiz as a mini exam - these marks are the easiest to secure before the 60% end-of-semester paper.',
 'continuous-assessment'),
('Exam 60% preparation', 'Start end-of-semester revision early',
 'The final examination carries 60% of your course mark. Build a six-week revision plan, work through past questions under timed conditions, and attend every face-to-face session at your study centre.',
 'examination'),
('At-risk support', 'Speak to your study centre coordinator',
 'Your current forecast falls near the pass boundary. Book a session with your CoDE study centre coordinator, join a peer study group, and prioritise the courses with the lowest continuous assessment scores.',
 'at-risk');

-- 4. Branding settings (crest uploads)
CREATE TABLE public.branding_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.branding_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding_settings TO authenticated;
GRANT ALL ON public.branding_settings TO service_role;
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read branding" ON public.branding_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage branding" ON public.branding_settings
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER branding_settings_updated_at
BEFORE UPDATE ON public.branding_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();