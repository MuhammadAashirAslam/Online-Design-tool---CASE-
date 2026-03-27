-- ═══════════════════════════════════════════════════
-- ODT Database Schema for Supabase (v2 — Normalized)
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ══════════════════════════════════════
-- 1. USERS  (extends Supabase auth.users)
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.users (
  id         uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      text NOT NULL,
  username   text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ══════════════════════════════════════
-- 2. PROJECTS
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.projects (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id   uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL DEFAULT 'Untitled Project',
  arch_style text NOT NULL DEFAULT 'custom'
    CHECK (arch_style IN (
      'mvc', 'layered', 'client-server', 'pipe-filter',
      'soa', 'component-based', 'custom'
    )),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = owner_id);

-- Auto-update updated_at on every row change
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ══════════════════════════════════════
-- 3. PROJECT MEMBERS  (collaboration)
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.project_members (
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role       text NOT NULL DEFAULT 'editor'
    CHECK (role IN ('viewer', 'editor', 'admin')),
  joined_at  timestamptz DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their memberships"
  ON public.project_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Project owners can manage members"
  ON public.project_members FOR ALL
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.projects WHERE id = project_id
    )
  );

-- ══════════════════════════════════════
-- 4. DIAGRAMS
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.diagrams (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL DEFAULT 'Untitled Diagram',
  uml_type   text NOT NULL DEFAULT 'class'
    CHECK (uml_type IN (
      'class', 'object', 'usecase', 'deployment',
      'component', 'sequence', 'activity', 'state', 'package'
    )),
  view_type  text NOT NULL DEFAULT 'logical'
    CHECK (view_type IN (
      'scenario', 'logical', 'development', 'process', 'physical'
    )),
  is_valid   boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagrams_project ON public.diagrams(project_id);

ALTER TABLE public.diagrams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view diagrams of own projects"
  ON public.diagrams FOR SELECT
  USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can create diagrams in own projects"
  ON public.diagrams FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update diagrams in own projects"
  ON public.diagrams FOR UPDATE
  USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete diagrams in own projects"
  ON public.diagrams FOR DELETE
  USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

-- Auto-update updated_at
CREATE TRIGGER diagrams_updated_at
  BEFORE UPDATE ON public.diagrams
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ══════════════════════════════════════
-- HELPER: ownership check for deep tables
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.user_owns_diagram(d_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.diagrams d
    JOIN public.projects p ON d.project_id = p.id
    WHERE d.id = d_id AND p.owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ══════════════════════════════════════
-- 5. ELEMENTS
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.elements (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  diagram_id   uuid REFERENCES public.diagrams(id) ON DELETE CASCADE NOT NULL,
  element_type text NOT NULL
    CHECK (element_type IN (
      'class-box', 'actor', 'actor-user', 'actor-admin', 'actor-system',
      'usecase', 'component', 'node', 'interface', 'package',
      'note', 'object', 'state', 'activity'
    )),
  label      text NOT NULL DEFAULT '',
  pos_x      float NOT NULL DEFAULT 0,
  pos_y      float NOT NULL DEFAULT 0,
  width      float NOT NULL DEFAULT 120,
  height     float NOT NULL DEFAULT 80,
  fill       text DEFAULT '#E6F1FB',
  stroke     text DEFAULT '#378ADD',
  stereotype text DEFAULT '',
  notes      text DEFAULT '',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elements_diagram ON public.elements(diagram_id);

ALTER TABLE public.elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage elements in own diagrams"
  ON public.elements FOR ALL
  USING (public.user_owns_diagram(diagram_id));

-- ══════════════════════════════════════
-- 6. ATTRIBUTES  (normalized from JSONB)
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.attributes (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  element_id uuid REFERENCES public.elements(id) ON DELETE CASCADE NOT NULL,
  visibility text NOT NULL DEFAULT '+'
    CHECK (visibility IN ('+', '-', '#', '~')),
  name       text NOT NULL DEFAULT '',
  type       text NOT NULL DEFAULT 'String',
  sort_order int DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_attributes_element ON public.attributes(element_id);

ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage attributes via element ownership"
  ON public.attributes FOR ALL
  USING (
    element_id IN (
      SELECT e.id FROM public.elements e
      WHERE public.user_owns_diagram(e.diagram_id)
    )
  );

-- ══════════════════════════════════════
-- 7. METHODS  (normalized from JSONB)
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.methods (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  element_id  uuid REFERENCES public.elements(id) ON DELETE CASCADE NOT NULL,
  visibility  text NOT NULL DEFAULT '+'
    CHECK (visibility IN ('+', '-', '#', '~')),
  name        text NOT NULL DEFAULT '',
  return_type text NOT NULL DEFAULT 'void',
  params      text DEFAULT '',
  sort_order  int DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_methods_element ON public.methods(element_id);

ALTER TABLE public.methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage methods via element ownership"
  ON public.methods FOR ALL
  USING (
    element_id IN (
      SELECT e.id FROM public.elements e
      WHERE public.user_owns_diagram(e.diagram_id)
    )
  );

-- ══════════════════════════════════════
-- 8. CONNECTORS
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.connectors (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  diagram_id          uuid REFERENCES public.diagrams(id) ON DELETE CASCADE NOT NULL,
  source_id           uuid REFERENCES public.elements(id) ON DELETE CASCADE NOT NULL,
  target_id           uuid REFERENCES public.elements(id) ON DELETE CASCADE NOT NULL,
  relation_type       text NOT NULL DEFAULT 'association'
    CHECK (relation_type IN (
      'association', 'inheritance', 'realization', 'dependency',
      'aggregation', 'composition', 'include', 'extend'
    )),
  label               text DEFAULT '',
  multiplicity_source text DEFAULT '',
  multiplicity_target text DEFAULT '',
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connectors_diagram ON public.connectors(diagram_id);
CREATE INDEX IF NOT EXISTS idx_connectors_source  ON public.connectors(source_id);
CREATE INDEX IF NOT EXISTS idx_connectors_target  ON public.connectors(target_id);

ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage connectors in own diagrams"
  ON public.connectors FOR ALL
  USING (public.user_owns_diagram(diagram_id));

-- ══════════════════════════════════════
-- 9. EXPORTS
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.exports (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  diagram_id uuid REFERENCES public.diagrams(id) ON DELETE CASCADE NOT NULL,
  format     text NOT NULL
    CHECK (format IN ('png', 'svg', 'pdf')),
  file_url   text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exports_diagram ON public.exports(diagram_id);

ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage exports of own diagrams"
  ON public.exports FOR ALL
  USING (public.user_owns_diagram(diagram_id));

-- ══════════════════════════════════════
-- 10. VALIDATION LOGS
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.validation_logs (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  diagram_id  uuid REFERENCES public.diagrams(id) ON DELETE CASCADE NOT NULL,
  error_count int DEFAULT 0,
  errors      jsonb DEFAULT '[]'::jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_validation_logs_diagram ON public.validation_logs(diagram_id);

ALTER TABLE public.validation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage validation logs of own diagrams"
  ON public.validation_logs FOR ALL
  USING (public.user_owns_diagram(diagram_id));

-- ══════════════════════════════════════
-- TRIGGER: Auto-create user profile on signup
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists, then re-create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ══════════════════════════════════════
-- API ACCESS GRANTS
-- Required for PostgREST to expose tables
-- ══════════════════════════════════════
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.projects TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.project_members TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.diagrams TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.elements TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.attributes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.methods TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.connectors TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.exports TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.validation_logs TO anon, authenticated, service_role;

-- ══════════════════════════════════════
-- STORAGE: Diagram Exports Bucket
-- ══════════════════════════════════════
-- NOTE: Run this SEPARATELY in the Supabase SQL Editor
-- because bucket creation via SQL is only available
-- when the storage schema is accessible.
--
-- Alternatively, create the bucket via the Dashboard:
--   Storage → New Bucket → "diagram-exports" → Public
--
-- The RLS policies below secure file access:

INSERT INTO storage.buckets (id, name, public)
VALUES ('diagram-exports', 'diagram-exports', true)
ON CONFLICT (id) DO NOTHING;

-- Users can upload to their own folder (userId/...)
CREATE POLICY "Users can upload own exports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'diagram-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own exports
CREATE POLICY "Users can read own exports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'diagram-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read access (since bucket is public, anyone with the URL can view)
CREATE POLICY "Public read access for exports"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'diagram-exports');

-- Users can delete their own exports
CREATE POLICY "Users can delete own exports"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'diagram-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
