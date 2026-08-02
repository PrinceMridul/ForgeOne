/**
 * Central mock data source for the ForgeOne frontend.
 * Realistic engineering data — no lorem ipsum.
 */

import type { LucideIcon } from "lucide-react";
import {
  Compass,
  Code2,
  Eye,
  FlaskConical,
  ShieldCheck,
  Server,
  ClipboardList,
} from "lucide-react";

export type AgentRole =
  | "Architect"
  | "Developer"
  | "Reviewer"
  | "Tester"
  | "Security"
  | "DevOps"
  | "Documentation"
  | "Project Manager";

export type AgentStatus = "thinking" | "working" | "idle" | "blocked" | "done";

export interface Agent {
  id: string;
  role: AgentRole;
  name: string;
  icon: LucideIcon;
  status: AgentStatus;
  progress: number;
  currentTask: string;
  tokensUsed: number;
  tokenBudget: number;
  duration: string;
  memoryMb: number;
  accent: string; // tailwind color token
  logs: { ts: string; level: "info" | "warn" | "error"; msg: string }[];
}

export const agents: Agent[] = [
  {
    id: "architect",
    role: "Architect",
    name: "Athena",
    icon: Compass,
    status: "thinking",
    progress: 62,
    currentTask: "Designing event-driven ingestion pipeline",
    tokensUsed: 48210,
    tokenBudget: 120000,
    duration: "02:14",
    memoryMb: 384,
    accent: "chart-1",
    logs: [
      { ts: "12:04:22", level: "info", msg: "Drafting C4 container diagram" },
      { ts: "12:04:31", level: "info", msg: "Evaluating Redpanda vs Kafka trade-offs" },
      { ts: "12:04:48", level: "info", msg: "Selected Redpanda + Materialize" },
    ],
  },
  {
    id: "developer",
    role: "Developer",
    name: "Kai",
    icon: Code2,
    status: "working",
    progress: 78,
    currentTask: "Implementing /api/v1/projects handler",
    tokensUsed: 91240,
    tokenBudget: 200000,
    duration: "05:41",
    memoryMb: 512,
    accent: "primary",
    logs: [
      { ts: "12:03:11", level: "info", msg: "Created src/routes/api/projects.ts" },
      { ts: "12:03:44", level: "info", msg: "Wired zod validation for POST body" },
      { ts: "12:04:12", level: "warn", msg: "Missing index on projects.owner_id" },
      { ts: "12:04:29", level: "info", msg: "Emitted migration 20260701_add_index.sql" },
    ],
  },
  {
    id: "reviewer",
    role: "Reviewer",
    name: "Isla",
    icon: Eye,
    status: "working",
    progress: 41,
    currentTask: "Reviewing PR #482 — retry backoff",
    tokensUsed: 22110,
    tokenBudget: 80000,
    duration: "01:32",
    memoryMb: 256,
    accent: "chart-4",
    logs: [
      { ts: "12:04:02", level: "info", msg: "Fetched diff (14 files, +512 −188)" },
      { ts: "12:04:17", level: "warn", msg: "Suggest extracting retry policy to util" },
    ],
  },
  {
    id: "tester",
    role: "Tester",
    name: "Rin",
    icon: FlaskConical,
    status: "working",
    progress: 55,
    currentTask: "Generating integration tests for auth flow",
    tokensUsed: 34870,
    tokenBudget: 100000,
    duration: "03:08",
    memoryMb: 320,
    accent: "chart-2",
    logs: [
      { ts: "12:03:50", level: "info", msg: "Spawned vitest worker pool (4)" },
      { ts: "12:04:11", level: "info", msg: "27 tests passed · 0 failed · 82% cov" },
    ],
  },
  {
    id: "security",
    role: "Security",
    name: "Nyx",
    icon: ShieldCheck,
    status: "idle",
    progress: 100,
    currentTask: "Awaiting new commits",
    tokensUsed: 12300,
    tokenBudget: 60000,
    duration: "00:47",
    memoryMb: 192,
    accent: "destructive",
    logs: [
      { ts: "12:02:41", level: "info", msg: "SAST scan complete — 0 critical" },
      { ts: "12:02:52", level: "info", msg: "Dependency audit clean" },
    ],
  },
  {
    id: "devops",
    role: "DevOps",
    name: "Orion",
    icon: Server,
    status: "working",
    progress: 33,
    currentTask: "Provisioning staging on Cloudflare Workers",
    tokensUsed: 18740,
    tokenBudget: 80000,
    duration: "01:19",
    memoryMb: 288,
    accent: "info",
    logs: [
      { ts: "12:04:03", level: "info", msg: "Terraform plan: 6 to add, 0 to destroy" },
      { ts: "12:04:24", level: "info", msg: "Applying wrangler.toml changes" },
    ],
  },
  {
    id: "pm",
    role: "Project Manager",
    name: "Vera",
    icon: ClipboardList,
    status: "thinking",
    progress: 20,
    currentTask: "Reprioritizing sprint backlog",
    tokensUsed: 8420,
    tokenBudget: 40000,
    duration: "00:52",
    memoryMb: 128,
    accent: "warning",
    logs: [
      { ts: "12:04:10", level: "info", msg: "Loaded 24 open issues from GitHub" },
      { ts: "12:04:27", level: "info", msg: "Grouped by epic · scoring impact/effort" },
    ],
  },
];

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  language: string;
  branch: string;
  status: "active" | "queued" | "paused" | "shipped";
  agents: number;
  tasksOpen: number;
  lastRun: string;
  progress: number;
  stars: number;
}

