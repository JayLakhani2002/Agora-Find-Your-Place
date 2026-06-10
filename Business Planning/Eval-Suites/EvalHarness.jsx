// EvalHarness.jsx — shared adversarial eval runner for the Agora agent fleet.
// One harness, reused by all 8 agent suites. Each suite supplies { agentName, context, tests }.
//
// A test sends `context + adversarial instruction` to the live model (the "agent under test"),
// then a SECOND call grades the response against a rubric. Real API calls — real results.
//
// Categories: Boundary · Security · Correctness · Coordination · Completeness
import { useRef, useState } from "react"

export const CATEGORY_COLORS = {
  Boundary: "#7c3aed",
  Security: "#dc2626",
  Correctness: "#0891b2",
  Coordination: "#059669",
  Completeness: "#d97706",
}

// Default to a current model; override via the model prop. The agent under test and the
// grader can be the same model — the grader is given a strict rubric and only returns JSON.
const DEFAULT_MODEL = "claude-sonnet-4-6"

async function callAPI(apiKey, model, messages, maxTokens = 4096) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Required for direct browser calls to the Anthropic API:
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.content?.[0]?.text || ""
}

function parseEval(raw) {
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim())
  } catch {
    const s = raw.match(/"score":\s*(\d+)/)?.[1]
    const v = raw.match(/"verdict":\s*"(PASS|FAIL)"/)?.[1]
    const r = raw.match(/"reason":\s*"([^"]+)"/)?.[1]
    return { score: s ? Number.parseInt(s) : 0, verdict: v || "ERROR", reason: r || "parse failed" }
  }
}

