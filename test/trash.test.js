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

describe("PATCH /trash/file/:fileId", () => {
  it("should move file to TrashBin and update team's owned files", async () => {
    const user = await User.create({
      email: "test1@example.com",
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

    const response = await request(app)
      .patch(`/trash/file/${file._id}`)
      .send({ currentUserRole: "팀원", userId: user._id });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("File has been removed");
    expect(response.body.user).toBeDefined();

    const updatedTeam = await Team.findById(team._id).populate("ownedFiles");
    expect(updatedTeam.ownedFiles).not.toContainEqual(file._id);

    const trashBin = await TrashBin.findOne({ ownerTeam: team._id }).populate(
      "files.item",
    );
    expect(trashBin.files.map((f) => f.item._id)).toContainEqual(file._id);
  });

  it("should return 404 if file is not found", async () => {
    const user = await User.create({
      email: "test2@example.com",
      nickname: "Test User",
    });

    const response = await request(app)
      .patch(`/trash/file/123456789102345678192341`)
      .send({ currentUserRole: "팀원", userId: user._id });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("file not found");
  });
});

describe("PATCH /trash/folder/:folderId", () => {
  it("should move folder to TrashBin and update team's owned folders", async () => {
    const user = await User.create({
      email: "test11@example.com",
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

    const response = await request(app)
      .patch(`/trash/folder/${folder._id}`)
      .send({ currentUserRole: "팀원", userId: user._id });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Folder has been removed");
    expect(response.body.user).toBeDefined();

    const updatedTeam = await Team.findById(team._id).populate("ownedFolders");
    expect(updatedTeam.ownedFolders).not.toContainEqual(folder._id);

    if (folder.parentFolder) {
      const updatedParentFolder = await Folder.findById(
        folder.parentFolder.toString(),
      ).populate("subFolders");
      expect(updatedParentFolder.subFolders).not.toContainEqual(folder._id);
    }

    const trashBin = await TrashBin.findOne({ ownerTeam: team._id }).populate(
      "folders.item",
    );
    expect(trashBin.folders.map((f) => f.item._id)).toContainEqual(folder._id);
  });

  it("should return 404 if folder is not found", async () => {
    const user = await User.create({
      email: "test22@example.com",
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

    const response = await request(app)
      .patch(`/trash/folder/123456789102345678192342`)
      .send({ currentUserRole: "팀원", userId: user._id });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("folder not found");
  });
});

describe("GET /trash/:teamId", () => {
  it("should retrieve files and folders from TrashBin for the team", async () => {
    const user = await User.create({
      email: "test144@example.com",
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

    const file = await File.create({
      name: "testfile.txt",
      ownerTeam: team._id,
      visibleTo: "팀원",
      filePath: "test_file_path",
      uploadUser: user._id,
    });

    await TrashBin.create({
      ownerTeam: team._id,
      folders: [{ item: folder._id, itemType: "Folder" }],
      files: [{ item: file._id, itemType: "File" }],
    });

    const response = await request(app).get(`/trash/${team._id}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("TrashBin");
    expect(response.body.trashBin).toBeDefined();
    expect(response.body.trashBin.folders.length).toBe(1);
    expect(response.body.trashBin.files.length).toBe(1);
  });
});

describe("DELETE /file/:fileId/delete", () => {
  it("should delete the file and remove it from TrashBin", async () => {
    const user = await User.create({
      email: "test141@example.com",
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

    const trashBin = await TrashBin.findOneAndUpdate(
      { ownerTeam: team._id },
      { $push: { files: { item: file._id, itemType: "File" } } },
      { new: true, upsert: true },
    );

    const response = await request(app)
      .delete(`/trash/file/${file._id}/delete`)
      .send({ currentUserRole: "팀원" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("File has been removed");
    expect(response.body.trashBin).toBeDefined();

    const updatedTrashBin = await TrashBin.findOne({ ownerTeam: team._id });
    const fileIdsInTrashBin = updatedTrashBin.files.map((f) => f.item._id);
    expect(fileIdsInTrashBin).not.toContain(file._id);
  });
});

describe("DELETE /trash/folder/:folderId/delete", () => {
  it("should delete the folder and remove it from TrashBin", async () => {
    const team = await Team.create({
      name: "Test Team",
    });

    const folder = await Folder.create({
      name: "testfolder",
      ownerTeam: team._id,
      visibleTo: "팀원",
      path: "test_folder_path",
    });

    const trashBin = await TrashBin.findOneAndUpdate(
      { ownerTeam: team._id },
      { $push: { folders: { item: folder._id, itemType: "Folder" } } },
      { new: true, upsert: true },
    );

    const response = await request(app)
      .delete(`/trash/folder/${folder._id}/delete`)
      .send({ currentUserRole: "팀원" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Folder has been removed");
    expect(response.body.trashBin).toBeDefined();

    const updatedTrashBin = await TrashBin.findOne({ ownerTeam: team._id });
    const folderIdsInTrashBin = updatedTrashBin.folders.map((f) => f.item._id);
    expect(folderIdsInTrashBin).not.toContain(folder._id);
  });
});
