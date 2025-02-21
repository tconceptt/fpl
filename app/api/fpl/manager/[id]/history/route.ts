import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type Props = {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  props: Props
) {
  const managerId = props.params.id

  try {
    const response = await fetch(
      `https://fantasy.premierleague.com/api/entry/${managerId}/history/`,
      {
        next: { revalidate: 300 },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch manager history')
    }

    const data = await response.json()
    return NextResponse.json({ history: data })
  } catch (error) {
    console.error('Error fetching manager history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manager history' },
      { status: 500 }
    )
  }
} 