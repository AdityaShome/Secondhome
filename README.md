# 🏠 Second Home - Student Accommodation Platform

A comprehensive web platform connecting students with PG (Paying Guest) accommodations, flats, and mess services. Built with Next.js 15, MongoDB, and AI-powered verification.

## 🌐 Live Demo
**Visit the live site:** [https://secondhome-eight.vercel.app](https://secondhome-eight.vercel.app)

## ✨ Features

### 🏘️ Property Listings (PG & Flat)
- **Dynamic Listings** - Browse approved properties with real-time data
- **AI Verification** - Automatic property verification using Google Gemini 2.0 Flash
- **Advanced Search** - Filter by price, location, amenities, gender, and more
- **Favorites System** - Save properties with database persistence
- **Reviews & Ratings** - User reviews with helpful marking system
- **Image Upload** - Multi-image upload with preview
- **Map View** - Interactive map showing property locations

### 🍽️ Mess Service
- **Home Delivery** - Track delivery availability and radius
- **Diet Types** - Pure Veg, Veg & Non-Veg, Jain, Vegan options
- **Meal Types** - Breakfast, Lunch, Dinner, Snacks
- **Cuisine Variety** - North Indian, South Indian, Chinese, etc.
- **Flexible Pricing** - Monthly, daily, and trial day options
- **Amenities** - AC, WiFi, sitting area, and more

### 🤖 AI-Powered Features
- **Property Verification** - AI analyzes property details for legitimacy
- **Auto-Approval** - Properties with high AI scores are auto-approved
- **Smart Suggestions** - AI-powered property description beautification
- **Chatbot** - Interactive AI assistant for user queries

### 👤 User Features
- **Authentication** - Email/Password and Google OAuth
- **User Profiles** - Comprehensive user dashboard
- **Bookings** - Property booking system
- **Notifications** - Real-time notification panel
- **Favorites** - Save and manage favorite properties
- **Reviews** - Rate and review properties

### 🔐 Security & Verification
- **AI Review System** - Gemini 2.0 Flash verification
- **Admin Dashboard** - Manual review and approval system
- **Email Notifications** - Admin alerts for new listings
- **Secure Authentication** - NextAuth with JWT tokens

## 🚀 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful UI components
- **Framer Motion** - Smooth animations

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **MongoDB** - Database with Mongoose ODM
- **NextAuth** - Authentication
- **Nodemailer** - Email notifications

### AI & APIs
- **Google Gemini 2.0 Flash** - AI property verification
- **Cloudinary** - Image upload and storage
- **OpenStreetMap** - Map integration

## 📦 Installation

### Prerequisites
- Node.js 18+ installed
- MongoDB database (local or Atlas)
- Google Cloud account (for AI features)

### 1. Clone the Repository
```bash
git clone https://github.com/student-srijit/Secondhome.git
cd Secondhome
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
# or
yarn install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# NextAuth
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=https://secondhome-eight.vercel.app

# Google AI (Gemini)
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email (Optional - for notifications)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### 4. Generate NextAuth Secret
```bash
openssl rand -base64 32
```

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for local development or visit [https://secondhome-eight.vercel.app](https://secondhome-eight.vercel.app) for the live site.

## 🏗️ Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
Secondhome/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication
│   │   ├── properties/      # Property endpoints
│   │   ├── messes/          # Mess endpoints
│   │   ├── favorites/       # Favorites system
│   │   └── reviews/         # Reviews & ratings
│   ├── listings/            # Property listings pages
│   ├── messes/              # Mess listings pages
│   ├── list-property/       # List property form
│   ├── list-mess/           # List mess form
│   └── ...
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   └── ...
├── models/                  # MongoDB models
│   ├── property.ts
│   ├── mess.ts
│   ├── user.ts
│   ├── favorite.ts
│   └── ...
├── lib/                     # Utilities
│   ├── mongodb.ts           # Database connection
│   └── auth-options.ts      # Auth configuration
└── public/                  # Static assets
```

## 🗄️ Database Models

### Property
- PG and Flat listings
- Location, pricing, amenities
- AI verification status
- Images, reviews, ratings

### Mess
- Meal service providers
- Diet types, cuisine types
- Home delivery options
- Pricing, amenities, capacity

### User
- Authentication credentials
- Role (student, owner, admin)
- Profile information

### Favorite
- User-specific favorites
- Property associations

### Review
- Property/Mess reviews
- Ratings and comments
- Helpful marking system

## 🎨 Features in Detail

### Property Listing Form
7-step form with validation:
1. Property Type (PG/Flat)
2. Basic Information
3. Location Details
4. Property Details
5. Amenities
6. Rooms & Pricing
7. Photos & Videos

### Mess Listing Form
7-step form with validation:
1. Basic Information
2. Location Details
3. Pricing & Delivery
4. Meals & Menu
5. Photos
6. Contact Details
7. Preview & Submit

### AI Verification
- Analyzes property legitimacy
- Calculates confidence score
- Identifies red flags
- Auto-approves high-scoring properties
- Sends admin notifications for manual review

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Environment variable protection
- Input validation and sanitization
- CORS protection
- Rate limiting ready

## 📄 License

This project is created by Srijit.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For any queries, reach out to: srijitd248@gmail.com

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- shadcn for the beautiful UI components
- Google for Gemini AI API
- MongoDB for the database
- Vercel for hosting capabilities

---

**Built with ❤️ by Srijit**

