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

describe("PATCH /restore/file/:fileId", () => {
  it("should move file to TrashBin and update team's owned files", async () => {
    const user = await User.create({
      email: "test@example.com",
      nickname: "Test User",
    });

    const team = await Team.create({
      name: "Test Team",
    });

    const file = await File.create({
      name: "testfile.txt",
      ownerTeam: team._id,
      visibleTo: "팀원",
      filePath: "test_file_path",
      uploadUser: user._id,
    });

    const trashBin = await TrashBin.create({
      ownerTeam: team._id,
    });

    const response = await request(app)
      .patch(`/restore/file/${file._id}`)
      .send({ currentUserRole: "팀원", userId: user._id });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("TrashBin");
    expect(response.body.trashBin).toBeDefined();
    expect(response.body.user).toBeDefined();

    const updatedTeam = await Team.findById(team._id).populate("ownedFiles");
    expect(updatedTeam.ownedFiles).not.toContainEqual(file._id);

    const updatedTrashBin = await TrashBin.findOne({
      ownerTeam: team._id,
    }).populate("files.item");
    expect(updatedTrashBin.files.map((f) => f.item._id)).not.toContainEqual(
      file._id,
    );
  });
});

describe("PATCH restore/folder/:folderId", () => {
  it("should move folder to TrashBin and update team's owned folders", async () => {
    const user = await User.create({
      email: "test12@example.com",
      nickname: "Test User",
    });

    const team = await Team.create({
      name: "Test Team",
    });

    const folder = await Folder.create({
      name: "testfolder",
      ownerTeam: team._id,
      visibleTo: "팀원",
      path: "test_folder_path",
    });

    const trashBin = await TrashBin.create({
      ownerTeam: team._id,
      folders: [{ item: folder._id, itemType: "Folder" }],
    });

    const response = await request(app)
      .patch(`/restore/folder/${folder._id}`)
      .send({ currentUserRole: "팀원", userId: user._id });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("TrashBin");
    expect(response.body.trashBin).toBeDefined();
    expect(response.body.user).toBeDefined();

    const updatedTeam = await Team.findById(team._id).populate("ownedFolders");
    expect(updatedTeam.ownedFolders).not.toContainEqual(folder._id);

    const updatedTrashBin = await TrashBin.findOne({
      ownerTeam: team._id,
    }).populate("folders.item");
    expect(updatedTrashBin.folders.map((f) => f.item._id)).not.toContainEqual(
      folder._id,
    );
  });
});
