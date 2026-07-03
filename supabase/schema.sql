-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.suites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  path text NOT NULL UNIQUE,
  description text,
  suite_type text NOT NULL DEFAULT 'api'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT suites_pkey PRIMARY KEY (id)
);
CREATE TABLE public.specs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  suite_id uuid NOT NULL,
  name text NOT NULL,
  path text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT specs_pkey PRIMARY KEY (id),
  CONSTRAINT specs_suite_id_fkey FOREIGN KEY (suite_id) REFERENCES public.suites(id)
);
CREATE TABLE public.test_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  suite_id uuid NOT NULL,
  spec_id uuid,
  triggered_by uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  github_run_id bigint,
  github_run_url text,
  total_tests integer NOT NULL DEFAULT 0,
  passed_tests integer NOT NULL DEFAULT 0,
  failed_tests integer NOT NULL DEFAULT 0,
  skipped_tests integer NOT NULL DEFAULT 0,
  duration_ms integer,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT test_runs_pkey PRIMARY KEY (id),
  CONSTRAINT test_runs_suite_id_fkey FOREIGN KEY (suite_id) REFERENCES public.suites(id),
  CONSTRAINT test_runs_spec_id_fkey FOREIGN KEY (spec_id) REFERENCES public.specs(id),
  CONSTRAINT test_runs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES auth.users(id)
);
CREATE TABLE public.test_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  spec_id uuid NOT NULL,
  status text NOT NULL,
  duration_ms integer,
  error_message text,
  error_stack text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT test_results_pkey PRIMARY KEY (id),
  CONSTRAINT test_results_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.test_runs(id),
  CONSTRAINT test_results_spec_id_fkey FOREIGN KEY (spec_id) REFERENCES public.specs(id)
);
CREATE TABLE public.test_cases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL,
  duration_ms integer,
  error_message text,
  error_stack text,
  http_method text,
  http_url text,
  http_status integer,
  http_duration_ms integer,
  screenshot_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT test_cases_pkey PRIMARY KEY (id),
  CONSTRAINT test_cases_result_id_fkey FOREIGN KEY (result_id) REFERENCES public.test_results(id)
);
CREATE TABLE public.sync_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running'::text,
  triggered_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  suites_upserted integer,
  specs_upserted integer,
  error_message text,
  CONSTRAINT sync_jobs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.public_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  run_id uuid NOT NULL,
  suite_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text,
  CONSTRAINT public_reports_pkey PRIMARY KEY (id),
  CONSTRAINT public_reports_suite_id_fkey FOREIGN KEY (suite_id) REFERENCES public.suites(id),
  CONSTRAINT public_reports_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.test_runs(id)
);
CREATE TABLE public.run_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL UNIQUE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT run_notes_pkey PRIMARY KEY (id),
  CONSTRAINT run_notes_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.test_runs(id)
);