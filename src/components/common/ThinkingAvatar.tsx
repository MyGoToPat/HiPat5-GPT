import React from "react";

type Props = {
  size?: number;
  label?: string;
  className?: string;
};

export default function ThinkingAvatar({
  size = 40,
  label = "Pat is thinking…",
  className = ""
}: Props) {
  const s = { w: size, h: size };

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      aria-live="polite"
      aria-label={label}
    >
      <div
        className="relative rounded-full bg-blue-600/90 shadow-md"
        style={{ width: s.w, height: s.h }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-3">
            <span className="eye" />
            <span className="eye" />
          </div>
        </div>
      </div>
      <span className="text-sm text-muted-foreground hidden sm:inline">
        Thinking…
      </span>
    </div>
  );
}
