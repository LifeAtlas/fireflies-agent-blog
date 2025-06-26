"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  Clock,
  Users,
  FileText,
  LogOut,
  Loader2,
  Download,
  Globe,
  CheckCircle,
  Share2,
  Twitter,
  Linkedin,
  AlertTriangle,
  Trash2,
} from "lucide-react"
import { ThemeCustomizer } from "@/components/theme-customizer"
import { ThemeToggle } from "@/components/theme-toggle"

interface Meeting {
  id: string
  title: string
  dateString: string
  transcript_url: string
  audio_url: string
  video_url: string
  sentences: Array<{
    raw_text: string
    speaker_name: string
    speaker_id: number
  }>
}

interface ProcessedMeeting {
  meeting_title: string
  meeting_time: string
  meeting_id: string
  summary: any
  blog_post?: string
  wordpress_post_id?: number
  wordpress_status?: string
  social_posts?: {
    twitter?: { id: string; status: string }
    linkedin?: { id: string; status: string }
  }
}

interface SocialCredentials {
  twitter: {
    apiKey: string
    apiSecret: string
    accessToken: string
    accessTokenSecret: string
  }
  linkedin: {
    clientId: string
    clientSecret: string
    accessToken: string
  }
}

interface DeleteTarget {
  type: "wordpress" | "twitter" | "linkedin"
  meeting: ProcessedMeeting
  postId: string
}

