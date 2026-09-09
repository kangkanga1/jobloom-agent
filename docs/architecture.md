# Jobloom Agent architecture

## Design goals

Jobloom Agent is built around four constraints:

1. It must run without an API key.
2. Agent decisions must be reproducible and inspectable.
3. Personal job-search data must stay local by default.
4. Any action that changes the user's plan must remain human-approved.

The current implementation therefore uses a deterministic planner rather than a remote model. The planner and tools are separated so an LLM adapter can be added later without rewriting the product surface.

## Runtime overview

```text
User goal
   │
   ▼
runCareerAgent(goal, jobs, matchAnalysis)
   │
   ├── inspect_pipeline
   ├── rank_opportunities
   ├── analyze_resume_gaps
   └── build_action_plan
   │
   ▼
AgentRun
   ├── concise summary
   ├── tool-call trace
   ├── ranked tasks
   └── decision insight
   │
   ▼
Human approval
```

`runCareerAgent` is a pure function in `lib/agent.ts`. Given the same goal, job list, analysis and timestamp, it returns the same plan. This makes the core easy to test and safe to run in the browser.

## Domain model

### Job

The `Job` type in `lib/jobloom.ts` is the primary record:

- identity: `id`, `company`, `role`
- context: `location`, `salary`, `notes`
- workflow: `stage`, `nextStep`, `dueDate`
- ranking inputs: `score`, `createdAt`

The four workflow stages are `saved`, `applied`, `interview`, and `offer`.

### MatchAnalysis

Resume matching returns:

- a normalized `score`
- skills found in both inputs (`matched`)
- skills requested by the role but unsupported in the resume (`missing`)
- evidence-oriented editing suggestions
- a concise summary

The matcher favors evidence over keyword stuffing. It gives a small bonus for quantified outcomes and ownership signals.

### AgentRun

Every run records:

- the user goal
- a timestamped run ID
- the ordered tool-call trace
- the generated tasks and their priority
- a short decision insight

The trace contains user-facing evidence summaries, not hidden chain-of-thought.

## Opportunity ranking

The deterministic planner combines:

- stage value: interviews and offers receive more weight
- resume match score
- whether a next-step due date exists
- goal-specific boosts, such as prioritizing interviews when the goal mentions interview conversion

This policy is intentionally small and readable. A production version can replace it with a configurable scoring profile or an LLM planner while keeping the same output schema.

## Human-in-the-loop boundary

The agent is read-only while planning. It may inspect records and create proposed tasks, but the interface requires explicit approval before those tasks become an accepted plan. Moving an application stage is a separate action.

This boundary keeps automated analysis reversible and makes side effects visible.

## Browser persistence

The app stores these records in `localStorage`:

| Key | Data |
| --- | --- |
| `jobloom:workspace:v1` | application records |
| `jobloom:interview-answers:v1` | interview drafts |
| `jobloom:completed-tasks:v1` | completed focus tasks |
| `jobloom:completed-questions:v1` | interview practice progress |
| `jobloom:agent-run:v1` | latest agent run |
| `jobloom:agent-approvals:v1` | approved agent tasks |

No server persistence is required. Browser data can be reset from the sidebar, and application data can be exported as CSV.

## WebMCP surface

The page feature-detects `document.modelContext` and registers four imperative tools when supported:

### `run_job_search_agent`

Input:

```json
{ "goal": "提高本周面试转化率" }
```

Returns the run ID, summary, and ranked task list. It also updates the visible Agent console.

### `create_job_application`

Creates a local application record from `company`, `role`, optional `location`, and optional `stage`.

### `move_job_application`

Moves an existing record to one of the four supported workflow stages.

### `analyze_resume_match`

Runs the local matcher with a resume and job description, then opens the visible match view.

All WebMCP tools validate input before updating state and return concise JSON-serializable results.

## Adding an LLM planner

A future remote planner should preserve the current tool and `AgentRun` contracts:

1. Keep all model credentials server-side.
2. Give the model only the minimum job fields needed for the stated goal.
3. Validate every tool argument with a schema before execution.
4. Treat model output as untrusted input.
5. Keep state-changing actions behind the existing approval boundary.
6. Log tool names, validated arguments, outcomes, latency and failures without storing raw resumes unnecessarily.

An adapter can translate model tool calls into the existing pure functions, then normalize the final response back into `AgentRun`.

## Deployment

The app builds to a Cloudflare Worker-compatible ESM bundle through Vinext and Vite. The generated Worker entrypoint exports a default object with a `fetch` handler. No database, object storage, authentication provider, or runtime secret is required.
