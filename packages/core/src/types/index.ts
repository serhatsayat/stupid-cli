// ─── Agent Types ─────────────────────────────────────────────

export enum AgentRole {
  Research = "research",
  Spec = "spec",
  Architect = "architect",
  Tester = "tester",
  Implementer = "implementer",
  Reviewer = "reviewer",
  Finalizer = "finalizer",
}

export interface AgentResult {
  role: AgentRole;
  model: string;
  success: boolean;
  output: string;
  structuredData?: unknown;
  tokensUsed: number;
  costUsd: number;
  durationMs: number;
  error?: string;
}

// ─── Task / Slice / Plan Types ───────────────────────────────

export interface TaskSpec {
  id: string;
  title: string;
  description: string;
  assignedRole: AgentRole;
  dependencies: string[];
  files: string[];
  testCommand?: string;
}

export interface SliceSpec {
  id: string;
  title: string;
  tasks: TaskSpec[];
  status: "pending" | "in-progress" | "done" | "failed";
}

export interface PlanSpec {
  milestone: {
    id: string;
    title: string;
    description: string;
  };
  slices: SliceSpec[];
  totalEstimate: {
    tokens: number;
    costUsd: number;
    durationMs: number;
  };
}

// ─── Sub-Agent Types ─────────────────────────────────────────

export interface SubAgentSpawnOptions {
  agentRole: AgentRole;
  model: string;
  taskSpec: TaskSpec;
  contextFiles: string[];
  memoryRecords: ProjectMemoryRecord[];
  maxTokens: number;
  budgetUsd: number;
}

// ─── Token Profile ───────────────────────────────────────────

export type TokenProfile = "budget" | "balanced" | "quality";

// ─── Configuration ───────────────────────────────────────────

export interface StupidConfig {
  models: {
    research: string;
    implementation: string;
    architecture: string;
    review: string;
    testing: string;
  };
  governance: {
    loopDetection: boolean;
    costTracking: boolean;
    maxRetries: number;
    stagnationThreshold: number;
  };
  budget: {
    softLimitUsd: number;
    hardLimitUsd: number;
    warningThresholdPercent: number;
  };
  git: {
    commitPerTask: boolean;
    branchPerSlice: boolean;
    autoCommitMessage: boolean;
  };
  profile: TokenProfile;
  projectRoot: string;
  verbose: boolean;
}

// ─── Governance Types ────────────────────────────────────────

export enum LoopState {
  Productive = "productive",
  Stagnating = "stagnating",
  Stuck = "stuck",
  Failing = "failing",
  Recovering = "recovering",
}

export interface CostEntry {
  timestamp: string;
  agentRole: AgentRole;
  model: string;
  tokensUsed: number;
  costUsd: number;
  taskId: string;
  sliceId: string;
}

export interface GovernanceReport {
  loopState: LoopState;
  totalCostUsd: number;
  totalTokensUsed: number;
  costEntries: CostEntry[];
  recommendations: string[];
  timestamp: string;
}

export type ActivityEventType =
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "agent_spawned"
  | "agent_completed"
  | "cost_recorded"
  | "loop_detected"
  | "budget_warning"
  | "budget_exceeded";

// ─── Memory Types ────────────────────────────────────────────

export interface ProjectMemoryRecord {
  id: string;
  category: "decision" | "pattern" | "lesson" | "context";
  content: string;
  source: string;
  timestamp: string;
  relevance: number;
  tags: string[];
  sessionId?: string;
  sliceName?: string;
  date?: string;
  summary?: string;
  decisions?: string[];
  patterns?: string[];
  bugs?: string[];
  filesChanged?: string[];
  testsAdded?: number;
  cost?: number;
  model?: string;
}

export interface DecisionRecord {
  id: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  madeBy: AgentRole;
  timestamp: string;
  taskId?: string;
  sliceId?: string;
  sessionId?: string;
  sliceName?: string;
  summary?: string;
  patterns?: string[];
  bugs?: string[];
  filesChanged?: string[];
  testsAdded?: number;
  cost?: number;
  model?: string;
}

export interface SessionState {
  sessionId: string;
  startedAt: string;
  currentSliceId?: string;
  currentTaskId?: string;
  completedTasks: string[];
  failedTasks: string[];
  totalCostUsd: number;
  totalTokensUsed: number;
}

// ─── Provider Error Types ────────────────────────────────────

export enum ProviderErrorType {
  RateLimit = "rate_limit",
  Overloaded = "overloaded",
  ServerError = "server_error",
  AuthError = "auth_error",
  InvalidRequest = "invalid_request",
  PermissionDenied = "permission_denied",
  ContextOverflow = "context_overflow",
  NetworkError = "network_error",
  Timeout = "timeout",
  Unknown = "unknown",
}

export interface ProviderError {
  errorType: ProviderErrorType;
  retryable: boolean;
  retryAfterMs?: number;
  originalMessage: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
}
