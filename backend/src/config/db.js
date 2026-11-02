import mongoose from "mongoose";

// Connect to MongoDB Atlas.
export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);

    console.log(
      `MongoDB connected successfully: ${connection.connection.host}`,
    );
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};
