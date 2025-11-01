# Jira Query Action

This GitHub Action executes JQL queries against Jira Cloud, collects results with pagination, and optionally exports them as JSON.

Repository: https://github.com/pandur66/jira-query-action

## Highlights

- Runs a JQL query using the Jira Cloud REST API (/rest/api/3/search/jql)
- Collects results using pagination and truncates to the configured `max_results`
- Writes results to an output file (recommended) and provides summary outputs
- Masks secrets and supports retries for rate-limited responses

## Inputs

| Input | Required | Description |
|---|---:|---|
| `jira_base_url` | yes | Jira base URL (e.g. `https://company.atlassian.net`) |
| `jira_user_email` | yes | Jira user email (used for basic auth) |
| `jira_api_token` | yes | Jira API token (used for basic auth) |
| `jql` | yes | The JQL query to execute |
| `fields` | no | Comma-separated list of fields to return (e.g. `key,summary,status`) |
| `max_results` | no | Maximum number of issues to return (default: `1000`) |
| `output_file` | no | Optional path to write the JSON result (e.g. `./jira-results.json`) |

## Outputs

| Output | Description |
|---|---|
| `issues` | JSON string containing the list of returned issues (only set when <= 1000 items; otherwise truncated message) |
| `issues_count` | Number of issues returned |
| `issues_file` | Path to the JSON file with full results (if `output_file` was provided) |

## Example usage (published action)

Use the published release tag (example):

```yaml
jobs:
  query-jira:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Jira JQL query
        id: jira_query
        uses: pandur66/jira-query-action@v1
        with:
          jira_base_url: https://company.atlassian.net
          jira_user_email: ${{ secrets.JIRA_USER_EMAIL }}
          jira_api_token: ${{ secrets.JIRA_API_TOKEN }}
          jql: 'project = ABC AND status = "In Progress" ORDER BY created DESC'
          fields: key,summary,assignee,status
          max_results: 200
          output_file: jira-results.json

      - name: Upload Jira results
        uses: actions/upload-artifact@v4
        with:
          name: jira-query-results
          path: jira-results.json

      - name: Show results summary
        run: |
          echo "Issues count: ${{ steps.jira_query.outputs.issues_count }}"
          if [ -n "${{ steps.jira_query.outputs.issues_file }}" ]; then
            echo "Full results saved in: ${{ steps.jira_query.outputs.issues_file }}"
          fi
```

Notes:

- Prefer using `output_file` and uploading the file as an artifact for large result sets. The `issues` output contains the JSON string only when the number of issues is reasonably small (<= 1000) to avoid hitting GitHub output limits.
- Keep your Jira credentials in repository secrets (e.g., `secrets.JIRA_USER_EMAIL`, `secrets.JIRA_API_TOKEN`). The action masks the API token when possible.

## Troubleshooting

- Authentication errors: verify `jira_user_email` and `jira_api_token` are valid and have API access.
- Rate limiting: the action retries on 429 responses with exponential backoff; if you still see failures, reduce query frequency or increase retry logic.
- Fewer issues than expected: validate your JQL and `max_results` value.

## Implementation notes

- This action runs on `node20` and uses the Jira REST API `/rest/api/3/search/jql`.
- Results are retrieved page-by-page (`startAt` / `maxResults`) and then truncated to `max_results`.

## License & Author

Author: Bruno Ferreira

License: MIT
