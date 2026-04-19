export function LoginGate({ reason }: { reason?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#141821] border border-[#24282e] rounded-xl p-8 text-center">
        <div className="text-xs uppercase tracking-widest text-[#8ab4ff] mb-2">Claude Code Skills</div>
        <h1 className="text-2xl font-semibold mb-2">Sign in to continue</h1>
        <p className="text-sm text-[#8a8f98] mb-6">
          {reason ??
            "This tracker is private. Sign in with GitHub to view the skill library."}
        </p>
        <a
          href="/.auth/login/github?post_login_redirect_uri=/"
          className="inline-block px-5 py-2.5 bg-[#24292f] hover:bg-[#1f2328] text-white rounded-lg font-semibold transition"
        >
          Sign in with GitHub
        </a>
      </div>
    </div>
  );
}