export default function Dashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [posting, setPosting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState("")
  const [fromTime, setFromTime] = useState("00:00")
  const [toDate, setToDate] = useState("")
  const [toTime, setToTime] = useState("23:59")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [processedMeetings, setProcessedMeetings] = useState<ProcessedMeeting[]>([])

  // WordPress credentials
  const [wpCredentials, setWpCredentials] = useState({
    url: "",
    username: "",
    password: "",
  })

  // Social media credentials
  const [socialCredentials, setSocialCredentials] = useState<SocialCredentials>({
    twitter: {
      apiKey: "",
      apiSecret: "",
      accessToken: "",
      accessTokenSecret: "",
    },
    linkedin: {
      clientId: "",
      clientSecret: "",
      accessToken: "",
    },
  })

  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<ProcessedMeeting | null>(null)
  const [publishPlatforms, setPublishPlatforms] = useState({
    wordpress: false,
    twitter: false,
    linkedin: false,
  })

  // WordPress specific settings
  const [postStatus, setPostStatus] = useState<"publish" | "draft" | "future">("publish")
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")

  // Social media content
  const [twitterContent, setTwitterContent] = useState("")
  const [linkedinContent, setLinkedinContent] = useState("")

  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const apiKey = sessionStorage.getItem("fireflies_api_key")
    if (!apiKey) {
      router.push("/")
    }

    // Set default date range (last 7 days)
    const today = new Date()
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    setToDate(today.toISOString().split("T")[0])
    setFromDate(lastWeek.toISOString().split("T")[0])

    // Load credentials from localStorage
    const savedWpCredentials = localStorage.getItem("wp_credentials")
    if (savedWpCredentials) {
      setWpCredentials(JSON.parse(savedWpCredentials))
    }

    const savedSocialCredentials = localStorage.getItem("social_credentials")
    if (savedSocialCredentials) {
      setSocialCredentials(JSON.parse(savedSocialCredentials))
    }
  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem("fireflies_api_key")
    localStorage.removeItem("wp_credentials")
    localStorage.removeItem("social_credentials")
    router.push("/")
  }

  const fetchMeetings = async () => {
    if (!fromDate || !toDate) {
      setError("Please select both from and to dates")
      return
    }

    setLoading(true)
    setError("")

    try {
      const apiKey = sessionStorage.getItem("fireflies_api_key")

      // Combine date and time for precise filtering
      const fromDateTime = `${fromDate}T${fromTime}:00`
      const toDateTime = `${toDate}T${toTime}:00`

      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          fromDate: fromDateTime,
          toDate: toDateTime,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMeetings(data.meetings || [])
      } else {
        const data = await response.json()
        setError(data.error || "Failed to fetch meetings")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const processMeeting = async (meeting: Meeting) => {
    setProcessing(meeting.id)
    setError("")

    try {
      const apiKey = sessionStorage.getItem("fireflies_api_key")
      const response = await fetch("/api/process-meeting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          meetingId: meeting.id,
          meetingData: meeting,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProcessedMeetings((prev) => [...prev, data])
      } else {
        const data = await response.json()
        setError(data.error || "Failed to process meeting")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setProcessing(null)
    }
  }

  const downloadBlogPost = (meeting: ProcessedMeeting) => {
    const content = meeting.blog_post || ""

    const element = document.createElement("a")
    const file = new Blob([content], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `${meeting.meeting_title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_blog_post.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const openPublishDialog = (meeting: ProcessedMeeting) => {
    setSelectedMeeting(meeting)
    setShowPublishDialog(true)
    setError("")
    setSuccess("")

    // Set default schedule time to current time + 1 hour
    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
    setScheduleDate(oneHourLater.toISOString().split("T")[0])
    setScheduleTime(oneHourLater.toTimeString().slice(0, 5))

    // Generate default social media content
    const summary = meeting.summary?.overview || meeting.summary?.gist || ""
    const shortSummary = summary.substring(0, 200) + (summary.length > 200 ? "..." : "")

    setTwitterContent(
      `Just finished analyzing our latest meeting: "${meeting.meeting_title}"\n\n${shortSummary}\n\n#Meeting #AI #Productivity`,
    )
    setLinkedinContent(
      `📊 Meeting Insights: ${meeting.meeting_title}\n\n${shortSummary}\n\nKey takeaways from our AI-powered meeting analysis. What strategies are you using to make your meetings more productive?\n\n#MeetingProductivity #AI #BusinessInsights`,
    )
  }

  const openDeleteDialog = (type: "wordpress" | "twitter" | "linkedin", meeting: ProcessedMeeting) => {
    let postId = ""

    if (type === "wordpress" && meeting.wordpress_post_id) {
      postId = meeting.wordpress_post_id.toString()
    } else if (type === "twitter" && meeting.social_posts?.twitter?.id) {
      postId = meeting.social_posts.twitter.id
    } else if (type === "linkedin" && meeting.social_posts?.linkedin?.id) {
      postId = meeting.social_posts.linkedin.id
    }

    if (!postId) {
      setError(`No ${type} post found to delete`)
      return
    }

    setDeleteTarget({ type, meeting, postId })
    setShowDeleteDialog(true)
    setError("")
    setSuccess("")
  }

  const saveCredentials = () => {
    localStorage.setItem("wp_credentials", JSON.stringify(wpCredentials))
    localStorage.setItem("social_credentials", JSON.stringify(socialCredentials))
  }

  const validateWordPressUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === "http:" || urlObj.protocol === "https:"
    } catch {
      return false
    }
  }

  const deletePost = async () => {
    if (!deleteTarget) return

    setDeleting(deleteTarget.postId)
    setError("")
    setSuccess("")

    try {
      let response
      let successMessage = ""

      if (deleteTarget.type === "wordpress") {
        response = await fetch("/api/wordpress/delete", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            wpUrl: wpCredentials.url,
            wpUsername: wpCredentials.username,
            wpPassword: wpCredentials.password,
            postId: deleteTarget.postId,
          }),
        })
        successMessage = "WordPress post deleted successfully"
      } else if (deleteTarget.type === "twitter") {
        response = await fetch("/api/social/twitter/delete", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tweetId: deleteTarget.postId,
            credentials: socialCredentials.twitter,
          }),
        })
        successMessage = "Twitter post deleted successfully"
      } else if (deleteTarget.type === "linkedin") {
        response = await fetch("/api/social/linkedin/delete", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postId: deleteTarget.postId,
            credentials: socialCredentials.linkedin,
          }),
        })
        successMessage = "LinkedIn post deleted successfully"
      }

      if (response && response.ok) {
        // Update the meeting data to remove the deleted post info
        setProcessedMeetings((prev) =>
          prev.map((meeting) => {
            if (meeting.meeting_id === deleteTarget.meeting.meeting_id) {
              const updatedMeeting = { ...meeting }

              if (deleteTarget.type === "wordpress") {
                delete updatedMeeting.wordpress_post_id
                delete updatedMeeting.wordpress_status
              } else if (deleteTarget.type === "twitter") {
                if (updatedMeeting.social_posts?.twitter) {
                  const { twitter, ...otherPosts } = updatedMeeting.social_posts
                  updatedMeeting.social_posts = Object.keys(otherPosts).length > 0 ? otherPosts : undefined
                }
              } else if (deleteTarget.type === "linkedin") {
                if (updatedMeeting.social_posts?.linkedin) {
                  const { linkedin, ...otherPosts } = updatedMeeting.social_posts
                  updatedMeeting.social_posts = Object.keys(otherPosts).length > 0 ? otherPosts : undefined
                }
              }

              return updatedMeeting
            }
            return meeting
          }),
        )

        setSuccess(successMessage)
        setShowDeleteDialog(false)
        setDeleteTarget(null)

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000)
      } else {
        const errorData = response ? await response.json() : { error: "Network error" }
        setError(errorData.error || "Failed to delete post")
      }
    } catch (err) {
      console.error("Delete error:", err)
      setError("Network error occurred while deleting post")
    } finally {
      setDeleting(null)
    }
  }

  const publishContent = async () => {
    if (!selectedMeeting) return

    setPosting(selectedMeeting.meeting_id)
    setError("")
    setSuccess("")

    const results = []

    try {
      // Publish to WordPress
      if (publishPlatforms.wordpress && wpCredentials.url && wpCredentials.username && wpCredentials.password) {
        try {
          // Validate WordPress URL
          if (!validateWordPressUrl(wpCredentials.url)) {
            results.push("WordPress: Invalid URL format")
          } else {
            let scheduledDate = undefined
            if (postStatus === "future" && scheduleDate && scheduleTime) {
              scheduledDate = `${scheduleDate}T${scheduleTime}:00`
            }

            console.log("Publishing to WordPress:", {
              url: wpCredentials.url,
              username: wpCredentials.username,
              status: postStatus,
              scheduledDate,
            })

            const wpResponse = await fetch("/api/wordpress/post", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                wpUrl: wpCredentials.url,
                wpUsername: wpCredentials.username,
                wpPassword: wpCredentials.password,
                title: selectedMeeting.meeting_title,
                content: selectedMeeting.blog_post,
                status: postStatus,
                scheduledDate,
              }),
            })

            console.log("WordPress response status:", wpResponse.status)

            if (wpResponse.ok) {
              const wpData = await wpResponse.json()
              results.push(`WordPress: ${wpData.message}`)

              // Update meeting with WordPress info
              setProcessedMeetings((prev) =>
                prev.map((meeting) =>
                  meeting.meeting_id === selectedMeeting.meeting_id
                    ? { ...meeting, wordpress_post_id: wpData.id, wordpress_status: wpData.status }
                    : meeting,
                ),
              )
            } else {
              const wpError = await wpResponse.json()
              console.error("WordPress error:", wpError)
              results.push(`WordPress: ${wpError.error}`)
            }
          }
        } catch (err) {
          console.error("WordPress network error:", err)
          results.push("WordPress: Network error - check your site URL and internet connection")
        }
      }

      // Publish to Twitter
      if (publishPlatforms.twitter && twitterContent && socialCredentials.twitter.apiKey) {
        try {
          const twitterResponse = await fetch("/api/social/twitter", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: twitterContent,
              credentials: socialCredentials.twitter,
            }),
          })

          if (twitterResponse.ok) {
            const twitterData = await twitterResponse.json()
            results.push("Twitter: Posted successfully")

            // Update meeting with Twitter info
            setProcessedMeetings((prev) =>
              prev.map((meeting) =>
                meeting.meeting_id === selectedMeeting.meeting_id
                  ? {
                      ...meeting,
                      social_posts: {
                        ...meeting.social_posts,
                        twitter: { id: twitterData.id, status: "posted" },
                      },
                    }
                  : meeting,
              ),
            )
          } else {
            const twitterError = await twitterResponse.json()
            results.push(`Twitter: ${twitterError.error}`)
          }
        } catch (err) {
          results.push("Twitter: Network error")
        }
      }

      // Publish to LinkedIn
      if (publishPlatforms.linkedin && linkedinContent && socialCredentials.linkedin.accessToken) {
        try {
          const linkedinResponse = await fetch("/api/social/linkedin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: linkedinContent,
              credentials: socialCredentials.linkedin,
            }),
          })

          if (linkedinResponse.ok) {
            const linkedinData = await linkedinResponse.json()
            results.push("LinkedIn: Posted successfully")

            // Update meeting with LinkedIn info
            setProcessedMeetings((prev) =>
              prev.map((meeting) =>
                meeting.meeting_id === selectedMeeting.meeting_id
                  ? {
                      ...meeting,
                      social_posts: {
                        ...meeting.social_posts,
                        linkedin: { id: linkedinData.id, status: "posted" },
                      },
                    }
                  : meeting,
              ),
            )
          } else {
            const linkedinError = await linkedinResponse.json()
            results.push(`LinkedIn: ${linkedinError.error}`)
          }
        } catch (err) {
          results.push("LinkedIn: Network error")
        }
      }

      // Save credentials for future use
      saveCredentials()

      // Show results
      if (results.length > 0) {
        const hasErrors = results.some((result) => result.includes("error") || result.includes("Error"))
        if (hasErrors) {
          setError(results.join(" | "))
        } else {
          setSuccess(results.join(" | "))
        }
      } else {
        setError("No platforms selected or configured")
      }

      // Close dialog after a delay if successful
      if (results.length > 0 && !results.some((result) => result.includes("error") || result.includes("Error"))) {
        setTimeout(() => {
          setShowPublishDialog(false)
          setSuccess("")
        }, 3000)
      }
    } catch (err) {
      console.error("Publish error:", err)
      setError("Unexpected error occurred")
    } finally {
      setPosting(null)
    }
  }

  // Helper function to safely get array from potentially non-array data
  const getSafeArray = (data: any): any[] => {
    if (Array.isArray(data)) {
      return data
    }
    return []
  }

  // Helper function to safely get string array
  const getSafeStringArray = (data: any): string[] => {
    if (Array.isArray(data)) {
      return data.filter((item) => typeof item === "string" && item.trim().length > 0)
    }
    return []
  }

  // Helper function to format date and time for display
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Fireflies Dashboard</h1>
              <p className="text-gray-600">Extract and manage your meeting data</p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeCustomizer />
              <ThemeToggle />
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Fetch Meetings</CardTitle>
            <CardDescription>Select a date and time range to fetch meetings from Fireflies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <Label htmlFor="fromDate">From Date</Label>
                <Input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="fromTime">From Time</Label>
                <Input id="fromTime" type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="toDate">To Date</Label>
                <Input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="toTime">To Time</Label>
                <Input id="toTime" type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
              </div>
              <Button onClick={fetchMeetings} disabled={loading} className="h-10">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  "Fetch Meetings"
                )}
              </Button>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              <p>
                <strong>Selected Range:</strong> {fromDate} {fromTime} to {toDate} {toTime}
              </p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Meetings List */}
        {meetings.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Available Meetings ({meetings.length})</CardTitle>
              <CardDescription>Click "Process" to generate AI summary and blog post</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {meetings.map((meeting, index) => {
                  const dateTime = formatDateTime(meeting.dateString)
                  return (
                    <div key={meeting.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{meeting.title}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Calendar className="mr-1 h-4 w-4" />
                              {dateTime.date}
                            </div>
                            <div className="flex items-center">
                              <Clock className="mr-1 h-4 w-4" />
                              {dateTime.time}
                            </div>
                            <div className="flex items-center">
                              <Users className="mr-1 h-4 w-4" />
                              {new Set(getSafeArray(meeting.sentences).map((s) => s.speaker_name)).size} speakers
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="secondary">{getSafeArray(meeting.sentences).length} sentences</Badge>
                            {meeting.audio_url && <Badge variant="outline">Audio Available</Badge>}
                            {meeting.video_url && <Badge variant="outline">Video Available</Badge>}
                          </div>
                        </div>
                        <Button
                          onClick={() => processMeeting(meeting)}
                          disabled={processing === meeting.id}
                          className="ml-4"
                        >
                          {processing === meeting.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <FileText className="mr-2 h-4 w-4" />
                              Process
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processed Meetings */}
        {processedMeetings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Processed Meetings ({processedMeetings.length})</CardTitle>
              <CardDescription>AI-generated summaries and blog posts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {processedMeetings.map((meeting, index) => {
                  const actionItems = getSafeStringArray(meeting.summary?.action_items)
                  const keywords = getSafeStringArray(meeting.summary?.keywords)
                  const dateTime = formatDateTime(meeting.meeting_time)

                  return (
                    <div key={meeting.meeting_id} className="border rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{meeting.meeting_title}</h3>
                          <p className="text-gray-600">
                            {dateTime.date} at {dateTime.time}
                          </p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {meeting.wordpress_post_id && (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline">WordPress: {meeting.wordpress_status}</Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog("wordpress", meeting)}
                                  disabled={deleting === meeting.wordpress_post_id?.toString()}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  {deleting === meeting.wordpress_post_id?.toString() ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                            {meeting.social_posts?.twitter && (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline">
                                  <Twitter className="w-3 h-3 mr-1" />
                                  Twitter: Posted
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog("twitter", meeting)}
                                  disabled={deleting === meeting.social_posts?.twitter?.id}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  {deleting === meeting.social_posts?.twitter?.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                            {meeting.social_posts?.linkedin && (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline">
                                  <Linkedin className="w-3 h-3 mr-1" />
                                  LinkedIn: Posted
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog("linkedin", meeting)}
                                  disabled={deleting === meeting.social_posts?.linkedin?.id}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  {deleting === meeting.social_posts?.linkedin?.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {meeting.blog_post && (
                            <Button variant="outline" onClick={() => downloadBlogPost(meeting)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          )}
                          {meeting.blog_post && (
                            <Button onClick={() => openPublishDialog(meeting)}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Publish
                            </Button>
                          )}
                        </div>
                      </div>

                      {meeting.summary && (
                        <div className="space-y-4">
                          {meeting.summary.overview && (
                            <div>
                              <h4 className="font-medium mb-2">Overview</h4>
                              <p className="text-gray-700 bg-gray-50 p-3 rounded">{meeting.summary.overview}</p>
                            </div>
                          )}

                          {actionItems.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Action Items</h4>
                              <ul className="list-disc list-inside space-y-1 text-gray-700">
                                {actionItems.map((item: string, idx: number) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {keywords.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Keywords</h4>
                              <div className="flex flex-wrap gap-2">
                                {keywords.map((keyword: string, idx: number) => (
                                  <Badge key={idx} variant="secondary">
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {meeting.blog_post && (
                        <>
                          <Separator className="my-4" />
                          <div>
                            <h4 className="font-medium mb-2">Generated Blog Post Preview</h4>
                            <div className="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
                              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                                {meeting.blog_post.substring(0, 500)}
                                {meeting.blog_post.length > 500 && "..."}
                              </pre>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {meetings.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings found</h3>
              <p className="text-gray-600">Select a date and time range, then click "Fetch Meetings" to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Multi-Platform Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publish Content</DialogTitle>
            <DialogDescription>
              Choose platforms and configure settings to publish your content across multiple channels.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="platforms" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
              <TabsTrigger value="wordpress">WordPress</TabsTrigger>
              <TabsTrigger value="twitter">Twitter</TabsTrigger>
              <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
            </TabsList>

            <TabsContent value="platforms" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">Select Publishing Platforms</h4>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="wordpress"
                      checked={publishPlatforms.wordpress}
                      onChange={(e) => setPublishPlatforms({ ...publishPlatforms, wordpress: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="wordpress" className="flex items-center">
                      <Globe className="w-4 h-4 mr-2" />
                      WordPress Blog
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="twitter"
                      checked={publishPlatforms.twitter}
                      onChange={(e) => setPublishPlatforms({ ...publishPlatforms, twitter: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="twitter" className="flex items-center">
                      <Twitter className="w-4 h-4 mr-2" />
                      Twitter/X
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="linkedin"
                      checked={publishPlatforms.linkedin}
                      onChange={(e) => setPublishPlatforms({ ...publishPlatforms, linkedin: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="linkedin" className="flex items-center">
                      <Linkedin className="w-4 h-4 mr-2" />
                      LinkedIn
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="wordpress" className="space-y-4">
              <div className="space-y-4">
                {/* Content Preview */}
                {selectedMeeting && selectedMeeting.blog_post && (
                  <div className="bg-gray-50 p-3 rounded border">
                    <h5 className="font-medium mb-2">Content Preview</h5>
                    <div className="max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-xs text-gray-600">
                        {selectedMeeting.blog_post.substring(0, 300)}
                        {selectedMeeting.blog_post.length > 300 && "..."}
                      </pre>
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <Label htmlFor="wpUrl">WordPress Site URL</Label>
                  <Input
                    id="wpUrl"
                    placeholder="https://yoursite.com"
                    value={wpCredentials.url}
                    onChange={(e) => setWpCredentials({ ...wpCredentials, url: e.target.value })}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Include https:// and make sure your site has the WordPress REST API enabled
                  </p>
                </div>

                <div>
                  <Label htmlFor="wpUsername">Username</Label>
                  <Input
                    id="wpUsername"
                    placeholder="Your WordPress username"
                    value={wpCredentials.username}
                    onChange={(e) => setWpCredentials({ ...wpCredentials, username: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="wpPassword">Application Password</Label>
                  <Input
                    id="wpPassword"
                    type="password"
                    placeholder="WordPress application password"
                    value={wpCredentials.password}
                    onChange={(e) => setWpCredentials({ ...wpCredentials, password: e.target.value })}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Use an Application Password, not your regular login password
                  </p>
                </div>

                <div>
                  <Label htmlFor="postStatus">Post Status</Label>
                  <Select
                    value={postStatus}
                    onValueChange={(value: "publish" | "draft" | "future") => setPostStatus(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publish">Publish Now</SelectItem>
                      <SelectItem value="draft">Save as Draft</SelectItem>
                      <SelectItem value="future">Schedule for Later</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {postStatus === "future" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="scheduleDate">Schedule Date</Label>
                      <Input
                        id="scheduleDate"
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="scheduleTime">Schedule Time</Label>
                      <Input
                        id="scheduleTime"
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {postStatus === "future" && scheduleDate && scheduleTime && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                    <strong>Scheduled for:</strong> {scheduleDate} at {scheduleTime}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="twitter" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="twitterContent">Twitter Post Content</Label>
                  <Textarea
                    id="twitterContent"
                    placeholder="What's happening?"
                    value={twitterContent}
                    onChange={(e) => setTwitterContent(e.target.value)}
                    maxLength={280}
                    rows={4}
                  />
                  <p className="text-sm text-gray-500 mt-1">{twitterContent.length}/280 characters</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h5 className="font-medium">Twitter API Credentials</h5>
                  <div>
                    <Label htmlFor="twitterApiKey">API Key</Label>
                    <Input
                      id="twitterApiKey"
                      type="password"
                      placeholder="Your Twitter API Key"
                      value={socialCredentials.twitter.apiKey}
                      onChange={(e) =>
                        setSocialCredentials({
                          ...socialCredentials,
                          twitter: { ...socialCredentials.twitter, apiKey: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitterApiSecret">API Secret</Label>
                    <Input
                      id="twitterApiSecret"
                      type="password"
                      placeholder="Your Twitter API Secret"
                      value={socialCredentials.twitter.apiSecret}
                      onChange={(e) =>
                        setSocialCredentials({
                          ...socialCredentials,
                          twitter: { ...socialCredentials.twitter, apiSecret: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitterAccessToken">Access Token</Label>
                    <Input
                      id="twitterAccessToken"
                      type="password"
                      placeholder="Your Twitter Access Token"
                      value={socialCredentials.twitter.accessToken}
                      onChange={(e) =>
                        setSocialCredentials({
                          ...socialCredentials,
                          twitter: { ...socialCredentials.twitter, accessToken: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitterAccessTokenSecret">Access Token Secret</Label>
                    <Input
                      id="twitterAccessTokenSecret"
                      type="password"
                      placeholder="Your Twitter Access Token Secret"
                      value={socialCredentials.twitter.accessTokenSecret}
                      onChange={(e) =>
                        setSocialCredentials({
                          ...socialCredentials,
                          twitter: { ...socialCredentials.twitter, accessTokenSecret: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="linkedin" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="linkedinContent">LinkedIn Post Content</Label>
                  <Textarea
                    id="linkedinContent"
                    placeholder="Share your professional update..."
                    value={linkedinContent}
                    onChange={(e) => setLinkedinContent(e.target.value)}
                    rows={6}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <h5 className="font-medium">LinkedIn API Credentials</h5>
                  <div>
                    <Label htmlFor="linkedinClientId">Client ID</Label>
                    <Input
                      id="linkedinClientId"
                      placeholder="Your LinkedIn Client ID"
                      value={socialCredentials.linkedin.clientId}
                      onChange={(e) =>
                        setSocialCredentials({
                          ...socialCredentials,
                          linkedin: { ...socialCredentials.linkedin, clientId: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedinClientSecret">Client Secret</Label>
                    <Input
                      id="linkedinClientSecret"
                      type="password"
                      placeholder="Your LinkedIn Client Secret"
                      value={socialCredentials.linkedin.clientSecret}
                      onChange={(e) =>
                        setSocialCredentials({
                          ...socialCredentials,
                          linkedin: { ...socialCredentials.linkedin, clientSecret: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedinAccessToken">Access Token</Label>
                    <Input
                      id="linkedinAccessToken"
                      type="password"
                      placeholder="Your LinkedIn Access Token"
                      value={socialCredentials.linkedin.accessToken}
                      onChange={(e) =>
                        setSocialCredentials({
                          ...socialCredentials,
                          linkedin: { ...socialCredentials.linkedin, accessToken: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancel
            </Button>
            <Button onClick={publishContent} disabled={posting !== null}>
              {posting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Publish Selected
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post from{" "}
              <strong>
                {deleteTarget?.type === "wordpress" && "WordPress"}
                {deleteTarget?.type === "twitter" && "Twitter/X"}
                {deleteTarget?.type === "linkedin" && "LinkedIn"}
              </strong>
              ? This action cannot be undone.
              {deleteTarget && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <strong>Meeting:</strong> {deleteTarget.meeting.meeting_title}
                  <br />
                  <strong>Post ID:</strong> {deleteTarget.postId}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletePost}
              disabled={deleting !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Post
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
