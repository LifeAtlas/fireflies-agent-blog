import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }

    // Test the API key by making a simple request to Fireflies
    const testQuery = `
      query {
        transcripts(limit: 1) {
          id
        }
      }
    `

    const response = await fetch("https://api.fireflies.ai/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: testQuery,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    const data = await response.json()

    if (data.errors) {
      return NextResponse.json({ error: "Invalid API key or insufficient permissions" }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
