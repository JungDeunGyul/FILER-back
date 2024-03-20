const indexRouter = require("../routes/index");
const loginRouter = require("../routes/login");
const teamRouter = require("../routes/team");
const notificationRouter = require("../routes/notification");
const folderRouter = require("../routes/folder");
const fileRouter = require("../routes/file");
const trashRouter = require("../routes/trash");
const restoreRouter = require("../routes/restore");

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
