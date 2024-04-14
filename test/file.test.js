const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { File } = require("../src/models/File");
const { Folder } = require("../src/models/Folder");
const { Team } = require("../src/models/Team");
const { User } = require("../src/models/User");
const sinon = require("sinon");
const s3Uploader = require("../src/middleware/s3Uploader");

sinon.stub(s3Uploader, "single").callsFake((fieldName) => {
  return async (req, res, next) => {
    req.file = {
      originalname: "test_file.jpg",
      size: 1024,
      mimetype: "image/jpeg",
      location: "https://example.com/uploads/test_file.jpg",
      key: "123uploads/test_file.jpg",
    };
    next();
  };
});

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

describe("PATCH /file/:fileId/move-to-folder/:folderId", () => {
  it("should move file to the specified folder", async () => {
    const user = await User.create({
      email: "test@example.com",
      nickname: "Test User",
      photoURL: "https://example.com/photo.jpg",
    });

    const team = await Team.create({
      name: "Test Team",
    });

    const sourceFolder = await Folder.create({
      name: "Source Folder",
      ownerTeam: team._id,
    });

    const destinationFolder = await Folder.create({
      name: "Destination Folder",
      ownerTeam: team._id,
    });

    const file = await File.create({
      name: "testfile.txt",
      size: 1024,
      type: "text/plain",
      filePath: "test Path",
      ownerTeam: team._id,
      uploadUser: user._id,
    });

    sourceFolder.files.push(file);
    await sourceFolder.save();

    const response = await request(app)
      .patch(`/file/${file._id}/move-to-folder/${destinationFolder._id}`)
      .send({ userId: user._id, currentUserRole: "팀원" });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("File moved to folder successfully");

    const updatedSourceFolder = await Folder.findById(sourceFolder._id);
    expect(updatedSourceFolder.files).not.toEqual(file._id);

    const updatedDestinationFolder = await Folder.findById(
      destinationFolder._id,
    ).populate("files");
    expect(updatedDestinationFolder.files.map((f) => f._id)).toEqual([
      file._id,
    ]);

    const updatedTeam = await Team.findById(team._id);
    expect(updatedTeam.ownedFiles).not.toContain(file._id);

    const updatedUser = await User.findById(user._id).populate("teams");
    expect(updatedUser).toBeTruthy();
    expect(updatedUser.teams.length).toEqual(0);
  });
});

describe("PATCH /file/permission/:fileId", () => {
  it("should successfully change file permission if user is team leader", async () => {
    const user = await User.create({
      email: "test@email.com",
      nickname: "test_user",
      role: "팀장",
    });

    const team = await Team.create({
      name: "Test Team",
    });

    const file = await File.create({
      name: "testfile.txt",
      size: 1024,
      type: "text/plain",
      filePath: "test Path",
      ownerTeam: team._id,
      uploadUser: user._id,
    });

    const requestBody = {
      currentUserRole: "팀장",
      selectedRole: "팀원",
      userId: user._id,
    };

    const response = await request(app)
      .patch(`/file/permission/${file._id}`)
      .send(requestBody);

    expect(response.status).toBe(201);

    expect(response.body.message).toBe("파일 권한이 성공적으로 변경되었습니다");

    expect(response.body.user).toBeDefined();

    const updatedFile = await File.findById(file._id);
    expect(updatedFile.visibleTo).toBe("팀원");
  });

  it("should return 403 if current user is not team leader", async () => {
    const user = await User.create({
      email: "test2@email.com",
      nickname: "test_user",
    });

    const team = await Team.create({
      name: "Test Team",
    });

    const file = await File.create({
      name: "testfile.txt",
      size: 1024,
      type: "text/plain",
      filePath: "test Path",
      ownerTeam: team._id,
      uploadUser: user._id,
    });

    const requestBody = {
      currentUserRole: "팀원",
      selectedRole: "팀원",
      userId: user._id,
    };

    const response = await request(app)
      .patch(`/file/permission/${file._id}`)
      .send(requestBody);

    expect(response.status).toBe(403);

    expect(response.body.message).toBe(
      "당신은 권한 설정에 대한 권한이 없습니다",
    );
  });
});
