import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { content, credentials } = await request.json()

    if (!content || !credentials?.accessToken) {
      return NextResponse.json({ error: "Content and LinkedIn access token are required" }, { status: 400 })
    }

    // LinkedIn API v2 endpoint for creating posts
    const linkedinApiUrl = "https://api.linkedin.com/v2/ugcPosts"

    // Get user profile to get the person URN
    const profileResponse = await fetch("https://api.linkedin.com/v2/people/~", {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!profileResponse.ok) {
      return NextResponse.json({ error: "Invalid LinkedIn access token" }, { status: 401 })
    }

    const profileData = await profileResponse.json()
    const personUrn = profileData.id

    // Create the post
    const postData = {
      author: `urn:li:person:${personUrn}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }

    const response = await fetch(linkedinApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("LinkedIn API Error:", errorData)
      return NextResponse.json(
        {
          error: errorData.message || "Failed to post to LinkedIn",
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({
      id: data.id,
      message: "Posted to LinkedIn successfully",
      url: `https://www.linkedin.com/feed/update/${data.id}`,
    })
  } catch (error) {
    console.error("LinkedIn post error:", error)
    return NextResponse.json({ error: "Failed to post to LinkedIn" }, { status: 500 })
  }
}
