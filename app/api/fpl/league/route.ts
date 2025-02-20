import { NextResponse } from 'next/server'

// Replace this with your league ID
const LEAGUE_ID = process.env.FPL_LEAGUE_ID

export async function GET() {
  if (!LEAGUE_ID) {
    return NextResponse.json(
      { error: 'League ID not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(
      `https://fantasy.premierleague.com/api/leagues-classic/${LEAGUE_ID}/standings/`,
      {
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch league data')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching league data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch league data' },
      { status: 500 }
    )
  }
} 