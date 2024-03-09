const indexRouter = require("../routes/index");
const loginRouter = require("../routes/login");
const teamRouter = require("../routes/team");

async function routerLoader(app) {
  app.use("/", indexRouter);
  app.use("/login", loginRouter);
  app.use("/team", teamRouter);
}

module.exports = routerLoader;
