import { Schema, model, models, Model } from "mongoose"
import { connectToDatabase } from "@/lib/mongodb"

export interface IBlogPost {
  title: string
  excerpt?: string
  content: string
  image?: string
  author: string
  category: string
  tags?: string[]
  isPublished: boolean
  isTrending?: boolean
  views?: number
  createdAt: Date
  updatedAt: Date
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, trim: true },
    content: { type: String, required: true },
    image: { type: String },
    author: { type: String, default: "SecondHome" },
    category: { 
      type: String, 
      enum: [
        "PG Accommodation",
        "Flats & Apartments",
        "Student Life",
        "Rental Guide",
        "Budget Tips",
        "Location Guide",
        "Tips & Guides",
        "Real Estate",
      ],
      default: "General",
    },
    tags: [{ type: String }],
    isPublished: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
)

// Clear the model cache if it already exists
if (models.BlogPost) {
  delete models.BlogPost
}

export const BlogPost: Model<IBlogPost> = models.BlogPost || model<IBlogPost>("BlogPost", BlogPostSchema)

