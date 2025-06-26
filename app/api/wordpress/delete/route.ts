import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const { wpUrl, wpUsername, wpPassword, postId } = await request.json()

    if (!wpUrl || !wpUsername || !wpPassword || !postId) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Clean up the WordPress URL
    const cleanUrl = wpUrl.replace(/\/$/, "")
    const apiUrl = `${cleanUrl}/wp-json/wp/v2/posts/${postId}`

    // Create credentials for Basic Auth
    const credentials = `${wpUsername}:${wpPassword}`
    const token = Buffer.from(credentials).toString("base64")

    console.log("WordPress delete URL:", apiUrl)

    // Make DELETE request to WordPress REST API
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`,
      },
    })

    console.log("WordPress delete response status:", response.status)

    if (!response.ok) {
      let errorMessage = `WordPress API error: ${response.status} ${response.statusText}`

      try {
        const errorText = await response.text()
        console.log("WordPress delete error response:", errorText)

        if (errorText.trim().startsWith("{") || errorText.trim().startsWith("[")) {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorData.error || errorMessage
        } else {
          errorMessage = errorText || errorMessage
        }
      } catch (parseError) {
        console.error("Error parsing WordPress delete error response:", parseError)
      }

      if (response.status === 401) {
        return NextResponse.json({ error: "Invalid WordPress credentials" }, { status: 401 })
      } else if (response.status === 403) {
        return NextResponse.json({ error: "Insufficient permissions to delete post" }, { status: 403 })
      } else if (response.status === 404) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 })
      } else {
        return NextResponse.json({ error: errorMessage }, { status: response.status })
      }
    }

    // Handle successful response
    let data
    try {
      const responseText = await response.text()
      console.log("WordPress delete success response:", responseText.substring(0, 200))

      if (responseText.trim()) {
        data = JSON.parse(responseText)
      } else {
        data = { deleted: true }
      }
    } catch (parseError) {
      console.error("Error parsing WordPress delete success response:", parseError)
      // If we can't parse the response but got a 200, assume success
      data = { deleted: true }
    }

    return NextResponse.json({
      message: "Post deleted successfully from WordPress",
      deleted: true,
      data,
    })
  } catch (error) {
    console.error("WordPress delete error:", error)

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json({ error: "Network error: Could not connect to WordPress site" }, { status: 500 })
    }

    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
