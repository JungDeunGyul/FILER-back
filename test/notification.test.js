const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { File } = require("../src/models/File");
const { Folder } = require("../src/models/Folder");
const { Team } = require("../src/models/Team");
const { User } = require("../src/models/User");
const { TrashBin } = require("../src/models/TrashBin");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("PATCH /notification/:notificationId", () => {
  it("should return 404 if user or notification not found", async () => {
    const response = await request(app)
      .patch("/notification/123456789012345678901234")
      .send();

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("User or notification not found");
  });
});
