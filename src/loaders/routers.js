const indexRouter = require("../routes/index");
const loginRouter = require("../routes/login");

async function routerLoader(app) {
  app.use("/", indexRouter);
  app.use("/login", loginRouter);
}

module.exports = routerLoader;
