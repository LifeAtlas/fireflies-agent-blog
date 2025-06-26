import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { wpUrl, wpUsername, wpPassword, title, content, status, scheduledDate } = await request.json()

    if (!wpUrl || !wpUsername || !wpPassword || !title || !content) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Clean up the WordPress URL
    const cleanUrl = wpUrl.replace(/\/$/, "")
    const apiUrl = `${cleanUrl}/wp-json/wp/v2/posts`

    // Create credentials for Basic Auth
    const credentials = `${wpUsername}:${wpPassword}`
    const token = Buffer.from(credentials).toString("base64")

    // Prepare post data
    const postData: any = {
      title: title,
      content: content,
      status: status || "publish",
    }

    // Add scheduled date if provided
    if (status === "future" && scheduledDate) {
      postData.date = scheduledDate
    }

    console.log("WordPress API URL:", apiUrl)
    console.log("Post data:", { ...postData, content: content.substring(0, 100) + "..." })

    // Make request to WordPress REST API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify(postData),
    })

    console.log("WordPress response status:", response.status)
    console.log("WordPress response headers:", Object.fromEntries(response.headers.entries()))

    // Check if response is ok first
    if (!response.ok) {
      let errorMessage = `WordPress API error: ${response.status} ${response.statusText}`

      try {
        const errorText = await response.text()
        console.log("WordPress error response text:", errorText)

        // Try to parse as JSON
        if (errorText.trim().startsWith("{") || errorText.trim().startsWith("[")) {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.error || errorMessage
        } else {
          // Not JSON, use the text directly
          errorMessage = errorText || errorMessage
        }
      } catch (parseError) {
        console.error("Error parsing WordPress error response:", parseError)
      }

      if (response.status === 401) {
        return NextResponse.json({ error: "Invalid WordPress credentials" }, { status: 401 })
      } else if (response.status === 403) {
        return NextResponse.json(
          { error: "Insufficient permissions. Make sure you're using an Application Password." },
          { status: 403 },
        )
      } else if (response.status === 404) {
        return NextResponse.json({ error: "WordPress site not found. Check your site URL." }, { status: 404 })
      } else {
        return NextResponse.json({ error: errorMessage }, { status: response.status })
      }
    }

    // Handle successful response
    let data
    try {
      const responseText = await response.text()
      console.log("WordPress success response text:", responseText.substring(0, 200) + "...")

      if (!responseText.trim()) {
        throw new Error("Empty response from WordPress")
      }

      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Error parsing WordPress success response:", parseError)
      return NextResponse.json(
        { error: "Invalid response from WordPress API. The post may have been created but we couldn't confirm it." },
        { status: 500 },
      )
    }

    return NextResponse.json({
      id: data.id,
      status: data.status,
      link: data.link,
      message: `Post ${status === "publish" ? "published" : status === "draft" ? "saved as draft" : "scheduled"} successfully`,
    })
  } catch (error) {
    console.error("WordPress post error:", error)

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        { error: "Network error: Could not connect to WordPress site. Check your site URL." },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
