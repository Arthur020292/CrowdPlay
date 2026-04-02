import type { FormEvent } from "react";

interface JoinCodePanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function JoinCodePanel({ code, onCodeChange, onSubmit }: JoinCodePanelProps) {
  return (
    <div className="cp-card-light mx-auto max-w-xl p-8 sm:p-10">
      <span className="cp-eyebrow cp-eyebrow-light">Join game</span>
      <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Enter the code</h1>
      <p className="mt-3 text-base text-slate-600 sm:text-lg">Type the code from the host screen. You&apos;ll pick your name and color next.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <input
          className="cp-input cp-code-input"
          value={code}
          onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          autoFocus
        />

        <button className="cp-button-primary w-full text-base">Continue</button>
      </form>

      <div className="mt-6 rounded-[1.4rem] bg-sky-100/80 px-4 py-3 text-sm font-medium text-sky-900">
        Looking up at the big screen? Enter the code exactly as shown.
      </div>
    </div>
  );
}
