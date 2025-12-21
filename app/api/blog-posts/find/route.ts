import { NextResponse } from "next/server"

/**
 * GET blog post by ID from RSS feeds
 * This endpoint searches through RSS feeds to find a specific article by ID
 */
export async function GET(
  request: Request,
) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID parameter is required" }, { status: 400 })
    }

    // Fetch with a large page size to find the article
    const response = await fetch(`${new URL(request.url).origin}/api/blog-posts?pageSize=500`)
    
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500 })
    }

    const data = await response.json()
    const article = data.articles?.find((a: any) => a.id === id)

    if (!article) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
    }

    return NextResponse.json(article)
  } catch (error) {
    console.error("Error finding blog post:", error)
    return NextResponse.json(
      { error: "Failed to find blog post" },
      { status: 500 }
    )
  }
}

