import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { apiKey, fromDate, toDate } = await request.json()

    if (!apiKey || !fromDate || !toDate) {
      return NextResponse.json({ error: "API key, fromDate, and toDate are required" }, { status: 400 })
    }

    // Handle both date-only and datetime formats
    let fromDateTime: string
    let toDateTime: string

    if (fromDate.includes("T")) {
      // Already includes time
      fromDateTime = new Date(fromDate).toISOString()
    } else {
      // Date only, add default time
      fromDateTime = new Date(fromDate + "T00:00:00Z").toISOString()
    }

    if (toDate.includes("T")) {
      // Already includes time
      toDateTime = new Date(toDate).toISOString()
    } else {
      // Date only, add default time
      toDateTime = new Date(toDate + "T23:59:59Z").toISOString()
    }

    const query = `
      query Transcripts($limit: Int, $skip: Int, $fromDate: DateTime, $toDate: DateTime) {
        transcripts(limit: $limit, skip: $skip, fromDate: $fromDate, toDate: $toDate) {
          id
          title
          transcript_url
          dateString
          audio_url
          video_url
          sentences {
            raw_text
            speaker_name
            speaker_id
          }
        }
      }
    `

    const variables = {
      limit: 50,
      skip: 0,
      fromDate: fromDateTime,
      toDate: toDateTime,
    }

    const response = await fetch("https://api.fireflies.ai/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch meetings from Fireflies" }, { status: response.status })
    }

    const data = await response.json()

    if (data.errors) {
      return NextResponse.json({ error: data.errors[0]?.message || "GraphQL error" }, { status: 400 })
    }

    return NextResponse.json({
      meetings: data.data?.transcripts || [],
    })
  } catch (error) {
    console.error("Meetings fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
