# Jira Query Action

This GitHub Action executes JQL queries against Jira Cloud, retrieves issues with pagination support, and optionally exports results as JSON. Supports flexible HTTP methods (GET/POST/auto), custom fields, field properties, and advanced search options.

Repository: https://github.com/pandur66/jira-query-action

## Highlights

- Executes JQL queries using the Jira Cloud REST API (`/rest/api/3/search/jql`)
- Supports both GET and POST HTTP methods (with automatic selection based on query size)
- Implements pagination with `nextPageToken` for large result sets
- Flexible field selection with support for `expand`, `properties`, and `fieldsByKeys` options
- IDs-only mode for retrieving only issue IDs instead of full objects
- Writes results to output file (recommended) and provides summary outputs
- Masks secrets (email and API token) for security

## Inputs

| Input             | Required | Description                                                                               |
| ----------------- | -------- | ----------------------------------------------------------------------------------------- |
| `baseUrl`         | ✓        | Jira base URL (e.g., `https://company.atlassian.net`)                                     |
| `userEmail`       | ✓        | Jira user email (used for basic auth)                                                     |
| `apiToken`        | ✓        | Jira API token (used for basic auth)                                                      |
| `jql`             | ✓        | The JQL query to execute                                                                  |
| `method`          |          | HTTP method to use: `get`, `post`, or `auto` (default: `auto`)                            |
| `maxResults`      |          | Maximum results per page; default is 50                                                   |
| `fields`          |          | Comma-separated list of fields (e.g., `key,summary,status`). Ignored if `idsOnly` is true |
| `expand`          |          | Comma-separated list of expand parameters (e.g., `names,schema`)                          |
| `properties`      |          | Comma-separated list of issue properties (max 5)                                          |
| `fieldsByKeys`    |          | Reference fields by their key instead of ID; default is false                             |
| `failFast`        |          | Fail early if field data cannot be retrieved; default is false                            |
| `reconcileIssues` |          | Comma-separated list of issue IDs to reconcile with search results (max 50)               |
| `idsOnly`         |          | Return only issue IDs instead of full objects; default is false                           |
| `outputFile`      |          | Optional path to save the JSON result (e.g., `./jira-results.json`)                       |

## Outputs

| Output        | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `issuesCount` | Number of issues returned                                          |
| `issuesIds`   | Comma-separated list of issue IDs returned                         |
| `issuesFile`  | Path to JSON file with full results (if `outputFile` was provided) |

## Example usage

```yaml
jobs:
  query-jira:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Query Jira for open issues
        id: jira
        uses: pandur66/jira-query-action@main
        with:
          baseUrl: https://company.atlassian.net
          userEmail: ${{ secrets.JIRA_USER_EMAIL }}
          apiToken: ${{ secrets.JIRA_API_TOKEN }}
          jql: 'project = ABC AND status = "In Progress" ORDER BY created DESC'
          fields: key,summary,assignee,status
          maxResults: 100
          outputFile: jira-results.json

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: jira-query-results
          path: jira-results.json

      - name: Show summary
        run: |
          echo "Found ${{ steps.jira.outputs.issuesCount }} issues"
          echo "IDs: ${{ steps.jira.outputs.issuesIds }}"
```

### Example: IDs-only mode

```yaml
- name: Get issue IDs only
  id: jira
  uses: pandur66/jira-query-action@main
  with:
    baseUrl: https://company.atlassian.net
    userEmail: ${{ secrets.JIRA_USER_EMAIL }}
    apiToken: ${{ secrets.JIRA_API_TOKEN }}
    jql: "assignee = currentUser()"
    idsOnly: true
    outputFile: issue-ids.json
```

## HTTP Method Selection

The `method` input controls how the JQL query is sent:

- **`get`**: Always use GET (may fail for very long queries)
- **`post`**: Always use POST (larger payloads supported)
- **`auto`** (default): Automatically select POST if URL exceeds ~1500 characters

## Pagination

Results are retrieved page-by-page using Jira's `nextPageToken` mechanism. The action automatically handles pagination and collects all issues until the query returns no more results.

## Notes

- Credentials should be stored in GitHub repository secrets (e.g., `secrets.JIRA_USER_EMAIL`, `secrets.JIRA_API_TOKEN`)
- The action masks secrets to prevent accidental exposure in logs
- For large result sets, use `outputFile` and upload as an artifact to avoid GitHub output size limits
- Use `idsOnly: true` if you only need issue IDs; this overrides the `fields` input

## Local Testing

To test the action locally during development:

### 1. Set up your environment

Copy and update `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your Jira credentials:

```dotenv
INPUT_BASEURL=https://your-company.atlassian.net
INPUT_USEREMAIL=your-email@example.com
INPUT_APITOKEN=your-jira-api-token
INPUT_JQL=project = ABC AND status = "In Progress"
INPUT_FIELDS=key,summary,status
INPUT_MAXRESULTS=50
INPUT_OUTPUTFILE=./jira-results.json
```

> **Note**: The `INPUT_` prefix is required because the action reads environment variables in this format during local testing. All variable names must be in UPPERCASE.

### 2. Build the action

```bash
npm run build
```

This compiles TypeScript and bundles the code into `dist/index.js`.

### 3. Run the action locally

```bash
node -r dotenv/config ./dist/index.js
```

The `-r dotenv/config` flag loads environment variables from `.env` before executing the script.

### 4. View results

- Check console output for the number of issues found and their IDs
- If you specified `outputFile`, open the generated JSON file to see full issue details

### Example workflow

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your Jira credentials
nano .env

# Build the action
npm run build

# Run the action
node -r dotenv/config ./dist/index.js

# Check results
cat jira-results.json
```

### Troubleshooting local testing

- **"Cannot find module dotenv"**: Run `npm install` first to install dependencies
- **ReferenceError about variables**: Verify all required environment variables are set in `.env`
- **Authentication failed**: Double-check `INPUT_userEmail` and `INPUT_apiToken` are correct

## Testing

This project includes a comprehensive test suite using Vitest.

### Run tests

```bash
# Run tests once (CI mode)
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test structure

- `tests/utils.test.ts` - Utility function tests (string conversion, parsing, boolean conversion)
- `tests/jira.test.ts` - Jira client and API integration tests (HTTP methods, pagination, error handling)

### Test coverage

- **43 total tests** covering:
  - URL normalization
  - HTTP method selection and validation
  - HttpClient creation with authentication
  - GET and POST request handling
  - Pagination with `nextPageToken`
  - Error handling and edge cases
  - Parameter validation and conversion

### Development workflow

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Build in watch mode (auto-rebuild on changes)
npm run dev

# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format

# Check if code is formatted correctly
npm run format:check

# Check TypeScript types
npm run type-check

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Troubleshooting

- **Authentication errors**: Verify that `userEmail` and `apiToken` are valid and have API access to your Jira instance
- **Query too long**: If you get errors with very long JQL queries, try setting `method: post`
- **Fewer issues than expected**: Verify your JQL query is correct and check `maxResults` value
- **API rate limiting**: Jira Cloud has rate limits; if you hit them, reduce the frequency of queries or increase `maxResults` to retrieve more in fewer requests

## Implementation notes

- This action runs on `node20` and uses the Jira REST API `/rest/api/3/search/jql`
- Written in TypeScript and bundled with esbuild
- Fully supports ESM (ECMAScript modules)

## License & Author

Author: Bruno Ferreira

License: MIT
