const request = require("supertest");
const app = require("../app");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const { User } = require("../src/models/User");
const { Team } = require("../src/models/Team");
const { File } = require("../src/models/File");

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

describe("POST /team/:teamName/createfolder/:userId", () => {
  it("should create a new folder", async () => {
    const user = new User({
      _id: "660eeb8d6f3e7052d2458501",
      email: "test1@example.com",
      nickname: "TestUser1",
    });
    await user.save();

    const team = new Team({
      name: "team1",
      members: [{ user: user._id, role: "팀장" }],
      ownedFolders: [],
    });
    await team.save();

    const response = await request(app)
      .post("/team/team1/createfolder/660eeb8d6f3e7052d2458501")
      .send({ folderName: "New Folder" });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty(
      "message",
      "Folder created successfully",
    );
    expect(response.body).toHaveProperty("updatedUser");
  });

  it("should not create a new folder if team does not have user", async () => {
    const user = new User({
      _id: "660eeb8d6f3e7052d2458502",
      email: "test2@example.com",
      nickname: "TestUser2",
    });
    await user.save();

    const team = new Team({
      name: "team1",
      members: [],
      ownedFolders: [],
    });
    await team.save();

    const response = await request(app)
      .post("/team/team1/createfolder/660eeb8d6f3e7052d2458502")
      .send({ folderName: "New Folder" });

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty(
      "message",
      "유저가 해당 팀에 속해 있지 않습니다.",
    );
  });

  it("should not create a new folder if user does not have permission", async () => {
    const user = new User({
      _id: "660eeb8d6f3e7052d2458503",
      email: "test3@example.com",
      nickname: "TestUser3",
    });
    await user.save();

    const team = new Team({
      name: "team2",
      members: [],
      ownedFolders: [],
    });

    team.members.push({ user: user._id, role: "수습" });
    await team.save();

    const response = await request(app)
      .post("/team/team2/createfolder/660eeb8d6f3e7052d2458503")
      .send({ folderName: "New Folder" });

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty(
      "message",
      "폴더를 생성할 권한이 없습니다.",
    );
  });
});

describe("GET /team/:teamId/file/:fileId", () => {
  it("should not return a file if user does not have appropriate role", async () => {
    const user = new User({
      _id: "660eeb8d6f3e7052d2458508",
      email: "test5@example.com",
      nickname: "TestUser5",
    });
    await user.save();

    const team = new Team({
      name: "team1",
      members: [{ user: user._id, role: "팀원" }],
      ownedFolders: [],
    });
    await team.save();

    const file = new File({
      _id: "123456789012345678901235",
      name: "test-file.png",
      s3Key: "test-file.png",
      visibleTo: "팀장",
      filePath: "/path/to/file",
      uploadUser: user._id,
      ownerTeam: team._id,
    });
    await file.save();

    const response = await request(app)
      .get("/team/team1/file/123456789012345678901235")
      .query({ currentUserRole: "팀원" });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty(
      "message",
      "당신은 해당 파일을 다운 받을 권한이 없습니다.",
    );
  });

  it("should return 404 if file not found", async () => {
    const response = await request(app)
      .get("/team/team1/file/123456789012345678901234")
      .query({ currentUserRole: "팀원" });

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty("error", "File not found");
  });
});

describe("POST /team/:teamName/new/:userId", () => {
  beforeEach(async () => {
    await Team.deleteMany({});
    await User.deleteMany({});
  });

  it("should return 400 if team name length is less than 3 characters", async () => {
    const response = await request(app).post("/team/te/new/123").send();

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Team name should be between 3 and 10 characters",
    });
  });

  it("should return 400 if team name length is greater than 10 characters", async () => {
    const response = await request(app)
      .post("/team/team1234567890/new/123")
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Team name should be between 3 and 10 characters",
    });
  });

  it("should return 400 if team name contains special characters", async () => {
    const response = await request(app).post("/team/team$/new/123").send();

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Team name cannot contain special characters",
    });
  });

  it("should return 400 if team name already exists", async () => {
    const user = new User({
      _id: "660eeb8d6f3e7052d2458503",
      email: "test@example.com",
      nickname: "TestUser",
    });
    await user.save();

    const team = new Team({
      name: "team1",
      members: [{ user: user._id, role: "팀장" }],
    });
    await team.save();

    const response = await request(app)
      .post("/team/team1/new/660eeb8d6f3e7052d2458503")
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Failed to create team. Same team name issue",
    });
  });

  it("should create a new team and return 201 if all conditions are met", async () => {
    const user = new User({
      _id: "660eeb8d6f3e7052d2458503",
      email: "test@example.com",
      nickname: "TestUser",
    });
    await user.save();

    const response = await request(app)
      .post("/team/newTeam/new/660eeb8d6f3e7052d2458503")
      .send();

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Team created successfully");
    expect(response.body.updatedUser).toBeDefined();
  });
});

