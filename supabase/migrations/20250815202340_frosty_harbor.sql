/*
  # Ensure Organizations Schema Exists
  
  This migration ensures that all required organization-related database objects exist.
  It's safe to run multiple times as it uses IF NOT EXISTS and CREATE OR REPLACE patterns.
  
  1. Tables
     - organizations (with owner_id column)
     - org_members 
     - org_invitations
  
  2. Functions
     - get_active_org_id()
     - set_active_org()
     - backfill_personal_orgs()
  
  3. Policies
     - RLS policies for all org tables
  
  4. Indexes
     - Performance indexes
*/

-- ========== ORGANIZATIONS TABLE ==========
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ========== ORG MEMBERS TABLE ==========
CREATE TABLE IF NOT EXISTS public.org_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','inactive')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- ========== ORG INVITATIONS TABLE ==========
CREATE TABLE IF NOT EXISTS public.org_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

-- ========== INDEXES ==========
CREATE INDEX IF NOT EXISTS organizations_owner_idx ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS org_members_user_idx ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS org_invitations_org_idx ON public.org_invitations(org_id);

-- ========== ADD ACTIVE ORG TO PROFILES ==========
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'active_org_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN active_org_id uuid REFERENCES public.organizations(id);
  END IF;
END $$;

-- Alternative org_id column if using that approach
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN org_id uuid REFERENCES public.organizations(id);
  END IF;
END $$;

-- ========== FUNCTIONS ==========
CREATE OR REPLACE FUNCTION public.get_active_org_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  _org_id uuid;
BEGIN
  -- First preference: profile.active_org_id if it exists
  SELECT p.active_org_id INTO _org_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  -- Fallback: profile.org_id if active_org_id is null
  IF _org_id IS NULL THEN
    SELECT p.org_id INTO _org_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid();
  END IF;

  -- Final fallback: first membership
  IF _org_id IS NULL THEN
    SELECT om.org_id INTO _org_id
    FROM public.org_members om
    WHERE om.user_id = auth.uid()
    ORDER BY om.joined_at ASC
    LIMIT 1;
  END IF;

  RETURN _org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_active_org(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is member of the org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  -- Update both columns if they exist
  UPDATE public.profiles
  SET 
    active_org_id = p_org_id,
    org_id = p_org_id,
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- ========== POLICIES ==========

-- Organizations policies
DROP POLICY IF EXISTS orgs_owner_manage ON public.organizations;
DROP POLICY IF EXISTS orgs_member_read ON public.organizations;

CREATE POLICY orgs_owner_manage ON public.organizations
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY orgs_member_read ON public.organizations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = organizations.id 
      AND m.user_id = auth.uid() 
      AND m.status = 'active'
  ));

-- Org members policies
DROP POLICY IF EXISTS org_members_owner_admin_manage ON public.org_members;
DROP POLICY IF EXISTS org_members_member_read_self ON public.org_members;

CREATE POLICY org_members_owner_admin_manage ON public.org_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members me
      WHERE me.org_id = org_members.org_id
        AND me.user_id = auth.uid()
        AND me.role IN ('owner','admin')
        AND me.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members me
      WHERE me.org_id = org_members.org_id
        AND me.user_id = auth.uid()
        AND me.role IN ('owner','admin')
        AND me.status = 'active'
    )
  );

CREATE POLICY org_members_member_read_self ON public.org_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Org invitations policies
DROP POLICY IF EXISTS org_inviter_manage ON public.org_invitations;
DROP POLICY IF EXISTS org_invitee_read ON public.org_invitations;

CREATE POLICY org_inviter_manage ON public.org_invitations
  FOR ALL TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY org_invitee_read ON public.org_invitations
  FOR SELECT TO authenticated
  USING (invited_email = (
    SELECT email FROM public.profiles WHERE user_id = auth.uid()
  ));

-- ========== ADD ORG_ID TO AGENTS TABLES ==========
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.agents ADD COLUMN org_id uuid REFERENCES public.organizations(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_versions' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.agent_versions ADD COLUMN org_id uuid REFERENCES public.organizations(id);
  END IF;
END $$;

-- ========== PERSONAL ORG BACKFILL FUNCTION ==========
CREATE OR REPLACE FUNCTION public.backfill_personal_orgs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
  new_org uuid;
BEGIN
  FOR r IN
    SELECT u.id, COALESCE(p.email, u.email) as email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
  LOOP
    -- Create org only if user has no owner membership
    IF NOT EXISTS (
      SELECT 1 FROM public.org_members m 
      WHERE m.user_id = r.id AND m.role = 'owner'
    ) THEN
      INSERT INTO public.organizations (name, owner_id)
      VALUES (COALESCE(r.email, 'User') || ' Personal Org', r.id)
      RETURNING id INTO new_org;

      INSERT INTO public.org_members (org_id, user_id, role, status)
      VALUES (new_org, r.id, 'owner', 'active');

      -- Update both columns if they exist
      UPDATE public.profiles 
      SET 
        active_org_id = new_org,
        org_id = new_org,
        updated_at = now()
      WHERE user_id = r.id;
    END IF;
  END LOOP;

  -- Backfill agents and versions org_id where null
  UPDATE public.agents a
  SET org_id = COALESCE(p.active_org_id, p.org_id)
  FROM public.profiles p
  WHERE a.org_id IS NULL AND a.created_by = p.user_id;

  UPDATE public.agent_versions v
  SET org_id = a.org_id
  FROM public.agents a
  WHERE v.org_id IS NULL AND v.agent_id = a.id;
END;
$$;