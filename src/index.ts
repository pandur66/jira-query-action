import * as fs from "fs"
import * as core from "@actions/core"
import * as jira from "./jira"
import * as utils from "./utils"

const run = async () => {
  const baseUrl = jira.normalizeBaseUrl(core.getInput("baseUrl", { required: true }))
  const userEmail = core.getInput("userEmail", { required: true })
  const apiToken = core.getInput("apiToken", { required: true })
  const jql = core.getInput("jql", { required: true })

  const idsOnly = utils.stringToBool(core.getInput("idsOnly"))
  const fieldsByKeys = utils.stringToBool(core.getInput("fieldsByKeys"))
  const failFast = utils.stringToBool(core.getInput("failFast"))

  const fields = idsOnly ? ["id"] : utils.csvToStringArray(core.getInput("fields"))
  const properties = utils.csvToStringArray(core.getInput("properties"))
  const expand = utils.csvToStringArray(core.getInput("expand"))
  const maxResults = utils.stringToNumber(core.getInput("maxResults"), 50)
  const reconcileIssues = utils.csvToNumberArray(core.getInput("reconcileIssues"))
  const outputFile = core.getInput("outputFile") || undefined
  const method = jira.toHttpMethod(core.getInput("method"), "auto")

  try {
    core.setSecret(apiToken)
    core.setSecret(userEmail)
  } catch {
    /* ignore if masking fails */
  }

  if (idsOnly) {
    core.debug('IDs-only mode enabled; overriding fields to "id"')
  }

  const client = jira.createClient(userEmail, apiToken)

  const issues = await jira.searchJql(baseUrl, client, method, {
    jql,
    maxResults,
    fields,
    expand,
    properties,
    fieldsByKeys,
    failFast,
    reconcileIssues,
  })

  core.setOutput("issuesCount", issues.length.toString())

  if (issues.length === 0) {
    core.info("No issues found; exiting early")
    return
  }

  const issueIds = issues.map((issue) => issue.id)
  const issueIdsAsString = issueIds.join(", ")
  core.info(`Retrieved ${issues.length} issues from Jira`)
  core.setOutput("issuesId", issueIdsAsString)

  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(idsOnly ? issueIds : issues, null, 2), "utf-8")
    core.info(`Saved issues to file: ${outputFile}`)
    core.setOutput("issuesFile", outputFile)
  }
}

try {
  run()
} catch (error: any) {
  core.setFailed(error.message)
}
