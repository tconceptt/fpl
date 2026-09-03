"use client";

import { useState } from "react";
import Image from "next/image";
import { kitSources } from "@/lib/clubs";

export interface KitPlayerLike {
  elementType: number;
  team: number;
  teamShortName?: string;
  teamCode?: number;
}

/**
 * A club kit for one player, trying the local file, then FPL's official
 * shirt image, then the placeholder (see `kitSources`). Shared by the
 * transfers popup, the transfer feed and the ownership table.
 */
export function KitImage({
  player,
  className,
  size = 32,
}: {
  player: KitPlayerLike;
  className?: string;
  size?: number;
}) {
  const club =
    player.teamShortName && player.teamCode
      ? { id: player.team, name: "", shortName: player.teamShortName, code: player.teamCode }
      : undefined;
  const paths = kitSources(club, player.elementType === 1);
  const [idx, setIdx] = useState(0);
  const src = paths[Math.min(idx, paths.length - 1)];

  return (
    <Image
      src={src}
      alt="kit"
      width={size}
      height={size}
      className={className}
      onError={() => setIdx((i) => Math.min(i + 1, paths.length - 1))}
    />
  );
}
