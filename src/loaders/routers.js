const path = require("path");

const indexRouter = require(path.resolve(__dirname, "../routes/index"));
const loginRouter = require(path.resolve(__dirname, "../routes/login"));
const teamRouter = require(path.resolve(__dirname, "../routes/team"));
const notificationRouter = require(
  path.resolve(__dirname, "../routes/notification"),
);
const folderRouter = require(path.resolve(__dirname, "../routes/folder"));
const fileRouter = require(path.resolve(__dirname, "../routes/file"));
const trashRouter = require(path.resolve(__dirname, "../routes/trash"));
const restoreRouter = require(path.resolve(__dirname, "../routes/restore"));

async function routerLoader(app) {
  app.use("/", indexRouter);
  app.use("/login", loginRouter);
  app.use("/team", teamRouter);
  app.use("/notification", notificationRouter);
  app.use("/folder", folderRouter);
  app.use("/file", fileRouter);
  app.use("/trash", trashRouter);
  app.use("/restore", restoreRouter);
}

module.exports = routerLoader;
