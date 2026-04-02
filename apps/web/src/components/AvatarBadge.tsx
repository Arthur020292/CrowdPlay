import type { CSSProperties } from "react";

import { getPlayerAvatarPreset, type PlayerAvatarId } from "@crowdplay/protocol";

interface AvatarBadgeProps {
  avatarId: PlayerAvatarId;
  size?: number;
  className?: string;
}

function AvatarFace({ avatarId }: { avatarId: PlayerAvatarId }) {
  switch (avatarId) {
    case "fox":
      return (
        <>
          <path d="M16 18 L26 8 L31 20 Z" fill="#d66f18" />
          <path d="M48 18 L38 8 L33 20 Z" fill="#d66f18" />
          <path d="M18 25 C18 16, 46 16, 46 25 L44 43 C40 51, 24 51, 20 43 Z" fill="#f69f33" />
          <path d="M24 34 C27 30, 37 30, 40 34 C39 42, 25 42, 24 34 Z" fill="#fff5ea" />
          <circle cx="26" cy="30" r="2.4" fill="#3f2617" />
          <circle cx="38" cy="30" r="2.4" fill="#3f2617" />
          <path d="M30 36 L34 36 L32 39 Z" fill="#3f2617" />
        </>
      );
    case "panda":
      return (
        <>
          <circle cx="22" cy="18" r="7" fill="#1f2937" />
          <circle cx="42" cy="18" r="7" fill="#1f2937" />
          <circle cx="32" cy="31" r="17" fill="#f8fafc" />
          <ellipse cx="24" cy="30" rx="5.8" ry="7.5" fill="#1f2937" />
          <ellipse cx="40" cy="30" rx="5.8" ry="7.5" fill="#1f2937" />
          <circle cx="25" cy="30" r="2.1" fill="#f8fafc" />
          <circle cx="39" cy="30" r="2.1" fill="#f8fafc" />
          <ellipse cx="32" cy="38" rx="7" ry="5.6" fill="#eef2f7" />
          <path d="M29 36 L35 36 L32 39 Z" fill="#1f2937" />
        </>
      );
    case "tiger":
      return (
        <>
          <path d="M16 18 L25 10 L29 21 Z" fill="#cf6314" />
          <path d="M48 18 L39 10 L35 21 Z" fill="#cf6314" />
          <path d="M18 24 C18 16, 46 16, 46 24 L44 43 C40 51, 24 51, 20 43 Z" fill="#f78a1d" />
          <path d="M23 34 C26 31, 38 31, 41 34 C40 42, 24 42, 23 34 Z" fill="#fff3df" />
          <path d="M22 19 L26 26 L21 26 Z" fill="#5b2c0d" />
          <path d="M42 19 L38 26 L43 26 Z" fill="#5b2c0d" />
          <path d="M32 16 L29 24 L35 24 Z" fill="#5b2c0d" />
          <path d="M25 28 L27 34" stroke="#5b2c0d" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M39 28 L37 34" stroke="#5b2c0d" strokeWidth="2.3" strokeLinecap="round" />
          <circle cx="26" cy="30" r="2.2" fill="#422006" />
          <circle cx="38" cy="30" r="2.2" fill="#422006" />
          <path d="M30 36 L34 36 L32 39 Z" fill="#422006" />
        </>
      );
    case "frog":
      return (
        <>
          <circle cx="23" cy="20" r="7.5" fill="#79d12b" />
          <circle cx="41" cy="20" r="7.5" fill="#79d12b" />
          <path d="M16 24 C16 16, 48 16, 48 26 L45 43 C40 50, 24 50, 19 43 Z" fill="#9ae13e" />
          <circle cx="23" cy="20" r="3.8" fill="#f8fafc" />
          <circle cx="41" cy="20" r="3.8" fill="#f8fafc" />
          <circle cx="23" cy="20" r="1.9" fill="#142c0f" />
          <circle cx="41" cy="20" r="1.9" fill="#142c0f" />
          <path d="M24 37 C27 41, 37 41, 40 37" stroke="#2f5b17" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="27" cy="31" r="1.8" fill="#4f7f25" />
          <circle cx="37" cy="31" r="1.8" fill="#4f7f25" />
        </>
      );
    case "owl":
      return (
        <>
          <path d="M18 20 L26 10 L30 22 Z" fill="#855334" />
          <path d="M46 20 L38 10 L34 22 Z" fill="#855334" />
          <path d="M18 24 C18 16, 46 16, 46 24 L43 44 C39 50, 25 50, 21 44 Z" fill="#9d6840" />
          <circle cx="25" cy="30" r="7.5" fill="#efe1c7" />
          <circle cx="39" cy="30" r="7.5" fill="#efe1c7" />
          <circle cx="25" cy="30" r="3.3" fill="#2a1a13" />
          <circle cx="39" cy="30" r="3.3" fill="#2a1a13" />
          <path d="M32 36 L28 32 L36 32 Z" fill="#f3b13f" />
        </>
      );
    case "shark":
      return (
        <>
          <path d="M12 35 C18 18, 42 15, 50 28 C52 35, 48 47, 32 49 C20 49, 13 43, 12 35 Z" fill="#7dd3fc" />
          <path d="M29 18 L34 8 L39 20 Z" fill="#56b8eb" />
          <path d="M18 36 C21 30, 44 30, 46 36 C43 44, 21 44, 18 36 Z" fill="#f8fafc" />
          <circle cx="39" cy="28" r="2.2" fill="#0f2940" />
          <path d="M20 37 L24 40 L28 37 L32 40 L36 37 L40 40 L44 37" stroke="#0f2940" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
  }
}

export function AvatarBadge({ avatarId, size = 56, className = "" }: AvatarBadgeProps) {
  const preset = getPlayerAvatarPreset(avatarId);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-[1.35rem] border-[3px] bg-white ${className}`.trim()}
      style={
        {
          width: size,
          height: size,
          borderColor: preset.accentHex,
          boxShadow: `0 6px 0 ${preset.shadowHex}`
        } as CSSProperties
      }
    >
      <svg viewBox="0 0 64 64" className="h-[82%] w-[82%]" aria-hidden="true">
        <AvatarFace avatarId={avatarId} />
      </svg>
    </span>
  );
}
