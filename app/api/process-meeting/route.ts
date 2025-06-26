import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { apiKey, meetingId, meetingData } = await request.json()

    if (!apiKey || !meetingId || !meetingData) {
      return NextResponse.json({ error: "API key, meetingId, and meetingData are required" }, { status: 400 })
    }

    // First, get the meeting summary from Fireflies
    const summaryQuery = `
      query Transcript($transcriptId: String!) {
        transcript(id: $transcriptId) {
          summary {
            keywords
            action_items
            outline
            shorthand_bullet
            overview
            bullet_gist
            gist
            short_summary
          }
        }
      }
    `

    const summaryResponse = await fetch("https://api.fireflies.ai/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: summaryQuery,
        variables: {
          transcriptId: meetingId,
        },
      }),
    })

    if (!summaryResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch meeting summary" }, { status: summaryResponse.status })
    }

    const summaryData = await summaryResponse.json()

    if (summaryData.errors) {
      return NextResponse.json({ error: summaryData.errors[0]?.message || "Failed to get summary" }, { status: 400 })
    }

    const summary = summaryData.data?.transcript?.summary || {}

    // Generate only the original blog post
    const originalBlogPost = generateSimpleBlogPost(meetingData.title, summary)

    return NextResponse.json({
      meeting_title: meetingData.title,
      meeting_time: meetingData.dateString,
      meeting_id: meetingId,
      summary,
      blog_post: originalBlogPost,
    })
  } catch (error) {
    console.error("Process meeting error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateSimpleBlogPost(title: string, summary: any): string {
  const date = new Date().toLocaleDateString()

  let blogPost = `# ${title}\n\n`
  blogPost += `*Published on ${date}*\n\n`

  if (summary?.overview) {
    blogPost += `## Overview\n\n${summary.overview}\n\n`
  }

  // Safe check for action_items - ensure it's an array before using forEach
  if (summary?.action_items && Array.isArray(summary.action_items) && summary.action_items.length > 0) {
    blogPost += `## Key Action Items\n\n`
    summary.action_items.forEach((item: string, index: number) => {
      if (item && typeof item === "string") {
        blogPost += `${index + 1}. ${item}\n`
      }
    })
    blogPost += "\n"
  }

  // Safe check for keywords - ensure it's an array before using join
  if (summary?.keywords && Array.isArray(summary.keywords) && summary.keywords.length > 0) {
    blogPost += `## Key Topics\n\n`
    const validKeywords = summary.keywords.filter((keyword: any) => keyword && typeof keyword === "string")
    if (validKeywords.length > 0) {
      blogPost += `This meeting covered several important topics including: ${validKeywords.join(", ")}.\n\n`
    }
  }

  if (summary?.gist) {
    blogPost += `## Summary\n\n${summary.gist}\n\n`
  }

  blogPost += `---\n\n*This blog post was automatically generated from meeting transcription data.*`

  return blogPost
}
