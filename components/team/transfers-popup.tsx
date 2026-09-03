"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { KitImage } from "@/components/ui/kit-image";

interface PlayerKitInfo {
    id: number;
    name: string;
    team: number;
    teamShortName?: string;
    teamCode?: number;
    elementType: number;
}

interface TransferWithDetails {
    playerIn: PlayerKitInfo | null;
    playerOut: PlayerKitInfo | null;
    playerInPoints: number;
    playerOutPoints: number;
    event: number;
}

interface TransfersPopupProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string;
    gameweek: string;
}

export function TransfersPopup({ isOpen, onClose, teamId, gameweek }: TransfersPopupProps) {
    const [transfers, setTransfers] = useState<TransferWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalIn, setTotalIn] = useState(0);
    const [totalOut, setTotalOut] = useState(0);

    const fetchTransfers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/transfers/${gameweek}?entry=${teamId}`);
            if (!response.ok) throw new Error("Failed to fetch transfers");
            const data = await response.json();

            setTransfers(data.transfers || []);
            setTotalIn(data.totalIn || 0);
            setTotalOut(data.totalOut || 0);
        } catch (error) {
            console.error("Failed to fetch transfers:", error);
        } finally {
            setLoading(false);
        }
    }, [teamId, gameweek]);

    useEffect(() => {
        if (isOpen) {
            fetchTransfers();
        }
    }, [isOpen, fetchTransfers]);

    if (!isOpen) return null;

    const netPoints = totalIn - totalOut;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl bg-gray-900 rounded-lg border border-white/10 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                            <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="font-semibold text-white text-lg">Gameweek {gameweek} Transfers</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="p-12 text-center text-white/60 flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                            Loading transfers...
                        </div>
                    ) : transfers.length === 0 ? (
                        <div className="p-12 text-center text-white/60">No transfers made this gameweek</div>
                    ) : (
                        <div className="p-4 md:p-6">
                            <div className="md:grid md:grid-cols-[1fr,auto,1fr] md:gap-0">
                                {/* Headers - Desktop Only */}
                                <div className="hidden md:block text-center pb-4 border-b border-white/10">
                                    <div className="text-xs text-red-400 uppercase tracking-widest font-bold">
                                        Transferred Out
                                    </div>
                                </div>

                                {/* Spacer for divider - Desktop Only */}
                                <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent mx-6 mb-4" />

                                <div className="hidden md:block text-center pb-4 border-b border-white/10">
                                    <div className="text-xs text-green-400 uppercase tracking-widest font-bold">
                                        Transferred In
                                    </div>
                                </div>

                                {/* Transfers List */}
                                <div className="space-y-6 md:space-y-4 py-2 md:py-4 md:col-span-3">
                                    {transfers.map((transfer, index) => (
                                        <div key={index} className="flex flex-col md:grid md:grid-cols-[1fr,auto,1fr] gap-0 items-center group bg-white/5 md:bg-transparent rounded-xl md:rounded-none p-1 md:p-0 border border-white/5 md:border-none">

                                            {/* Mobile Label: Out */}
                                            <div className="md:hidden w-full text-center py-1">
                                                <span className="text-xs text-red-400 uppercase tracking-widest font-bold">Out</span>
                                            </div>

                                            {/* Player Out */}
                                            <div className="w-full md:w-auto bg-gradient-to-r from-red-500/10 to-transparent md:from-red-500/5 rounded-t-lg md:rounded-l-xl md:rounded-tr-none p-3 border border-red-500/10 md:border-r-0 hover:from-red-500/10 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    {transfer.playerOut && (
                                                        <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                                                            <KitImage player={transfer.playerOut} className="w-8 h-8 object-contain opacity-80" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium text-white text-sm truncate">
                                                            {transfer.playerOut?.name || "Unknown"}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-white/40 uppercase tracking-wide">Points</span>
                                                            <span className="text-sm font-bold text-red-400">
                                                                {transfer.playerOutPoints}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Divider Icon */}
                                            <div className="flex flex-row md:flex-col items-center justify-center py-2 md:py-0 px-4 self-stretch">
                                                <div className="w-full h-px md:w-px md:h-full bg-white/10 mix-blend-overlay" />
                                                <div className="bg-gray-800 border border-white/10 rounded-full p-1.5 z-10 -mx-3 md:-my-3 md:rotate-0 rotate-90">
                                                    <ArrowRightLeft className="w-3 h-3 text-white/20" />
                                                </div>
                                                <div className="w-full h-px md:w-px md:h-full bg-white/10 mix-blend-overlay" />
                                            </div>

                                            {/* Mobile Label: In */}
                                            <div className="md:hidden w-full text-center py-1">
                                                <span className="text-xs text-green-400 uppercase tracking-widest font-bold">In</span>
                                            </div>

                                            {/* Player In */}
                                            <div className="w-full md:w-auto bg-gradient-to-l from-green-500/10 to-transparent md:from-green-500/5 rounded-b-lg md:rounded-r-xl md:rounded-bl-none p-3 border border-green-500/10 md:border-l-0 hover:from-green-500/10 transition-colors md:text-right">
                                                <div className="flex items-center md:justify-end gap-3">
                                                    {/* Mobile: Name Left. Desktop: Name Right */}
                                                    <div className="min-w-0 flex-1 md:order-1 order-2">
                                                        <div className="font-medium text-white text-sm truncate">
                                                            {transfer.playerIn?.name || "Unknown"}
                                                        </div>
                                                        <div className="flex items-center md:justify-end gap-2 mt-0.5">
                                                            <span className="hidden md:inline text-xs text-white/40 uppercase tracking-wide">Points</span>
                                                            <span className="text-sm font-bold text-green-400">
                                                                {transfer.playerInPoints}
                                                            </span>
                                                            <span className="md:hidden text-xs text-white/40 uppercase tracking-wide">Points</span>
                                                        </div>
                                                    </div>
                                                    {/* Mobile: Kit Left. Desktop: Kit Right */}
                                                    {transfer.playerIn && (
                                                        <div className="shrink-0 w-10 h-10 flex items-center justify-center md:order-2 order-1">
                                                            <KitImage player={transfer.playerIn} className="w-8 h-8 object-contain opacity-80" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-t border-white/10">
                    <div className="flex items-center justify-around gap-4 text-center">
                        <div>
                            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Out Total</div>
                            <div className="text-xl font-bold text-red-400">{totalOut}</div>
                        </div>
                        <div className="w-px h-8 bg-white/5" />
                        <div>
                            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">In Total</div>
                            <div className="text-xl font-bold text-green-400">{totalIn}</div>
                        </div>
                        <div className="w-px h-8 bg-white/5" />
                        <div>
                            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Net Gain</div>
                            <div className={`text-xl font-bold flex items-center justify-center gap-1.5 ${netPoints > 0 ? "text-green-400" : netPoints < 0 ? "text-red-400" : "text-white/60"
                                }`}>
                                {netPoints > 0 ? (
                                    <TrendingUp className="w-4 h-4" />
                                ) : netPoints < 0 ? (
                                    <TrendingDown className="w-4 h-4" />
                                ) : (
                                    <Minus className="w-4 h-4" />
                                )}
                                {netPoints > 0 ? "+" : ""}{netPoints}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
