import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

export function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      return;
    }

    navigate(`/play/${code.trim().toUpperCase()}`);
  };

  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
      <h1 className="text-3xl font-black text-white">Join TapDash</h1>
      <p className="mt-3 text-slate-300">Enter the game code from the host screen to open your phone controller.</p>

      <form onSubmit={handleSubmit} className="mt-6">
        <input
          className="w-full rounded-[1.75rem] border border-white/10 bg-slate-950/90 px-5 py-4 text-center text-2xl uppercase tracking-[0.5em] text-white outline-none"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
        />
        <button className="mt-4 inline-flex w-full items-center justify-center rounded-[1.5rem] bg-cyan-400 px-4 py-4 font-semibold text-slate-950">
          Continue
        </button>
      </form>
    </div>
  );
}