export const projects: Project[] = [
  {
    id: "prj_01",
    name: "Meridian API",
    slug: "meridian-api",
    description: "Multi-tenant billing engine with usage-based metering.",
    language: "TypeScript",
    branch: "main",
    status: "active",
    agents: 5,
    tasksOpen: 12,
    lastRun: "3m ago",
    progress: 68,
    stars: 412,
  },
  {
    id: "prj_02",
    name: "Halo Dashboard",
    slug: "halo-dashboard",
    description: "Realtime analytics for edge deployments.",
    language: "TypeScript",
    branch: "feat/streaming",
    status: "active",
    agents: 4,
    tasksOpen: 7,
    lastRun: "just now",
    progress: 42,
    stars: 231,
  },
  {
    id: "prj_03",
    name: "Nebula Auth",
    slug: "nebula-auth",
    description: "Passkey-first identity service with WebAuthn.",
    language: "Rust",
    branch: "main",
    status: "shipped",
    agents: 3,
    tasksOpen: 2,
    lastRun: "1h ago",
    progress: 100,
    stars: 1284,
  },
  {
    id: "prj_04",
    name: "Atlas Ingestion",
    slug: "atlas-ingestion",
    description: "Petabyte-scale event ingestion + CDC.",
    language: "Go",
    branch: "release/v2",
    status: "queued",
    agents: 0,
    tasksOpen: 18,
    lastRun: "12m ago",
    progress: 24,
    stars: 87,
  },
  {
    id: "prj_05",
    name: "Prism SDK",
    slug: "prism-sdk",
    description: "Type-safe client SDKs generated from OpenAPI.",
    language: "TypeScript",
    branch: "main",
    status: "paused",
    agents: 2,
    tasksOpen: 5,
    lastRun: "2h ago",
    progress: 81,
    stars: 512,
  },
  {
    id: "prj_06",
    name: "Vertex Search",
    slug: "vertex-search",
    description: "Hybrid vector + BM25 search over docs.",
    language: "Python",
    branch: "main",
    status: "active",
    agents: 6,
    tasksOpen: 9,
    lastRun: "just now",
    progress: 55,
    stars: 743,
  },
];

export interface ActivityEvent {
  id: string;
  ts: string;
  agent: string;
  type: "commit" | "test" | "deploy" | "review" | "issue" | "security" | "plan";
  title: string;
  detail?: string;
  status: "success" | "running" | "failed" | "warning" | "info";
}

