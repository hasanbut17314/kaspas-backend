import multer from "multer";

// Use memory storage instead of disk storage for serverless environments
const storage = multer.memoryStorage();

export const upload = multer({ storage });