const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

async function mongooseLoader() {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB 연결 성공!");
  } catch (error) {
    console.error(error);
  }
}

module.exports = mongooseLoader;
