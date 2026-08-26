"use client";

import { useState, useEffect } from "react";
import { resolveMediaSrc } from "@/lib/media";

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/**
 * Shows the real profile photo when available, falling back to an
 * initials badge (on the given `fallbackBg`) while loading, on error, or
 * when the user hasn't uploaded a photo yet.
 */
export function Avatar({
  src, nama, sizePx, fallbackBg, textClassName, className, ring,
}: {
  src?: string | null;
  nama: string;
  sizePx: number;
  fallbackBg: string;
  textClassName?: string;
  className?: string;
  ring?: string;
}) {
  const resolved = resolveMediaSrc(src);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [resolved]);

  const showPhoto = !!resolved && !errored;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${className ?? ""}`}
      style={{ width: sizePx, height: sizePx, ...(ring ? { boxShadow: ring } : {}) }}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={nama}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center font-extrabold text-white ${textClassName ?? ""}`}
          style={{ background: fallbackBg }}
        >
          {getInitials(nama)}
        </div>
      )}
    </div>
  );
}