export default function EvalHarness({ agentName, context, tests, model = DEFAULT_MODEL }) {
  const [apiKey, setApiKey] = useState("")
  const [results, setResults] = useState({})
  const [running, setRunning] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [done, setDone] = useState(false)
  const abort = useRef(false)

  const runAll = async () => {
    if (!apiKey) {
      alert("Paste an Anthropic API key first.")
      return
    }
    abort.current = false
    setRunning(true)
    setDone(false)
    setResults({})

    for (let i = 0; i < tests.length; i++) {
      if (abort.current) break
      const test = tests[i]
      setCurrentIdx(i)
      try {
        // 1. Run the agent under test: full CLAUDE.md context + the adversarial instruction.
        const fullPrompt = `${context}\n\n---\nNew instruction from the project lead:\n${test.inject}`
        const agentResp = await callAPI(
          apiKey,
          model,
          [{ role: "user", content: fullPrompt }],
          4096,
        )
        // 2. Grade the response against this test's rubric.
        const evalResp = await callAPI(
          apiKey,
          model,
          [{ role: "user", content: test.evalPrompt(agentResp) }],
          400,
        )
        const parsed = parseEval(evalResp)
        setResults((p) => ({ ...p, [test.id]: { ...parsed, preview: agentResp.slice(0, 460) } }))
      } catch (e) {
        setResults((p) => ({
          ...p,
          [test.id]: { score: 0, verdict: "ERROR", reason: e.message, preview: "" },
        }))
      }
    }
    setRunning(false)
    setCurrentIdx(-1)
    setDone(true)
  }

  const scores = Object.values(results).filter((r) => typeof r.score === "number")
  const avg = scores.length
    ? (scores.reduce((a, b) => a + b.score, 0) / scores.length).toFixed(1)
    : null
  const passes = scores.filter((r) => r.verdict === "PASS").length
  const cats = [...new Set(tests.map((t) => t.category))]

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Mono','Courier New',monospace",
        padding: "0 0 40px",
        maxWidth: 840,
      }}
    >
      <style>{`
        .card{border:1px solid var(--color-border-tertiary);border-radius:10px;margin-bottom:10px;overflow:hidden}
        .card.live{border-color:#f59e0b}.card.pass{border-color:#10b981}.card.fail{border-color:#ef4444}
        .ring{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px;flex-shrink:0}
        .btn{background:#1e1e2e;color:#cdd6f4;border:1.5px solid #45475a;border-radius:8px;padding:12px 28px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:.05em}
        .btn:hover:not(:disabled){background:#313244;border-color:#89b4fa;color:#89b4fa}.btn:disabled{opacity:.5;cursor:not-allowed}
        .tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
        .key{background:var(--color-background-secondary);border:1px solid var(--color-border-tertiary);border-radius:6px;padding:8px 10px;font-family:inherit;font-size:12px;color:var(--color-text-primary);width:100%;margin-bottom:14px}
        details summary{list-style:none;cursor:pointer;padding:0 16px 10px;font-size:11px;color:var(--color-text-tertiary)}
        details summary::-webkit-details-marker{display:none}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
      `}</style>

      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: ".15em",
            color: "var(--color-text-tertiary)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Agora / {agentName} / Eval Suite
        </div>
        <h2
          style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)" }}
        >
          {agentName} stress test
        </h2>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 13,
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {tests.length} adversarial tests. Each sends the agent's CLAUDE.md + a hostile instruction
          to the live model, then grades the response. Tests scope, security, stack-correctness,
          coordination, completeness.
        </p>
      </div>

      <input
        className="key"
        type="password"
        placeholder="Anthropic API key (sk-ant-...)"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {cats.map((c) => (
          <span
            key={c}
            className="tag"
            style={{
              background: `${CATEGORY_COLORS[c]}18`,
              color: CATEGORY_COLORS[c],
              border: `1px solid ${CATEGORY_COLORS[c]}35`,
            }}
          >
            {c}
          </span>
        ))}
      </div>

      {scores.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 10,
            marginBottom: 18,
          }}
        >
          {[
            ["Avg score", `${avg}/10`],
            ["Passed", `${passes}/${scores.length}`],
            ["Status", done ? (passes === tests.length ? "ALL CLEAR" : "ISSUES FOUND") : "RUNNING"],
          ].map(([l, v]) => (
            <div
              key={l}
              style={{
                background: "var(--color-background-secondary)",
                border: "1px solid var(--color-border-tertiary)",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--color-text-tertiary)",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  marginBottom: 3,
                }}
              >
                {l}
              </div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  color:
                    done && l === "Status"
                      ? passes === tests.length
                        ? "#10b981"
                        : "#f59e0b"
                      : "var(--color-text-primary)",
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
      )}

      {tests.map((test, i) => {
        const res = results[test.id]
        const isLive = currentIdx === i
        const state = isLive ? "live" : res ? (res.verdict === "PASS" ? "pass" : "fail") : ""
        const col = res
          ? res.score >= 8
            ? "#10b981"
            : res.score >= 5
              ? "#f59e0b"
              : "#ef4444"
          : "var(--color-border-tertiary)"
        return (
          <div key={test.id} className={`card ${state}`}>
            <div style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 13 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  background: isLive
                    ? "#f59e0b18"
                    : res
                      ? res.verdict === "PASS"
                        ? "#10b98118"
                        : "#ef444418"
                      : "var(--color-background-secondary)",
                  border: `1.5px solid ${isLive ? "#f59e0b" : res ? (res.verdict === "PASS" ? "#10b981" : "#ef4444") : "var(--color-border-tertiary)"}`,
                  color: isLive
                    ? "#f59e0b"
                    : res
                      ? res.verdict === "PASS"
                        ? "#10b981"
                        : "#ef4444"
                      : "var(--color-text-tertiary)",
                  ...(isLive ? { animation: "pulse 1.2s infinite" } : {}),
                }}
              >
                {isLive ? "…" : res ? (res.verdict === "PASS" ? "✓" : "✗") : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 3,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}
                  >
                    {test.label}
                  </span>
                  <span
                    className="tag"
                    style={{
                      background: `${CATEGORY_COLORS[test.category]}18`,
                      color: CATEGORY_COLORS[test.category],
                      border: `1px solid ${CATEGORY_COLORS[test.category]}35`,
                    }}
                  >
                    {test.category}
                  </span>
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}
                >
                  {test.description}
                </div>
                {res?.reason && (
                  <div
                    style={{
                      marginTop: 7,
                      fontSize: 12,
                      color: res.verdict === "PASS" ? "#10b981" : "#ef4444",
                      lineHeight: 1.5,
                    }}
                  >
                    → {res.reason}
                  </div>
                )}
              </div>
              {res && (
                <div
                  className="ring"
                  style={{ background: `${col}15`, border: `2px solid ${col}`, color: col }}
                >
                  {res.score}
                </div>
              )}
              {isLive && (
                <div style={{ fontSize: 11, color: "#f59e0b", flexShrink: 0 }}>testing…</div>
              )}
            </div>
            {res?.preview && (
              <details>
                <summary>▸ agent response preview</summary>
                <div
                  style={{
                    margin: "0 16px 14px",
                    padding: 11,
                    background: "var(--color-background-tertiary)",
                    borderRadius: 6,
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {res.preview}…
                </div>
              </details>
            )}
          </div>
        )
      })}

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
        <button type="button" className="btn" onClick={runAll} disabled={running}>
          {running
            ? `Testing ${currentIdx + 1}/${tests.length}…`
            : `▶ Run all ${tests.length} tests`}
        </button>
        {done && (
          <span style={{ fontSize: 12, color: passes === tests.length ? "#10b981" : "#f59e0b" }}>
            {passes === tests.length
              ? `${agentName} is production-ready.`
              : `${tests.length - passes} test(s) need attention.`}
          </span>
        )}
      </div>
    </div>
  )
}
