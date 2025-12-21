import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { BlogPost } from "@/models/blog-post"

/**
 * GET individual blog post by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectToDatabase()

    const post = await BlogPost.findById(id).lean()

    if (!post) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
    }

    if (!post.isPublished) {
      return NextResponse.json({ error: "Blog post not published" }, { status: 404 })
    }

    return NextResponse.json({
      id: post._id.toString(),
      title: post.title,
      excerpt: post.excerpt || post.content?.substring(0, 200) || "",
      image: post.image || "/placeholder.svg?height=400&width=600",
      date: new Date(post.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      author: post.author || "SecondHome",
      category: post.category || "General",
      source: "SecondHome Blog",
      url: `/blog/${post._id}`,
      publishedAt: post.createdAt,
      content: post.content,
    })
  } catch (error) {
    console.error("Error fetching blog post:", error)
    return NextResponse.json(
      { error: "Failed to fetch blog post" },
      { status: 500 }
    )
  }
}

