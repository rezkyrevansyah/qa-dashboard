export type SuiteType = 'api' | 'ui'

export type RunStatus = 'pending' | 'running' | 'passed' | 'need_fix' | 'failed' | 'error'

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'pending'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface Suite {
  id: string
  name: string
  path: string
  description: string | null
  suite_type: SuiteType
  created_at: string
  updated_at: string
}

export interface Spec {
  id: string
  suite_id: string
  name: string
  path: string
  created_at: string
  updated_at: string
}

export interface TestRun {
  id: string
  suite_id: string
  spec_id: string | null
  triggered_by: string | null
  status: RunStatus
  github_run_id: number | null
  github_run_url: string | null
  total_tests: number
  passed_tests: number
  failed_tests: number
  skipped_tests: number
  duration_ms: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface TestResult {
  id: string
  run_id: string
  spec_id: string
  status: TestStatus
  duration_ms: number | null
  error_message: string | null
  error_stack: string | null
  created_at: string
}

export interface TestCase {
  id: string
  result_id: string
  title: string
  status: TestStatus
  duration_ms: number | null
  error_message: string | null
  error_stack: string | null
  http_method: HttpMethod | null
  http_url: string | null
  http_status: number | null
  http_duration_ms: number | null
  screenshot_url: string | null
  created_at: string
}

// Enriched types for UI
export interface SuiteWithLastRun extends Suite {
  last_run: TestRun | null
  specs: Spec[]
}

export interface TestRunWithDetails extends TestRun {
  suite: Suite
  spec: Spec | null
  results: TestResultWithCases[]
}

export interface TestResultWithCases extends TestResult {
  spec: Spec
  cases: TestCase[]
}

export interface DashboardStats {
  total_runs: number
  total_passed: number
  total_failed: number
  pass_rate: number
}

export interface TrendDataPoint {
  date: string
  passed: number
  failed: number
}

export interface PublicReport {
  id: string
  token: string
  run_id: string
  suite_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PublicReportWithDetails extends PublicReport {
  run: TestRun
  suite: Suite
}
