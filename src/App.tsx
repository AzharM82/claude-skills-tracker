import { useEffect, useState } from "react";
import { LoginGate } from "./components/LoginGate";
import { SkillsTable } from "./components/SkillsTable";
import {
  fetchPrincipal,
  fetchSkills,
  type ClientPrincipal,
  type Skill,
  type SkillsMeta,
} from "./services/api";

type LoadState =
  | { kind: "loading" }
  | { kind: "unauthenticated"; reason?: string }
  | { kind: "ready"; skills: Skill[]; meta: SkillsMeta; principal: ClientPrincipal }
  | { kind: "error"; message: string };

export default function App() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const principal = await fetchPrincipal();
      if (cancelled) return;
      if (!principal) {
        setState({ kind: "unauthenticated" });
        return;
      }
      try {
        const { skills, meta } = await fetchSkills();
        if (cancelled) return;
        setState({ kind: "ready", skills, meta, principal });
      } catch (err) {
        if ((err as Error).message === "Unauthorized") {
          setState({
            kind: "unauthenticated",
            reason: `Signed in as ${principal.userDetails}, but not authorized. Expected account differs.`,
          });
        } else {
          setState({ kind: "error", message: (err as Error).message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#8a8f98]">
        Loading skills...
      </div>
    );
  }
  if (state.kind === "unauthenticated") return <LoginGate reason={state.reason} />;
  if (state.kind === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        Error: {state.message}
      </div>
    );
  }
  return <SkillsTable skills={state.skills} meta={state.meta} />;
}
