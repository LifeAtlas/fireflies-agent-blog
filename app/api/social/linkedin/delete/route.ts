import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const { postId, credentials } = await request.json()

    if (!postId || !credentials?.accessToken) {
      return NextResponse.json({ error: "Post ID and LinkedIn access token are required" }, { status: 400 })
    }

    // LinkedIn API v2 endpoint for deleting posts
    const linkedinApiUrl = `https://api.linkedin.com/v2/ugcPosts/${postId}`

    console.log("Attempting to delete LinkedIn post:", postId)

    const response = await fetch(linkedinApiUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    })

    if (!response.ok) {
      let errorMessage = `LinkedIn API error: ${response.status} ${response.statusText}`

      try {
        const errorData = await response.json()
        console.error("LinkedIn delete API Error:", errorData)
        errorMessage = errorData.message || errorMessage
      } catch (parseError) {
        // If we can't parse the error response, use the status text
        console.error("Error parsing LinkedIn delete error response:", parseError)
      }

      if (response.status === 401) {
        return NextResponse.json({ error: "Invalid LinkedIn access token" }, { status: 401 })
      } else if (response.status === 403) {
        return NextResponse.json({ error: "Insufficient permissions to delete post" }, { status: 403 })
      } else if (response.status === 404) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 })
      } else {
        return NextResponse.json({ error: errorMessage }, { status: response.status })
      }
    }

    // LinkedIn DELETE requests typically return 204 No Content on success
    return NextResponse.json({
      message: "Post deleted successfully from LinkedIn",
      deleted: true,
      postId,
    })
  } catch (error) {
    console.error("LinkedIn delete error:", error)
    return NextResponse.json({ error: "Failed to delete LinkedIn post" }, { status: 500 })
  }
}
