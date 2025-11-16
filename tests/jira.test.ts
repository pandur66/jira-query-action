import { describe, it, expect, vi, beforeEach } from "vitest"
import { createClient, normalizeBaseUrl, toHttpMethod, searchJql } from "../src/jira"

// Mock @actions/core to avoid console spam
vi.mock("@actions/core", () => ({
  debug: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  setSecret: vi.fn(),
  getInput: vi.fn(),
  setOutput: vi.fn(),
  setFailed: vi.fn(),
}))

describe("Jira - URL and Configuration", () => {
  describe("normalizeBaseUrl", () => {
    it("should remove trailing slashes", () => {
      expect(normalizeBaseUrl("https://company.atlassian.net/")).toBe(
        "https://company.atlassian.net"
      )
    })

    it("should remove multiple trailing slashes", () => {
      expect(normalizeBaseUrl("https://company.atlassian.net///")).toBe(
        "https://company.atlassian.net"
      )
    })

    it("should return URL unchanged if no trailing slashes", () => {
      expect(normalizeBaseUrl("https://company.atlassian.net")).toBe(
        "https://company.atlassian.net"
      )
    })

    it("should handle URLs with paths", () => {
      expect(normalizeBaseUrl("https://company.atlassian.net/path/")).toBe(
        "https://company.atlassian.net/path"
      )
    })
  })

  describe("toHttpMethod", () => {
    it("should return 'get' when input is 'get'", () => {
      expect(toHttpMethod("get")).toBe("get")
    })

    it("should return 'post' when input is 'post'", () => {
      expect(toHttpMethod("post")).toBe("post")
    })

    it("should return 'auto' when input is 'auto'", () => {
      expect(toHttpMethod("auto")).toBe("auto")
    })

    it("should be case-insensitive", () => {
      expect(toHttpMethod("GET")).toBe("get")
      expect(toHttpMethod("POST")).toBe("post")
      expect(toHttpMethod("AUTO")).toBe("auto")
    })

    it("should return default method when input is undefined", () => {
      expect(toHttpMethod(undefined, "post")).toBe("post")
      expect(toHttpMethod(undefined, "auto")).toBe("auto")
    })

    it("should return 'auto' as default when no default provided", () => {
      expect(toHttpMethod(undefined)).toBe("auto")
    })

    it("should throw error for invalid method", () => {
      expect(() => toHttpMethod("invalid")).toThrow("Invalid HTTP method: invalid")
      expect(() => toHttpMethod("put")).toThrow("Invalid HTTP method: put")
    })
  })
})

describe("Jira - Client Creation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should create HttpClient with correct parameters", () => {
    const userEmail = "test@example.com"
    const apiToken = "test-token-123"

    const client = createClient(userEmail, apiToken)

    expect(client).toBeDefined()
    expect(typeof client.get).toBe("function")
    expect(typeof client.post).toBe("function")
  })
})

describe("Jira - Search Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should handle GET request successfully", async () => {
    const mockHttpClient = {
      get: vi.fn().mockResolvedValue({
        message: { statusCode: 200 },
        readBody: vi.fn().mockResolvedValue(
          JSON.stringify({
            issues: [{ id: "PROJ-1", key: "PROJ-1", fields: { summary: "Test issue" } }],
            total: 1,
          })
        ),
      }),
      post: vi.fn(),
    }

    const result = await searchJql("https://company.atlassian.net", mockHttpClient as any, "get", {
      jql: "project = TEST",
      maxResults: 50,
    })

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("PROJ-1")
  })

  it("should handle POST request successfully", async () => {
    const mockHttpClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        message: { statusCode: 200 },
        readBody: vi.fn().mockResolvedValue(
          JSON.stringify({
            issues: [{ id: "PROJ-1" }],
            total: 1,
          })
        ),
      }),
    }

    const result = await searchJql("https://company.atlassian.net", mockHttpClient as any, "post", {
      jql: "project = TEST",
      maxResults: 50,
    })

    expect(result).toHaveLength(1)
  })

  it("should handle pagination with nextPageToken", async () => {
    const mockHttpClient = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          message: { statusCode: 200 },
          readBody: vi.fn().mockResolvedValue(
            JSON.stringify({
              issues: [{ id: "PROJ-1" }, { id: "PROJ-2" }],
              nextPageToken: "token-123",
            })
          ),
        })
        .mockResolvedValueOnce({
          message: { statusCode: 200 },
          readBody: vi.fn().mockResolvedValue(
            JSON.stringify({
              issues: [{ id: "PROJ-3" }],
            })
          ),
        }),
      post: vi.fn(),
    }

    const result = await searchJql("https://company.atlassian.net", mockHttpClient as any, "get", {
      jql: "project = TEST",
    })

    expect(result).toHaveLength(3)
    expect(mockHttpClient.get).toHaveBeenCalledTimes(2)
  })

  it("should throw error on HTTP error", async () => {
    const mockHttpClient = {
      get: vi.fn().mockResolvedValue({
        message: { statusCode: 401 },
        readBody: vi.fn().mockResolvedValue("Unauthorized"),
      }),
      post: vi.fn(),
    }

    await expect(
      searchJql("https://company.atlassian.net", mockHttpClient as any, "get", {
        jql: "project = TEST",
      })
    ).rejects.toThrow(/Jira API request failed/)
  })

  it("should handle empty results", async () => {
    const mockHttpClient = {
      get: vi.fn().mockResolvedValue({
        message: { statusCode: 200 },
        readBody: vi.fn().mockResolvedValue(JSON.stringify({ issues: [] })),
      }),
      post: vi.fn(),
    }

    const result = await searchJql("https://company.atlassian.net", mockHttpClient as any, "get", {
      jql: "project = NOTEXIST",
    })

    expect(result).toHaveLength(0)
  })
})
