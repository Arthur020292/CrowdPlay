import { PLAYER_AVATAR_PRESETS, type PlayerAvatarId } from "@crowdplay/protocol";

import { AvatarBadge } from "./AvatarBadge";

interface AvatarPresetPickerProps {
  selectedAvatarId: PlayerAvatarId;
  onChange: (avatarId: PlayerAvatarId) => void;
}

export function AvatarPresetPicker({ selectedAvatarId, onChange }: AvatarPresetPickerProps) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Choose your avatar</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PLAYER_AVATAR_PRESETS.map((preset) => {
          const selected = preset.id === selectedAvatarId;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.id)}
              className={`rounded-[1.5rem] border px-3 py-4 text-sm font-semibold transition ${
                selected
                  ? "border-sky-300 bg-sky-50 text-slate-950 shadow-[0_10px_24px_rgba(56,189,248,0.18)]"
                  : "border-slate-200 bg-white/[0.84] text-slate-600 hover:border-sky-200 hover:bg-sky-50/[0.7]"
              }`}
            >
              <AvatarBadge avatarId={preset.id} size={60} className="mx-auto mb-3" />
              <div className="text-base font-black text-slate-950">{preset.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
