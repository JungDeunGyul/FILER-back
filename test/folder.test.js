const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { Folder } = require("../src/models/Folder");
const { Team } = require("../src/models/Team");
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

describe("GET /folder/:folderId", () => {
  it("should return the folder information if it exists and user has access", async () => {
    const team = await Team.create({
      name: "Test Team",
    });

    const folder = await Folder.create({
      name: "testfolder",
      ownerTeam: team._id,
      visibleTo: "팀원",
      path: "test_folder_path",
    });

    const userRole = "팀원";

    const response = await request(app)
      .get(`/folder/${folder._id}`)
      .send({ currentUserRole: userRole });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Folder sent successfully");
    expect(response.body.folder).toBeDefined();
    expect(response.body.folder._id).toBe(folder._id.toString());
  });

  it("should return 404 if folder does not exist", async () => {
    const nonExistentFolderId = "123456789012345678901234";
    const userRole = "팀원";

    const response = await request(app)
      .get(`/folder/${nonExistentFolderId}`)
      .send({ currentUserRole: userRole });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("folder not found");
  });
});

describe("POST /folder/:folderId/new", () => {
  it("should create a new subfolder successfully", async () => {
    const team = await Team.create({
      name: "Test Team",
      ownedFolders: [],
    });

    const folder = await Folder.create({
      name: "testfolder1",
      ownerTeam: team._id,
      visibleTo: "팀원",
      path: "test_folder_path",
    });

    const response = await request(app)
      .post(`/folder/${folder._id}/new`)
      .send({ folderName: "testfolder2", teamName: team.name });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Folder created successfully");
    expect(response.body.folder).toBeDefined();
    expect(response.body.folder.name).toBe("testfolder1");

    const updatedParentFolder = await Folder.findById(folder._id);
    expect(updatedParentFolder.subFolders.length).toBe(1);
  });
});

describe("PATCH /folder/permission/:folderId", () => {
  it("should change folder permission successfully", async () => {
    const user = await User.create({
      email: "test5@example.com",
      nickname: "Test User",
      role: "팀장",
    });

    const team = await Team.create({
      name: "Test Team",
      ownedFolders: [],
    });

    const folder = await Folder.create({
      name: "Test Folder",
      visibleTo: "팀원",
      ownerTeam: team._id,
    });

    const response = await request(app)
      .patch(`/folder/permission/${folder._id}`)
      .send({
        currentUserRole: "팀장",
        selectedRole: "수습",
        userId: user._id,
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("폴더 권한이 성공적으로 변경되었습니다");
    expect(response.body.user).toBeDefined();
  });

  it("should return 403 if user is not a team leader", async () => {
    const user = await User.create({
      email: "test6@example.com",
      nickname: "Test User",
      role: "팀원",
    });

    const team = await Team.create({
      name: "Test Team",
    });

    const folder = await Folder.create({
      name: "Test Folder",
      visibleTo: "팀원",
      ownerTeam: team._id,
    });

    const response = await request(app)
      .patch(`/folder/permission/${folder._id}`)
      .send({
        currentUserRole: "팀원",
        selectedRole: "수습",
        userId: user._id,
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "당신은 권한 설정에 대한 권한이 없습니다",
    );
  });

  it("should return 404 if folder is not found", async () => {
    const user = await User.create({
      email: "test7@example.com",
      nickname: "Test User",
      role: "팀장",
    });

    const nonExistentFolderId = "123456789012345678901234";

    const response = await request(app)
      .patch(`/folder/permission/${nonExistentFolderId}`)
      .send({
        currentUserRole: "팀장",
        selectedRole: "수습",
        userId: user._id,
      });

    expect(response.status).toBe(412);
    expect(response.body.message).toBe("폴더가 존재하지 않습니다");
  });
});
