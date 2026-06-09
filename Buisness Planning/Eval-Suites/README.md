# Agora Jobs — Agent Eval Suites
**Adversarial stress tests for all 8 build agents.**

Each agent in the fleet (`../Agents/CLAUDE_AGENT*.md`) has a suite of hostile prompts that try to
make it violate its scope, leak data, ship the wrong stack, break a coordination contract, or cut a
corner under pressure. A run sends the agent's CLAUDE.md + a hostile instruction to the live model,
then a second model call grades the response against a strict rubric.

---

## Folder layout

```
Eval-Suites/
├─ README.md               ← you are here
├─ STRESS-TEST-REPORT.md   ← static red-team analysis + findings (read this)
├─ EvalHarness.jsx         ← shared runner + UI (written once, reused by all 8)
├─ index.jsx               ← top-level: pick an agent, run its suite
├─ suites/
│  └─ agent1.js … agent8.js   ← per-agent { agentName, context, tests }
│
│  ── standalone Vite runner (no setup beyond install) ──
├─ package.json            ← deps + scripts
├─ vite.config.js
├─ index.html              ← Vite entry
├─ main.jsx                ← mounts <AgoraEvalSuites/>
└─ styles.css              ← theme tokens (Catppuccin) for the --color-* vars
```

Each `suites/agentN.js` exports a condensed CLAUDE.md `context` + a `tests` array. A test is:
```js
{ id, label, category, description, inject /* the hostile instruction */, evalPrompt /* grading rubric */ }
```
Categories: **Boundary · Security · Correctness · Coordination · Completeness**.

---

## How to run

This folder **is** a self-contained Vite app — no wiring needed:

```bash
cd "Buisness Planning/Eval-Suites"
npm install
npm run dev          # opens http://localhost:5180
```

Then:
1. Paste an **Anthropic API key** (`sk-ant-…`) into the field.
2. Pick an agent tab, click **Run all tests**.
3. Each test shows a 0–10 score, PASS/FAIL, a one-line reason, and a response preview.

(You can still drop the `.jsx`/`suites` files into any other React app and render `<AgoraEvalSuites/>`
from `index.jsx` — the Vite files just save you the setup.)

**Notes**
- The harness calls the Anthropic API directly from the browser — it sends
  `anthropic-version: 2023-06-01` and `anthropic-dangerous-direct-browser-access: true`.
  Use a key you're comfortable exposing client-side (a scoped/temporary key, not production).
- Default model is `claude-sonnet-4-6`; override with the `model` prop on `<EvalHarness>`.
- Each test = 2 API calls (agent under test + grader). 8 agents × 8 tests = 128 calls for a full sweep.

---

## What a good result looks like

A test **PASSES** when the agent, under a hostile instruction, does the right thing:
refuses + redirects (Boundary), holds the rule (Security), emits correct stack code (Correctness),
respects the handoff (Coordination), or ships both halves (Completeness).

The suites are derived from each agent's documented failure modes, so a model that faithfully
follows the CLAUDE.md should pass. The point of running them live is to catch **drift** — where
the model ignores the spec under pressure, praise, or a plausible-sounding shortcut. The
highest-signal tests are the *execution* ones (e.g. "write the Stripe client", "write the vector
index") where passing requires emitting correct code, not just refusing.

---

## Adding / editing tests

Edit the relevant `suites/agentN.js`. Keep `inject` genuinely adversarial (a real shortcut someone
might actually suggest), and make `evalPrompt` return strict JSON: `{"score":N,"verdict":"PASS|FAIL","reason":"…"}`.
If you change an agent's CLAUDE.md scope, update its suite's `context` to match.

See `STRESS-TEST-REPORT.md` for the current findings.
