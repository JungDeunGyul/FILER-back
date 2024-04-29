const path = require("path");

const { Folder } = require(path.resolve(__dirname, "../Models/Folder"));
const { File } = require(path.resolve(__dirname, "../Models/File"));

async function deleteFolderAndSubFolders(folderId) {
  try {
    const folder = await Folder.findById(folderId.toString());

    if (!folder) {
      throw new Error("폴더를 찾을 수 없습니다.");
    }

    const subFolders = folder.subFolders;

    for (const subFolderId of subFolders) {
      await deleteFolderAndSubFolders(subFolderId);
    }

    for (const fileId of folder.files) {
      const file = await File.findById(fileId);
      if (file) {
        await file.deleteOne();
      }
    }

    await folder.deleteOne();
  } catch (error) {
    console.error(`폴더 및 하위 폴더 삭제 중 오류 발생: ${error.message}`);
    throw error;
  }
}

module.exports = deleteFolderAndSubFolders;
