const deleteTeamResources = async (team) => {
  for (const folderId of team.ownedFolders) {
    await deleteFolder(folderId);
  }

  for (const fileId of team.ownedFiles) {
    await deleteFile(fileId);
  }
};

const deleteFolder = async (folderId) => {
  const folder = await Folder.findOne({ _id: folderId });
  if (folder) {
    for (const fileId of folder.files) {
      await deleteFile(fileId);
    }

    for (const subfolderId of folder.subfolders) {
      await deleteFolder(subfolderId);
    }

    await Folder.findByIdAndDelete(folderId);
  }
};

const deleteFile = async (fileId) => {
  await File.findByIdAndDelete(fileId);
};

module.exports = deleteTeamResources;
