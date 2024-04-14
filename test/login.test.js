const request = require("supertest");
const app = require("../app");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const { User } = require("../src/models/User");

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

describe("POST /login", () => {
  it("should create a new user if not exists", async () => {
    const userData = {
      email: "test@example.com",
      nickname: "Test User",
      photoURL: "https://example.com/photo.jpg",
    };

    const response = await request(app)
      .post("/login")
      .send({ user: userData, token: "valid_token_here" });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Create user success");
    expect(response.body.user.email).toBe(userData.email);
    expect(response.body.user.nickname).toBe(userData.nickname);
    expect(response.body.user.iconpath).toBe(userData.photoURL);

    const user = await User.findOne({ email: userData.email });

    expect(user).toBeTruthy();
    expect(user.nickname).toBe(userData.nickname);
  });

  it("should return existing user if already exists", async () => {
    const userData = {
      email: "gyuljung177@gmail.com",
      nickname: "Test User",
      photoURL: "https://example.com/photo.jpg",
    };
    const existingUser = new User(userData);
    await existingUser.save();

    const response = await request(app)
      .post("/login")
      .send({ user: existingUser, token: "valid_token_here" });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(existingUser.email);
    expect(response.body.user.nickname).toBe(existingUser.nickname);
    expect(response.body.user.iconpath).toBe(existingUser.iconpath);
  });

  it("should return 400 if login failed", async () => {
    const response = await request(app).post("/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Login failed");
  });
});