export const activity: ActivityEvent[] = [
  {
    id: "e1",
    ts: "12:04:29",
    agent: "Kai · Developer",
    type: "commit",
    title: "feat(api): add cursor pagination to /projects",
    detail: "3 files changed · +142 −18",
    status: "success",
  },
  {
    id: "e2",
    ts: "12:04:11",
    agent: "Rin · Tester",
    type: "test",
    title: "vitest run · 274 passed",
    detail: "Coverage 82.4% (+1.2%)",
    status: "success",
  },
  {
    id: "e3",
    ts: "12:04:03",
    agent: "Orion · DevOps",
    type: "deploy",
    title: "Deploying to staging.forgeone.dev",
    detail: "Cloudflare Workers · v482",
    status: "running",
  },
  {
    id: "e4",
    ts: "12:03:52",
    agent: "Isla · Reviewer",
    type: "review",
    title: "Requested changes on PR #482",
    detail: "Extract retryPolicy() into shared util",
    status: "warning",
  },
  {
    id: "e5",
    ts: "12:03:41",
    agent: "Nyx · Security",
    type: "security",
    title: "SAST scan clean",
    detail: "0 critical · 2 low (accepted)",
    status: "success",
  },
  {
    id: "e6",
    ts: "12:03:22",
    agent: "Athena · Architect",
    type: "plan",
    title: "Approved RFC-014: event-driven ingestion",
    status: "info",
  },
  {
    id: "e7",
    ts: "12:02:58",
    agent: "Vera · PM",
    type: "issue",
    title: "Split epic AUTH-12 into 4 sub-tasks",
    status: "info",
  },
  {
    id: "e8",
    ts: "12:02:11",
    agent: "Kai · Developer",
    type: "commit",
    title: "refactor(db): normalize retry_attempts table",
    detail: "8 files changed · +312 −254",
    status: "success",
  },
  {
    id: "e9",
    ts: "12:01:47",
    agent: "Orion · DevOps",
    type: "deploy",
    title: "Rolled back canary — p99 latency +38%",
    status: "failed",
  },
];

export interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  language?: string;
}

export const repoTree: FileNode = {
  name: "meridian-api",
  type: "folder",
  children: [
    {
      name: "src",
      type: "folder",
      children: [
        {
          name: "routes",
          type: "folder",
          children: [
            { name: "index.ts", type: "file", language: "ts" },
            {
              name: "api",
              type: "folder",
              children: [
                { name: "projects.ts", type: "file", language: "ts" },
                { name: "billing.ts", type: "file", language: "ts" },
                { name: "webhooks.ts", type: "file", language: "ts" },
              ],
            },
          ],
        },
        {
          name: "lib",
          type: "folder",
          children: [
            { name: "db.ts", type: "file", language: "ts" },
            { name: "queue.ts", type: "file", language: "ts" },
            { name: "auth.ts", type: "file", language: "ts" },
          ],
        },
        { name: "server.ts", type: "file", language: "ts" },
      ],
    },
    {
      name: "migrations",
      type: "folder",
      children: [
        { name: "20260615_init.sql", type: "file", language: "sql" },
        { name: "20260701_add_index.sql", type: "file", language: "sql" },
      ],
    },
    { name: "package.json", type: "file", language: "json" },
    { name: "README.md", type: "file", language: "md" },
    { name: "wrangler.toml", type: "file", language: "toml" },
  ],
};

export const sampleCode = `// src/routes/api/projects.ts
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '@/lib/db'

const CreateProject = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  visibility: z.enum(['public', 'private']).default('private'),
})

export const Route = createFileRoute('/api/projects')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const cursor = url.searchParams.get('cursor')
        const rows = await db.projects.list({ cursor, limit: 25 })
        return Response.json(rows)
      },
      POST: async ({ request }) => {
        const body = CreateProject.parse(await request.json())
        const project = await db.projects.create(body)
        return Response.json(project, { status: 201 })
      },
    },
  },
})
`;

export const stats = [
  { label: "Active runs", value: "12", delta: "+3", trend: "up" as const },
  { label: "Tasks shipped", value: "1,284", delta: "+42", trend: "up" as const },
  { label: "Avg. duration", value: "4m 12s", delta: "-18s", trend: "down" as const },
  { label: "Tokens today", value: "8.4M", delta: "+1.2M", trend: "up" as const },
];