describe("PATCH /team/:selectedMemberId/manageteam/", () => {
  beforeEach(async () => {
    await Team.deleteMany({});
    await User.deleteMany({});
  });

  it("should change member's role successfully if current user is team leader", async () => {
    const user = new User({
      _id: "660eeb8d6f3e7052d2458503",
      email: "test@example.com",
      nickname: "TestUser",
      teams: [],
    });
    await user.save();

    const team = new Team({
      name: "team1",
      members: [{ user: user._id, role: "팀장" }],
      leader: user._id,
    });
    await team.save();

    user.teams.push(team._id);
    await user.save();

    const selectedMemberId = "660eeb8d6f3e7052d2458504";

    const response = await request(app)
      .patch(`/team/${selectedMemberId}/manageteam/`)
      .send({
        currentUserRole: "팀장",
        selectedRole: "팀원",
        teamId: team._id.toString(),
        userId: user._id,
      });

    expect(response.status).toBe(403);
  });

  it("should return 403 if current user is not team leader", async () => {
    const user = new User({
      _id: "660eeb8d6f3e7052d2458503",
      email: "test@example.com",
      nickname: "TestUser",
    });
    await user.save();

    const team = new Team({
      name: "team1",
      members: [{ user: user._id, role: "팀원" }],
    });
    await team.save();

    const selectedMemberId = "660eeb8d6f3e7052d2458504";

    const response = await request(app)
      .patch(`/team/${selectedMemberId}/manageteam/`)
      .send({
        currentUserRole: "팀원",
        selectedRole: "팀장",
        teamId: team._id,
        userId: user._id,
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("당신은 팀 관리 권한이 없습니다");
  });
});

describe("DELETE /team/:teamId/withdraw/:userId", () => {
  it("should withdraw user from team and update user's teams and team's members", async () => {
    const user = new User({
      email: "test141414@example.com",
      nickname: "TestUser",
    });
    await user.save();

    const team = await Team.create({
      name: "Test Team",
    });

    team.members.push({ user: user._id });
    await team.save();

    const response = await request(app)
      .delete(`/team/${team._id}/withdraw/${user._id}`)
      .send({ currentUserRole: "팀원" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(`팀 ${team.name}에서 탈퇴 되었습니다.`);

    const updatedUser = await User.findById(user._id);
    const updatedTeam = await Team.findById(team._id);

    expect(updatedUser.teams).not.toContain(team._id);
    expect(
      updatedTeam.members.some((member) => member.user.equals(user._id)),
    ).toBe(false);
  });

  it("should return 404 if user or team not found", async () => {
    const userId = "660eeb8d6f3e7052d2458577";
    const teamId = "660eeb8d6f3e7052d2458599";
    const response = await request(app)
      .delete(`/team/${teamId}/withdraw/${userId}`)
      .send({ currentUserRole: "팀원" });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("User not found");
  });
});

describe("PATCH /team/:teamName/joinrequest/:userId", () => {
  beforeEach(async () => {
    await Team.deleteMany({});
    await User.deleteMany({});
  });

  it("should return 404 if team not found", async () => {
    const teamName = "nonexistent_team";
    const userId = "660eeb8d6f3e7052d2458501";

    const user = new User({
      _id: userId,
      email: "test@example.com",
      nickname: "TestUser",
    });
    await user.save();

    const response = await request(app)
      .patch(`/team/${teamName}/joinrequest/${userId}`)
      .send({ action: "가입요청", requestUserId: "request_user_id" });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Team not found");
  });

  it("should return 412 if user is already a member", async () => {
    const teamName = "team1";
    const userId = "660eeb8d6f3e7052d2458501";

    const user = new User({
      _id: userId,
      email: "test@example.com",
      nickname: "TestUser",
    });
    await user.save();

    const team = new Team({
      name: teamName,
      members: [{ user: userId, role: "팀원" }],
    });
    await team.save();

    const response = await request(app)
      .patch(`/team/${teamName}/joinrequest/${userId}`)
      .send({ action: "가입요청", requestUserId: "request_user_id" });

    expect(response.status).toBe(412);
    expect(response.body.message).toBe("User is already a member");
  });

  it("should return 412 if user already has a pending request", async () => {
    const teamName = "team1";
    const userId = "660eeb8d6f3e7052d2458501";

    const user = new User({
      _id: userId,
      email: "test@example.com",
      nickname: "TestUser",
    });
    await user.save();

    const team = new Team({
      name: teamName,
      joinRequests: [{ user: userId }],
    });
    await team.save();

    const response = await request(app)
      .patch(`/team/${teamName}/joinrequest/${userId}`)
      .send({ action: "가입요청", requestUserId: "request_user_id" });

    expect(response.status).toBe(412);
    expect(response.body.message).toBe("User is already has a pending request");
  });
});
