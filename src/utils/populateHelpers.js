const populateUserDetails = () => {
  return [
    {
      path: "teams",
      populate: [
        {
          path: "members.user",
        },
        {
          path: "ownedFolders",
        },
        {
          path: "ownedFiles",
          populate: {
            path: "versions",
            populate: {
              path: "file",
            },
          },
        },
        {
          path: "ownedFiles",
          populate: {
            path: "versions",
            populate: {
              path: "file",
              populate: {
                path: "comments",
                populate: {
                  path: "user",
                },
              },
            },
          },
        },
        {
          path: "joinRequests.user",
        },
      ],
    },
    {
      path: "notifications",
      populate: {
        path: "team",
      },
    },
  ];
};

module.exports = { populateUserDetails };
