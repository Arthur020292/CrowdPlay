import { PLAYER_COLOR_PRESETS, type PlayerColorId } from "@crowdplay/protocol";

interface ColorPresetPickerProps {
  selectedColor: PlayerColorId;
  onChange: (color: PlayerColorId) => void;
}

export function ColorPresetPicker({ selectedColor, onChange }: ColorPresetPickerProps) {
  return (
    <div>
      <p className="mb-3 text-sm text-slate-300">Choose your color</p>
      <div className="grid grid-cols-3 gap-3">
        {PLAYER_COLOR_PRESETS.map((preset) => {
          const selected = preset.id === selectedColor;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.id)}
              className={`rounded-[1.25rem] border px-3 py-3 text-sm font-semibold transition ${
                selected ? "border-white bg-white/10 text-white" : "border-white/10 bg-slate-950/70 text-slate-300"
              }`}
            >
              <span className="mx-auto mb-2 block size-7 rounded-full" style={{ backgroundColor: preset.hex }} />
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
