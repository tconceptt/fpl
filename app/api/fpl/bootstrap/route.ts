import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error('Failed to fetch bootstrap data')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching bootstrap data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch FPL data' },
      { status: 500 }
    )
  }
} 