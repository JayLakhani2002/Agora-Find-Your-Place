// index.jsx — top-level runner. Pick an agent, run its adversarial suite.
// All 8 suites share EvalHarness; each suite file supplies { agentName, context, tests }.
import { useState } from "react";
import EvalHarness from "./EvalHarness";
import agent1 from "./suites/agent1";
import agent2 from "./suites/agent2";
import agent3 from "./suites/agent3";
import agent4 from "./suites/agent4";
import agent5 from "./suites/agent5";
import agent6 from "./suites/agent6";
import agent7 from "./suites/agent7";
import agent8 from "./suites/agent8";

const SUITES = [agent1, agent2, agent3, agent4, agent5, agent6, agent7, agent8];

export default function AgoraEvalSuites() {
  const [idx, setIdx] = useState(0);
  const active = SUITES[idx];

  return (
    <div style={{ fontFamily: "'IBM Plex Mono','Courier New',monospace", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 12 }}>
        Agora Jobs · Agent Fleet · Adversarial Eval Suites
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        {SUITES.map((s, i) => (
          <button key={s.agentName} onClick={() => setIdx(i)}
            style={{
              background: i === idx ? "#89b4fa" : "var(--color-background-secondary)",
              color: i === idx ? "#1e1e2e" : "var(--color-text-secondary)",
              border: "1px solid var(--color-border-tertiary)", borderRadius: 7,
              padding: "7px 12px", fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
            {i + 1}. {s.shortName}
          </button>
        ))}
      </div>
      <EvalHarness key={active.agentName} agentName={active.agentName} context={active.context} tests={active.tests} />
    </div>
  );
}
