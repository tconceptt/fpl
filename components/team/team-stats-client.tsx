"use client";

import { useState } from "react";
import { TransfersPopup } from "./transfers-popup";

interface TeamStatsProps {
    overallRank: number | null;
    h2hRank: number | null;
    transfers: number;
    transferCost: number;
    startersTotal: number;
    teamId: string;
    gameweek: string;
    activeChip?: string | null;
}

export function TeamStatsClient({
    overallRank,
    h2hRank,
    transfers,
    transferCost,
    startersTotal,
    teamId,
    gameweek,
    activeChip,
}: TeamStatsProps) {
    const [showTransfers, setShowTransfers] = useState(false);
    const isBenchBoostActive = activeChip === 'bboost';

    return (
        <>
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-lg p-2.5 mb-2.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {overallRank && (
                            <div className="flex flex-col">
                                <span className="text-xs text-white/50 uppercase tracking-wide">Overall Rank</span>
                                <span className="text-xs font-bold text-white">{overallRank.toLocaleString()}</span>
                            </div>
                        )}
                        {h2hRank && (
                            <div className="flex flex-col">
                                <span className="text-xs text-white/50 uppercase tracking-wide">H2H Rank</span>
                                <span className="text-xs font-bold text-white">#{h2hRank}</span>
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-xs text-white/50 uppercase tracking-wide">Transfers</span>
                            <button
                                onClick={() => transfers > 0 && setShowTransfers(true)}
                                className={`text-xs font-bold text-left ${transfers > 0
                                    ? "text-white hover:text-purple-300 cursor-pointer transition-colors"
                                    : "text-white cursor-default"
                                    }`}
                                disabled={transfers === 0}
                            >
                                <span className={transfers > 0 ? "underline underline-offset-2 decoration-dotted" : ""}>
                                    {transfers}
                                </span>
                                {transferCost > 0 && (
                                    <span className="text-red-400 ml-0.5">(-{transferCost})</span>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-white/50 uppercase tracking-wide">GW Total</span>
                            {isBenchBoostActive && (
                                <span className="text-xs text-cyan-300 font-bold bg-cyan-500/30 px-1.5 py-0.5 rounded border border-cyan-400/50">
                                    BB
                                </span>
                            )}
                        </div>
                        <span className="text-xl font-bold text-green-400">{startersTotal}</span>
                    </div>
                </div>
            </div>

            <TransfersPopup
                isOpen={showTransfers}
                onClose={() => setShowTransfers(false)}
                teamId={teamId}
                gameweek={gameweek}
            />
        </>
    );
}

