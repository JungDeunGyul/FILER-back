const indexRouter = require("../routes/index");

async function routerLoader(app) {
  app.use("/", indexRouter);
}

module.exports = routerLoader;
