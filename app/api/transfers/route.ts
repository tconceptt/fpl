import { NextRequest, NextResponse } from 'next/server';
import { fplApiRoutes } from '@/lib/routes';

interface FPLTransfer {
    element_in: number;
    element_in_cost: number;
    element_out: number;
    element_out_cost: number;
    entry: number;
    event: number;
    time: string;
}

interface PlayerInfo {
    id: number;
    web_name: string;
    now_cost: number;
    team: number;
    element_type: number;
}

interface TeamInfo {
    id: number;
    short_name: string;
    code: number;
}

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

    try {
        // Fetch all required data in parallel
        const [transfersRes, bootstrapRes, liveRes] = await Promise.all([
            fetch(fplApiRoutes.teamTransfers(teamId), { cache: 'no-store' }),
            fetch(fplApiRoutes.bootstrap, { cache: 'no-store' }),
            fetch(fplApiRoutes.liveStandings(gameweek), { cache: 'no-store' }),
        ]);

        if (!transfersRes.ok) {
            throw new Error(`Failed to fetch transfers: ${transfersRes.status}`);
        }
        if (!bootstrapRes.ok) {
            throw new Error(`Failed to fetch bootstrap: ${bootstrapRes.status}`);
        }
        if (!liveRes.ok) {
            throw new Error(`Failed to fetch live data: ${liveRes.status}`);
        }

        const [transfersData, bootstrapData, liveData] = await Promise.all([
            transfersRes.json(),
            bootstrapRes.json(),
            liveRes.json(),
        ]);

        // Filter transfers for this gameweek
        const gwTransfers: FPLTransfer[] = (transfersData as FPLTransfer[]).filter(
            (t) => t.event === Number(gameweek)
        );

        // Create player and team maps
        const players: PlayerInfo[] = bootstrapData.elements;
        const playersMap = new Map(players.map((p) => [p.id, p]));
        const teams: TeamInfo[] = bootstrapData.teams;
        const teamsMap = new Map(teams.map((t) => [t.id, t]));

        // Create live points map
        const liveElements = new Map<number, number>(
            liveData.elements.map((e: { id: number; stats: { total_points: number } }) => [
                e.id,
                e.stats.total_points,
            ])
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
