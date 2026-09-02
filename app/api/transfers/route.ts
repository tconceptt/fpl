import { NextRequest, NextResponse } from 'next/server';
import * as client from '@/lib/fpl/client';
import { cached } from '@/lib/fpl/cache';
import { ttlFor } from '@/lib/fpl/ttl';

interface TransferPlayer {
    id: number;
    name: string;
    team: number;
    teamShortName: string;
    teamCode: number;
    elementType: number;
}

interface TransferDetails {
    playerIn: TransferPlayer | null;
    playerOut: TransferPlayer | null;
    playerInPoints: number;
    playerOutPoints: number;
    event: number;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const gameweek = searchParams.get('gw');

    if (!teamId || !gameweek) {
        return NextResponse.json({ error: 'Missing teamId or gw parameter' }, { status: 400 });
    }

    const entry = Number(teamId);
    const gwNumber = Number(gameweek);

    try {
        const [transfersData, bootstrapData, liveData] = await Promise.all([
            cached(`transfers:${entry}`, ttlFor("transfers", "quiet"), () => client.entryTransfers(entry)),
            cached("bootstrap", ttlFor("bootstrap", "quiet"), () => client.bootstrap()),
            cached(`live:${gwNumber}`, ttlFor("live", "quiet"), () => client.live(gwNumber)),
        ]);

        // Filter transfers for this gameweek
        const gwTransfers = transfersData.filter((t) => t.event === gwNumber);

        // Create player and team maps
        const playersMap = new Map(bootstrapData.elements.map((p) => [p.id, p]));
        const teamsMap = new Map(bootstrapData.teams.map((t) => [t.id, t]));

        // Create live points map
        const liveElements = new Map<number, number>(
            liveData.elements.map((e) => [e.id, e.stats.total_points])
        );

        // Build transfer details with points
        const transfers: TransferDetails[] = gwTransfers.map((t) => {
            const playerIn = playersMap.get(t.element_in);
            const playerOut = playersMap.get(t.element_out);
            const teamIn = playerIn ? teamsMap.get(playerIn.team) : undefined;
            const teamOut = playerOut ? teamsMap.get(playerOut.team) : undefined;
            return {
                playerIn: playerIn ? {
                    id: playerIn.id,
                    name: playerIn.web_name,
                    team: playerIn.team,
                    teamShortName: teamIn?.short_name ?? "",
                    teamCode: teamIn?.code ?? 0,
                    elementType: playerIn.element_type
                } : null,
                playerOut: playerOut ? {
                    id: playerOut.id,
                    name: playerOut.web_name,
                    team: playerOut.team,
                    teamShortName: teamOut?.short_name ?? "",
                    teamCode: teamOut?.code ?? 0,
                    elementType: playerOut.element_type
                } : null,
                playerInPoints: liveElements.get(t.element_in) || 0,
                playerOutPoints: liveElements.get(t.element_out) || 0,
                event: t.event,
            };
        });

        // Calculate totals
        const totalIn = transfers.reduce((sum, t) => sum + t.playerInPoints, 0);
        const totalOut = transfers.reduce((sum, t) => sum + t.playerOutPoints, 0);

        return NextResponse.json({
            transfers,
            totalIn,
            totalOut,
            netPoints: totalIn - totalOut,
        });
    } catch (error) {
        console.error('Error fetching transfers:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch transfers' },
            { status: 500 }
        );
    }
}
