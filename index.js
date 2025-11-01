import core from "@actions/core";
import { HttpClient } from "@actions/http-client";
import { writeFileSync } from "fs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetries(http, url, headers = {}, retries = 3) {
  let attempt = 0;
  while (true) {
    const res = await http.get(url, headers);
    const body = await res.readBody();

    const status = res.message.statusCode;
    // Retry on 429 (rate limit) with exponential backoff
    if (status === 429 && attempt < retries) {
      const wait = Math.pow(2, attempt) * 1000;
      core.debug(`Received 429, retrying after ${wait}ms (attempt ${attempt + 1})`);
      await sleep(wait);
      attempt++;
      continue;
    }

    return { res, body };
  }
}

async function run() {
  try {
    const jiraBaseUrl = core.getInput("jira_base_url", { required: true });
    const jiraUserEmail = core.getInput("jira_user_email", { required: true });
    const jiraApiToken = core.getInput("jira_api_token", { required: true });
    const jql = core.getInput("jql", { required: true });
    const fields = core.getInput("fields") || "";
    const maxResultsRaw = core.getInput("max_results") || "1000";
    const outputFile = core.getInput("output_file");

    // Mask sensitive values in logs
    try { core.setSecret(jiraApiToken); } catch (e) { /* ignore if masking fails */ }

    const maxResults = Number.parseInt(maxResultsRaw, 10);
    if (Number.isNaN(maxResults) || maxResults <= 0) {
      core.warning(`Invalid max_results (${maxResultsRaw}), using 1000`);
    }
    const effectiveMax = Number.isNaN(maxResults) || maxResults <= 0 ? 1000 : maxResults;

    if (!jiraBaseUrl || !jql) {
      core.setFailed("Required inputs 'jira_base_url' and 'jql' must be provided");
      return;
    }

    const auth = Buffer.from(`${jiraUserEmail}:${jiraApiToken}`).toString("base64");
    const http = new HttpClient("jira-query-action");

    const issues = [];
    let startAt = 0;
    const maxPerPage = 100;

    core.info(`Executing JQL`);
    core.debug(`JQL: ${jql}`);
    if (fields) core.debug(`Selected fields: ${fields}`);

    core.startGroup("Fetching issues");
    while (issues.length < effectiveMax) {
      const url = new URL(`${jiraBaseUrl.replace(/\/+$/, '')}/rest/api/3/search/jql`);
      url.searchParams.append("jql", jql);
      url.searchParams.append("startAt", String(startAt));
      url.searchParams.append("maxResults", String(maxPerPage));
      if (fields) url.searchParams.append("fields", fields);

      core.debug(`Request URL: ${url.toString()}`);

      const headers = {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      };

      const { res, body } = await fetchWithRetries(http, url.toString(), headers, 3);
      const status = res.message.statusCode;

      if (status < 200 || status >= 300) {
        // try to extract a friendly message from the body
        let errMsg = body;
        try {
          const jb = JSON.parse(body);
          if (jb.errorMessages) errMsg = jb.errorMessages.join('; ');
          else if (jb.message) errMsg = jb.message;
        } catch (e) {
          /* ignore parse errors */
        }
        core.endGroup();
        throw new Error(`Error querying Jira: ${status} - ${errMsg}`);
      }

      const data = JSON.parse(body);
      if (!data.issues || data.issues.length === 0) {
        core.debug("No more issues returned by Jira");
        break;
      }

      issues.push(...data.issues);
      startAt += data.issues.length;

      core.debug(`Received ${issues.length} issues so far (fetched ${data.issues.length} in this page)`);

      if (data.issues.length < maxPerPage) break;
    }
    core.endGroup();

    const sliced = issues.slice(0, effectiveMax);

    if (outputFile) {
      writeFileSync(outputFile, JSON.stringify(sliced, null, 2), "utf8");
      core.info(`Results written to: ${outputFile}`);
      core.setOutput("issues_file", outputFile);
    }

    core.setOutput("issues_count", String(sliced.length));

    // Only set the full JSON as output when reasonably small to avoid hitting output size limits
    if (sliced.length <= 1000) {
      core.setOutput("issues", JSON.stringify(sliced, null, 2));
    } else {
      core.setOutput("issues", "<TRUNCATED - use output_file for full results>");
      core.info("Full result truncated in 'issues' output; use 'issues_file' or the output file to access full data.");
    }

    core.info(`Total issues returned: ${sliced.length}`);
  } catch (error) {
    core.setFailed(error.message || String(error));
  }
}

run();
