import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

const options: mongoose.ConnectOptions = {
  bufferCommands: false,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4,
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnectionPromise: Promise<typeof mongoose> | null
}

let connectionPromise = global.mongooseConnectionPromise

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  if (connectionPromise) {
    return await connectionPromise
  }

  connectionPromise = mongoose
    .connect(MONGODB_URI, options)
    .then((m) => m)
    .catch((error) => {
      connectionPromise = null
      global.mongooseConnectionPromise = null
      throw error
    })

  global.mongooseConnectionPromise = connectionPromise

  return await connectionPromise
}
