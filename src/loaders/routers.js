const indexRouter = require("../routes/index");
const loginRouter = require("../routes/login");
const teamRouter = require("../routes/team");
const notificationRouter = require("../routes/notification");
const folderRouter = require("../routes/folder");

async function routerLoader(app) {
  app.use("/", indexRouter);
  app.use("/login", loginRouter);
  app.use("/team", teamRouter);
  app.use("/notification", notificationRouter);
  app.use("/folder", folderRouter);
}

module.exports = routerLoader;
