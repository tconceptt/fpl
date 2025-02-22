import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const managerId = params.id

  try {
    const [managerInfo, managerHistory] = await Promise.all([
      fetch(`https://fantasy.premierleague.com/api/entry/${managerId}/`, {
        next: { revalidate: 300 },
      }),
      fetch(`https://fantasy.premierleague.com/api/entry/${managerId}/history/`, {
        next: { revalidate: 300 },
      }),
    ])

    if (!managerInfo.ok || !managerHistory.ok) {
      throw new Error('Failed to fetch manager data')
    }

    const [info, history] = await Promise.all([
      managerInfo.json(),
      managerHistory.json(),
    ])

    return NextResponse.json({
      info,
      history,
    })
  } catch (error) {
    console.error('Error fetching manager data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manager data' },
      { status: 500 }
    )
  }
} 