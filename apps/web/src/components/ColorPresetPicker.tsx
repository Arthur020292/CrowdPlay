import { PLAYER_COLOR_PRESETS, type PlayerColorId } from "@crowdplay/protocol";

interface ColorPresetPickerProps {
  selectedColor: PlayerColorId;
  onChange: (color: PlayerColorId) => void;
}

export function ColorPresetPicker({ selectedColor, onChange }: ColorPresetPickerProps) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Choose your color</p>
      <div className="grid grid-cols-3 gap-3">
        {PLAYER_COLOR_PRESETS.map((preset) => {
          const selected = preset.id === selectedColor;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.id)}
              className={`rounded-[1.45rem] border px-3 py-4 text-sm font-semibold transition ${
                selected
                  ? "border-sky-300 bg-sky-50 text-slate-950 shadow-[0_10px_24px_rgba(56,189,248,0.18)]"
                  : "border-slate-200 bg-white/[0.8] text-slate-600 hover:border-sky-200 hover:bg-sky-50/[0.7]"
              }`}
            >
              <span
                className="mx-auto mb-3 block size-9 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.9)]"
                style={{ backgroundColor: preset.hex }}
              />
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
