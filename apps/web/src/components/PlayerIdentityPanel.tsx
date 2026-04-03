import type { FormEvent } from "react";

import { type PlayerAvatarId } from "@crowdplay/protocol";

import { AvatarPresetPicker } from "./AvatarPresetPicker";

interface PlayerIdentityPanelProps {
  code: string;
  name: string;
  avatarId: PlayerAvatarId;
  step: "name" | "avatar";
  onNameChange: (name: string) => void;
  onAvatarChange: (avatarId: PlayerAvatarId) => void;
  onContinue: () => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  ctaLabel: string;
  submitting?: boolean;
  error?: string | null;
}

export function PlayerIdentityPanel({
  code,
  name,
  avatarId,
  step,
  onNameChange,
  onAvatarChange,
  onContinue,
  onBack,
  onSubmit,
  ctaLabel,
  submitting = false,
  error
}: PlayerIdentityPanelProps) {
  const isNameStep = step === "name";

  return (
    <div className="cp-card-light mx-auto max-w-xl p-8 sm:p-10">
      <span className="cp-eyebrow cp-eyebrow-light">Session {code}</span>
      <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{isNameStep ? "Pick your name" : "Choose your avatar"}</h1>
      {isNameStep ? null : <p className="mt-3 text-base text-slate-600 sm:text-lg">Now pick the avatar that will represent you in the quiz chaos.</p>}

      {isNameStep ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onContinue();
          }}
          className="mt-8 space-y-5"
        >
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

          <button disabled={!name.trim()} className="cp-button-primary w-full text-base">
            Continue
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <AvatarPresetPicker selectedAvatarId={avatarId} onChange={onAvatarChange} />

          {error ? <p className="rounded-[1rem] bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

          <div className="flex gap-3">
            <button type="button" onClick={onBack} className="cp-button-secondary min-w-[9rem] text-base">
              Back
            </button>
            <button disabled={submitting} className="cp-button-primary flex-1 text-base">
              {submitting ? "Joining..." : ctaLabel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
