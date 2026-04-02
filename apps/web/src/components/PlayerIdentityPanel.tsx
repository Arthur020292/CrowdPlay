import type { FormEvent } from "react";

import { type PlayerColorId } from "@crowdplay/protocol";

import { ColorPresetPicker } from "./ColorPresetPicker";

interface PlayerIdentityPanelProps {
  code: string;
  name: string;
  color: PlayerColorId;
  onNameChange: (name: string) => void;
  onColorChange: (color: PlayerColorId) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  ctaLabel: string;
  submitting?: boolean;
  error?: string | null;
}

export function PlayerIdentityPanel({
  code,
  name,
  color,
  onNameChange,
  onColorChange,
  onSubmit,
  ctaLabel,
  submitting = false,
  error
}: PlayerIdentityPanelProps) {
  return (
    <div className="cp-card-light mx-auto max-w-xl p-8 sm:p-10">
      <span className="cp-eyebrow cp-eyebrow-light">Session {code}</span>
      <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Pick your player</h1>
      <p className="mt-3 text-base text-slate-600 sm:text-lg">Choose a name and a color you can spot instantly during the race.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Display name</span>
          <input
            className="cp-input text-lg font-semibold"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Your name"
            maxLength={24}
            autoFocus
          />
        </label>

        <ColorPresetPicker selectedColor={color} onChange={onColorChange} />

        {error ? <p className="rounded-[1rem] bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

        <button disabled={!name.trim() || submitting} className="cp-button-primary w-full text-base">
          {submitting ? "Joining..." : ctaLabel}
        </button>
      </form>
    </div>
  );
}
