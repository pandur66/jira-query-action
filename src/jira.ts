import * as core from "@actions/core"
import * as utils from "./utils"
import { HttpClient, HttpClientResponse } from "@actions/http-client"

const USER_AGENT = "jira-query-action"
const SEARCH_API_PATH = "/rest/api/3/search/jql"
const GET_METHOD_URL_MAX_SIZE = 1500

interface JiraSearchRequestOptions {
  jql: string
  nextPageToken?: string
  maxResults?: number
  fields?: string[]
  expand?: string[]
  properties?: string[]
  fieldsByKeys?: boolean
  failFast?: boolean
  reconcileIssues?: number[]
}

interface JiraPostSearchRequest {
  url: string
  jsonBody: string
}

export type HttpMethod = "get" | "post" | "auto"

export const searchJql = async (
  baseUrl: string,
  http: HttpClient,
  method: HttpMethod,
  opts: JiraSearchRequestOptions
): Promise<any[]> => {
  const issues = []
  let nextPageToken: string | undefined = undefined

  if (method === "auto") {
    method = decideHttpMethodToUse(baseUrl, opts, method)
    core.debug(`Auto-selected HTTP method: ${method}`)
  }

  core.debug(`Starting Jira JQL search with method: ${method}`)

  do {
    let res: HttpClientResponse
    opts.nextPageToken = nextPageToken

    if (method === "get") {
      const url = createSearchGetRequest(baseUrl, opts)
      core.debug(`GET request URL: ${url}`)
      if (url.length > GET_METHOD_URL_MAX_SIZE) {
        core.warning(
          `GET request URL length (${url.length}) exceeds maximum recommended size (${GET_METHOD_URL_MAX_SIZE}). Consider using POST method for large queries.`
        )
      }
      res = await http.get(url)
    } else if (method === "post") {
      const postRequest = createSearchPostRequest(baseUrl, opts)
      core.debug(`POST request URL: ${postRequest.url}`)
      core.debug(`POST request Body: ${postRequest.jsonBody}`)
      res = await http.post(postRequest.url, postRequest.jsonBody)
    } else {
      throw new Error(`Unsupported HTTP method: ${method}`)
    }

    if (res.message.statusCode && res.message.statusCode >= 400) {
      const errorBody = await res.readBody()
      throw new Error(`Jira API request failed with status ${res.message.statusCode}: ${errorBody}`)
    }

    const body = await res.readBody()
    const data = JSON.parse(body)

    core.debug(`Fetched ${data.issues.length} issues from Jira`)

    issues.push(...data.issues)
    nextPageToken = data.nextPageToken
  } while (nextPageToken)

  return issues
}

export const createClient = (userEmail: string, apiToken: string): HttpClient => {
  const auth = Buffer.from(`${userEmail}:${apiToken}`).toString("base64")
  const http = new HttpClient(USER_AGENT, [], {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })
  return http
}

export const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.replace(/\/+$/, "")
}

const createSearchGetRequest = (baseUrl: string, opts: JiraSearchRequestOptions): string => {
  const {
    jql,
    nextPageToken,
    maxResults,
    fields,
    expand,
    properties,
    fieldsByKeys,
    failFast,
    reconcileIssues,
  } = opts

  const url = new URL(`${baseUrl}${SEARCH_API_PATH}`)
  url.searchParams.append("jql", jql)

  if (nextPageToken) url.searchParams.append("nextPageToken", nextPageToken)
  if (maxResults) url.searchParams.append("maxResults", String(maxResults))
  if (fields) url.searchParams.append("fields", fields.join(","))
  if (expand) url.searchParams.append("expand", expand.join(","))
  if (properties) url.searchParams.append("properties", properties.join(","))
  if (fieldsByKeys) url.searchParams.append("fieldsByKeys", String(fieldsByKeys))
  if (failFast) url.searchParams.append("failFast", String(failFast))
  if (reconcileIssues && reconcileIssues.length > 0)
    url.searchParams.append("reconcileIssues", reconcileIssues.join(","))

  return url.toString()
}

const createSearchPostRequest = (
  baseUrl: string,
  opts: JiraSearchRequestOptions
): JiraPostSearchRequest => {
  const url = new URL(`${baseUrl}${SEARCH_API_PATH}`)
  const {
    jql,
    nextPageToken,
    maxResults,
    fields,
    expand,
    properties,
    fieldsByKeys,
    reconcileIssues,
  } = opts

  const body: any = {
    jql,
  }

  if (nextPageToken) body.nextPageToken = nextPageToken
  if (maxResults) body.maxResults = maxResults
  if (fields) body.fields = fields
  if (expand) body.expand = utils.stringArrayToCsv(expand)
  if (properties) body.properties = properties
  if (fieldsByKeys) body.fieldsByKeys = fieldsByKeys
  if (reconcileIssues && reconcileIssues.length > 0) body.reconcileIssues = reconcileIssues

  return {
    url: url.toString(),
    jsonBody: JSON.stringify(body),
  }
}

const decideHttpMethodToUse = (
  baseUrl: string,
  opts: JiraSearchRequestOptions,
  preferredMethod: HttpMethod
): "get" | "post" => {
  if (preferredMethod === "get" || preferredMethod === "post") {
    return preferredMethod
  }

  const testUrl = createSearchGetRequest(baseUrl, opts)
  if (testUrl.length > GET_METHOD_URL_MAX_SIZE) {
    return "post"
  }
  return "get"
}

export function toHttpMethod(value?: string, defaultMethod: HttpMethod = "auto"): HttpMethod {
  if (!value) return defaultMethod

  const lowered = value.toLowerCase()

  if (lowered === "get" || lowered === "post" || lowered === "auto") {
    return lowered
  }

  throw new Error(`Invalid HTTP method: ${value}`)
}
