import { z } from "zod";

import { CreateBlogInput, UpdateBlogInput } from "./blog";
import { SCOPES, SCOPE_DESCRIPTIONS } from "./scopes";
import {
  InstructionsPutInput,
  PatchRunInput,
  QuestionPatchInput,
  StandaloneQuestionInput,
  StartRunInput,
  TopicInput,
  TopicPatchInput,
  TopicsCreateInput,
} from "@/lib/content-agent/schemas";
import { AgentSettings } from "@/lib/content-agent/settings";

/**
 * OpenAPI 3.1 document for /api/admin/*. Request schemas are generated from
 * the same zod objects the routes validate with, so the two can't drift.
 * Served at GET /api/admin/openapi.json.
 */
export function buildOpenApi(baseUrl: string): Record<string, unknown> {
  const schema = (s: z.ZodType) => z.toJSONSchema(s, { io: "input", unrepresentable: "any" });
  const bearer = [{ bearerAuth: [] }];
  const jsonBody = (name: string) => ({
    required: true,
    content: { "application/json": { schema: { $ref: `#/components/schemas/${name}` } } },
  });
  const ok = (description: string) => ({ description, content: { "application/json": { schema: { type: "object" } } } });
  const errors = {
    "400": { description: "Bad request" },
    "401": { description: "Unauthorized" },
    "403": { description: "Missing scope / policy denied", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    "409": { description: "Conflict" },
    "422": { description: "Validation failed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    "429": { description: "Rate limited (see Retry-After)" },
  };
  const idem = {
    name: "Idempotency-Key",
    in: "header",
    required: false,
    schema: { type: "string", maxLength: 128 },
    description: "Replay-safe key (≤128 chars). Same key + same body returns the stored response with Idempotency-Replayed: true.",
  };
  const idParam = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
  const q = (name: string, type: string, description?: string) => ({ name, in: "query", required: false, schema: { type }, description });

  return {
    openapi: "3.1.0",
    info: {
      title: "MMG Law Firm — Admin API",
      version: "2.0.0",
      description:
        "Machine-to-machine API for blog content, media and the content agent. Bearer auth with scoped API keys. All posts created here default to drafts awaiting attorney review (CRPC 7.1).",
    },
    servers: [{ url: baseUrl }],
    security: bearer,
    tags: [
      { name: "blog" }, { name: "images" }, { name: "taxonomy" }, { name: "agent" },
    ],
    paths: {
      "/api/admin/blog": {
        get: { tags: ["blog"], summary: "List posts", "x-scope": "blog:read", parameters: [q("status", "string", "all|published|draft|needs_review|approved|rejected"), q("limit", "integer"), q("offset", "integer")], responses: { "200": ok("{ posts, count, limit, offset }"), ...errors } },
        post: { tags: ["blog"], summary: "Create a post (draft, needs_review by default)", "x-scope": "blog:write (+ blog:publish to publish)", parameters: [idem], requestBody: jsonBody("CreateBlog"), responses: { "201": ok("{ post, public_url, review_status }"), ...errors } },
      },
      "/api/admin/blog/{id}": {
        get: { tags: ["blog"], summary: "Read a post", "x-scope": "blog:read", parameters: [idParam], responses: { "200": ok("{ post }"), "404": { description: "Not found" }, ...errors } },
        patch: { tags: ["blog"], summary: "Update a post", "x-scope": "blog:write", parameters: [idParam], requestBody: jsonBody("UpdateBlog"), responses: { "200": ok("{ post, public_url }"), ...errors } },
        delete: { tags: ["blog"], summary: "Delete an unpublished post", "x-scope": "blog:write", parameters: [idParam], responses: { "200": ok("{ deleted, id }"), ...errors, "409": { description: "Post is published; unpublish first" } } },
      },
      "/api/admin/images": {
        get: { tags: ["images"], summary: "List media", "x-scope": "images:read", parameters: [q("limit", "integer"), q("offset", "integer")], responses: { "200": ok("{ images, limit, offset }"), ...errors } },
        post: { tags: ["images"], summary: "Upload (multipart file, JSON {url} or JSON {data base64})", "x-scope": "images:write", responses: { "201": ok("{ image: { url, name } }"), "413": { description: "Too large" }, "415": { description: "Unsupported type" }, ...errors } },
      },
      "/api/admin/images/{name}": {
        get: { tags: ["images"], summary: "Read one object", "x-scope": "images:read", parameters: [{ name: "name", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("{ image }"), "404": { description: "Not found" } } },
        delete: { tags: ["images"], summary: "Delete one object", "x-scope": "images:write", parameters: [{ name: "name", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok("{ deleted, name }") } },
      },
      "/api/admin/taxonomy": {
        get: { tags: ["taxonomy"], summary: "Practice areas + counties (id, slug, name)", "x-scope": "blog:read", responses: { "200": ok("{ practice_areas, counties }") } },
      },
      "/api/admin/agent/brief": {
        get: { tags: ["agent"], summary: "Read-only brief (no run, no claim)", "x-scope": "agent:read", parameters: [q("urls_limit", "integer"), q("history_limit", "integer"), q("include", "string", "csv of site_urls,history,seo_issues,answers")], responses: { "200": ok("{ brief }") } },
      },
      "/api/admin/agent/runs": {
        get: { tags: ["agent"], summary: "List runs", "x-scope": "agent:read", parameters: [q("status", "string"), q("limit", "integer"), q("offset", "integer")], responses: { "200": ok("{ runs, count }") } },
        post: { tags: ["agent"], summary: "Start a run: sweep stale runs, claim topics, deliver answers, return the brief", "x-scope": "agent:write", parameters: [idem], requestBody: jsonBody("StartRun"), responses: { "201": ok("{ run, brief }"), ...errors } },
      },
      "/api/admin/agent/runs/{id}": {
        get: { tags: ["agent"], summary: "Read a run + its questions", "x-scope": "agent:read", parameters: [idParam], responses: { "200": ok("{ run, questions }") } },
        patch: { tags: ["agent"], summary: "Heartbeat / progress, or finish with a report", "x-scope": "agent:write", parameters: [idParam], requestBody: jsonBody("PatchRun"), responses: { "200": ok("{ run, questions_created, topics_requeued }"), ...errors, "409": { description: "Run already finished" } } },
      },
      "/api/admin/agent/topics": {
        get: { tags: ["agent"], summary: "List topics", "x-scope": "agent:read", parameters: [q("status", "string"), q("q", "string"), q("limit", "integer"), q("offset", "integer")], responses: { "200": ok("{ topics, count }") } },
        post: { tags: ["agent"], summary: "Add topics (single object or { topics: [...], upsert })", "x-scope": "agent:write", parameters: [idem], requestBody: jsonBody("TopicsCreate"), responses: { "201": ok("{ topics, skipped }"), ...errors } },
      },
      "/api/admin/agent/topics/{id}": {
        get: { tags: ["agent"], summary: "Read a topic", "x-scope": "agent:read", parameters: [idParam], responses: { "200": ok("{ topic }") } },
        patch: { tags: ["agent"], summary: "Edit a topic / set status", "x-scope": "agent:write (agent:admin for rejected/published/drafted/claimed)", parameters: [idParam], requestBody: jsonBody("TopicPatch"), responses: { "200": ok("{ topic }"), ...errors } },
      },
      "/api/admin/agent/instructions": {
        get: { tags: ["agent"], summary: "Active instructions (or ?version=N)", "x-scope": "agent:read", parameters: [q("version", "integer")], responses: { "200": ok("{ instructions }") } },
        put: { tags: ["agent"], summary: "Publish a new instructions version", "x-scope": "agent:admin", requestBody: jsonBody("InstructionsPut"), responses: { "201": ok("{ instructions }"), ...errors } },
      },
      "/api/admin/agent/questions": {
        get: { tags: ["agent"], summary: "List questions", "x-scope": "agent:read", parameters: [q("status", "string"), q("undelivered", "string", "1 = answered but not yet delivered to a run"), q("limit", "integer"), q("offset", "integer")], responses: { "200": ok("{ questions, count }") } },
        post: { tags: ["agent"], summary: "Ask a question outside the run PATCH", "x-scope": "agent:write", requestBody: jsonBody("StandaloneQuestion"), responses: { "201": ok("{ question }"), ...errors } },
      },
      "/api/admin/agent/questions/{id}": {
        patch: { tags: ["agent"], summary: "Answer or dismiss a question", "x-scope": "agent:admin", parameters: [idParam], requestBody: jsonBody("QuestionPatch"), responses: { "200": ok("{ question }"), ...errors } },
      },
      "/api/admin/agent/site-urls": {
        get: { tags: ["agent"], summary: "Internal-link inventory", "x-scope": "agent:read", parameters: [q("limit", "integer"), q("offset", "integer")], responses: { "200": ok("{ site_urls }") } },
      },
      "/api/admin/agent/history": {
        get: { tags: ["agent"], summary: "Post history + keyword coverage", "x-scope": "agent:read", parameters: [q("limit", "integer"), q("offset", "integer"), q("since", "string"), q("status", "string")], responses: { "200": ok("{ posts, keyword_coverage, count }") } },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: `Authorization: Bearer mmg_<prefix>_<secret> (scoped key from /admin/settings/api-keys) or the legacy ADMIN_API_KEY. Scopes: ${SCOPES.map((s) => `${s} — ${SCOPE_DESCRIPTIONS[s]}`).join("; ")}`,
        },
      },
      schemas: {
        Error: { type: "object", properties: { error: { type: "string" }, issues: { type: "object" }, required: { type: "array", items: { type: "string" } } }, required: ["error"] },
        CreateBlog: schema(CreateBlogInput),
        UpdateBlog: schema(UpdateBlogInput),
        StartRun: schema(StartRunInput),
        PatchRun: schema(PatchRunInput),
        Topic: schema(TopicInput),
        TopicsCreate: schema(TopicsCreateInput),
        TopicPatch: schema(TopicPatchInput),
        InstructionsPut: schema(InstructionsPutInput),
        AgentSettings: schema(AgentSettings),
        StandaloneQuestion: schema(StandaloneQuestionInput),
        QuestionPatch: schema(QuestionPatchInput),
      },
    },
  };
}
