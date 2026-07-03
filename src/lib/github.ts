interface WorkflowDispatchInputs {
  suite_name: string
  spec_file?: string
  run_id: string
}

/**
 * Triggers a GitHub Actions workflow_dispatch event on the testing-pool repo.
 * The workflow itself captures ${{ github.run_id }} and writes it back to Supabase.
 * GitHub returns HTTP 204 with no body on success.
 */
export async function triggerWorkflowDispatch(inputs: WorkflowDispatchInputs): Promise<void> {
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const workflow = process.env.GITHUB_WORKFLOW_FILE
  const pat = process.env.GITHUB_PAT

  if (!owner || !repo || !workflow || !pat) {
    throw new Error('Missing GitHub env vars: GITHUB_OWNER, GITHUB_REPO, GITHUB_WORKFLOW_FILE, GITHUB_PAT')
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`

  const body = {
    ref: 'master',
    inputs: {
      suite_name: inputs.suite_name,
      spec_file: inputs.spec_file ?? '',
      run_id: inputs.run_id,
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok && response.status !== 204) {
    const text = await response.text()
    throw new Error(`GitHub API error ${response.status}: ${text}`)
  }
}
