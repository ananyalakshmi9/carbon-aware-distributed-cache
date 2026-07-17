# Build Prompt: Carbon-Aware Distributed Cache

Paste this into Claude Code (or your AI coding tool of choice) in the root of your existing cache repo. Work through it phase by phase — don't ask it to build everything in one shot.

---

## Context to give it first

```
I have an existing single-node in-memory cache service with this structure:

- src/backend/cache.js — in-memory object storage, hit/miss counters,
  saveSnapshot/loadSnapshot for persistence across restarts
- src/backend/server.js — Express API:
  GET /health
  POST /v1/cache/:key, PUT /v1/cache/:key
  GET /v1/cache/:key
  DELETE /v1/cache/:key
  GET /metrics — hit rate, misses, total items, eviction stats
- src/frontend — React dashboard for viewing metrics/keys, basic operations
- src/backend/test — Jest + Supertest unit/integration tests
- .github/workflows/ci.yml — lint, compile, test, coverage, package

I'm extending this into a research project: a distributed, carbon-aware
cache. Full spec below. Work through the phases in order — confirm each
phase works and passes its tests before moving to the next. Don't skip
ahead or build later phases speculatively.
```

---

## Project Spec

**Title:** Carbon-Aware Distributed Caching: Spatiotemporal Eviction and Placement for Sustainable Distributed Key-Value Stores

**Goal:** Extend the existing single-node cache into a multi-node cluster that jointly decides (a) what to evict and (b) which region/node should host a given key, based on recompute cost, real-time regional carbon intensity, and migration cost — instead of plain LRU/LFU + static consistent hashing.

**Non-goals (explicitly do NOT build these):** a real multi-datacenter deployment, a production-grade consensus protocol (Raft/Paxos), authentication/authorization, a UI redesign beyond what's needed to show new metrics. This is a research prototype — favor clarity and instrumentation over production hardening.

---

## Phase 1 — Sharded Cluster (Consistent Hashing)

Build a coordinator layer in front of multiple cache node instances.

- Implement consistent hashing with virtual nodes (configurable count, default 150 per physical node) as a standalone module (`src/backend/hashRing.js`), unit-tested in isolation — key distribution, correct node lookup, minimal remapping on node add/remove.
- Each "node" is just another instance of the existing cache.js/server.js — run them as separate processes on different ports for local dev (e.g., `NODE_PORT=4001 NODE_REGION=us-east node server.js`).
- Add a coordinator service (`src/backend/coordinator.js` + its own Express server) that:
  - Routes GET/POST/PUT/DELETE `/v1/cache/:key` requests to the correct node via the hash ring
  - Exposes `GET /v1/cluster/status` — list of nodes, their health, and which key ranges they own
  - Aggregates `/metrics` across all nodes into a cluster-wide view
- Add a `NODE_REGION` env var per node instance — this will matter in Phase 3.
- Write integration tests that spin up 3 local node instances + coordinator, and verify requests route correctly and survive a node being killed and restarted.

**Deliverable for phase 1:** a working sharded cluster, runnable locally with `docker-compose` or a `start-cluster.sh` script, with tests passing.

---

## Phase 2 — Cost-Aware Scoring (single node first)

Before adding carbon, get cost-based eviction working on a single node — it's simpler to validate in isolation.

- Add a `recomputeCost` field, settable per key on write (`POST /v1/cache/:key` body includes `{ value, recomputeCost }`), defaulting to a configurable baseline if omitted.
- Replace/extend the existing eviction logic in `cache.js` with a scoring function: `score = f(recency, frequency, recomputeCost)` — start with a simple weighted sum, make weights configurable.
- Add unit tests comparing eviction order under plain LRU vs. cost-weighted eviction on the same synthetic access sequence, to prove the policy actually behaves differently and sensibly.

**Deliverable for phase 2:** single-node cost-aware eviction, tested against plain LRU baseline with clear before/after examples.

---

## Phase 3 — Carbon-Aware Layer

- Build `src/backend/carbonData.js`: a client for a carbon-intensity data source.
  - Start with a **mock/synthetic provider** (a JSON file or generator producing plausible gCO₂/kWh values per region, varying over a simulated 24h cycle) so development doesn't depend on external API access.
  - Add a real provider behind the same interface (WattTime or Electricity Maps — check their free/academic tier signup requirements before committing; this may take a day to get access, so start the signup process now even though you're using the mock provider first).
- Extend the coordinator's routing logic: for a new key, decide placement not just via the hash ring but via a placement policy that factors in current carbon intensity of candidate regions and recompute cost of the data.
- Add a rebalancing routine (can be scheduled/manual-trigger, not necessarily real-time): periodically check if migrating a key to a lower-carbon region would net-save carbon after accounting for migration cost, and move it if so.
- Instrument everything: every eviction and placement/migration decision should log its score breakdown (recompute cost, carbon intensity, migration cost) somewhere queryable — this is your evaluation data.

**Deliverable for phase 3:** a cluster where key placement visibly shifts as (mock) regional carbon intensity changes over simulated time, with a decision log you can analyze afterward.

---

## Phase 4 — Simulation & Evaluation Harness

- Build a workload generator (`src/backend/simulate.js` or a separate script) producing a configurable access pattern (Zipfian distribution is standard for cache workloads) against the running cluster.
- Feed it a realistic multi-region carbon-intensity trace (real historical data from WattTime/Electricity Maps export, or your synthetic generator scaled up) mapped to your simulated regions.
- Run three comparison configurations automatically and log results:
  1. Plain consistent hashing + LRU (baseline)
  2. Cost-aware eviction only, plain hashing (Phase 2 alone)
  3. Full carbon-aware eviction + placement (Phase 3)
- Metrics to capture per run: hit rate, p99 latency, total simulated CO₂ (using recompute-cost-on-miss × carbon intensity at time of miss), and total migration overhead.
- Output results as CSV/JSON so they can be charted for the paper.

**Deliverable for phase 4:** a script that runs all three configurations against the same trace and workload, and produces a results table/CSV ready to turn into paper figures.

---

## Phase 5 — Dashboard Extension (lower priority, do last)

- Extend the existing React dashboard to show: per-node/per-region status, current carbon intensity per region, and a live feed of recent eviction/placement decisions with their score breakdown.
- This is for demos (interviews, presentations) — keep it functional, don't over-invest in polish here relative to phases 1–4.

---

## Testing & CI expectations throughout

- Keep the existing Jest/Supertest pattern; add integration tests per phase as described above.
- Update `.github/workflows/ci.yml` to run the multi-node integration tests (may need to start multiple processes in the CI job — use a `start-cluster.sh` + `wait-on` pattern).
- Don't let test coverage regress on the existing single-node code while extending it.

---

## How to work with your AI coding tool on this

- Do NOT ask it to generate all 5 phases in one session — go phase by phase, and read/understand the code it produces before moving on. You need to be able to explain the placement/eviction scoring logic yourself, since that's the actual research contribution.
- After each phase, ask it to write a short summary of design decisions made and any tradeoffs — keep these, they become your paper's system design section.
- When it writes the carbon-aware scoring logic in Phase 3, review the formula carefully and adjust weights/design yourself — this is the one piece that should reflect your own reasoning, not the tool's default.