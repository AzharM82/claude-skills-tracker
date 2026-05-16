import { useEffect, useState } from "react";
import { LoginGate } from "./components/LoginGate";
import { SkillsTable } from "./components/SkillsTable";
import { AITrendingTable } from "./components/AITrendingTable";
import {
  fetchPrincipal,
  fetchSkills,
  type ClientPrincipal,
  type Skill,
  type SkillsMeta,
} from "./services/api";

type Tab = "skills" | "trending";

type LoadState =
  | { kind: "loading" }
  | { kind: "unauthenticated"; reason?: string }
  | { kind: "ready"; skills: Skill[]; meta: SkillsMeta; principal: ClientPrincipal }
  | { kind: "error"; message: string };

export default function App() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [tab, setTab] = useState<Tab>("skills");

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

  return (
    <div>
      <nav className="max-w-6xl mx-auto px-6 pt-6 flex items-center gap-2 border-b border-[#24282e]">
        <TabButton active={tab === "skills"} onClick={() => setTab("skills")}>
          Skills
        </TabButton>
        <TabButton active={tab === "trending"} onClick={() => setTab("trending")}>
          AI Trending
        </TabButton>
      </nav>
      {tab === "skills" ? (
        <SkillsTable skills={state.skills} meta={state.meta} />
      ) : (
        <AITrendingTable />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-[#2563eb] text-[#e6e8eb]"
          : "border-transparent text-[#8a8f98] hover:text-[#e6e8eb]"
      }`}
    >
      {children}
    </button>
  );
}
