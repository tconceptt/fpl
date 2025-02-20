import { NextResponse } from 'next/server'

interface GameweekEvent {
  id: number
  is_current: boolean
  is_next: boolean
  is_previous: boolean
  name: string
  deadline_time: string
  average_entry_score: number
  finished: boolean
  data_checked: boolean
  highest_scoring_entry: number
  deadline_time_epoch: number
  deadline_time_game_offset: number
  highest_score: number
  is_previous_season: boolean
}

export async function GET() {
  try {
    // First get the bootstrap data to determine current gameweek
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
      next: { revalidate: 300 },
    })

    if (!bootstrapResponse.ok) {
      throw new Error('Failed to fetch bootstrap data')
    }

    const bootstrapData = await bootstrapResponse.json()
    
    // Find the current gameweek
    const currentGameweek = bootstrapData.events.find(
      (event: GameweekEvent) => event.is_current
    )?.id

    if (!currentGameweek) {
      throw new Error('Could not determine current gameweek')
    }

    // Fetch live data for the current gameweek
    const gameweekResponse = await fetch(
      `https://fantasy.premierleague.com/api/event/${currentGameweek}/live/`,
      {
        next: { revalidate: 300 },
      }
    )

    if (!gameweekResponse.ok) {
      throw new Error('Failed to fetch gameweek data')
    }

    const gameweekData = await gameweekResponse.json()

    return NextResponse.json({
      currentGameweek,
      ...gameweekData,
    })
  } catch (error) {
    console.error('Error fetching gameweek data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gameweek data' },
      { status: 500 }
    )
  }
} 