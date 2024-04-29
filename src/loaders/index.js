const path = require("path");

const mongooseLoader = require(path.resolve(__dirname, "./mongoose"));
const expressLoader = require(path.resolve(__dirname, "./express"));
const routerLoader = require(path.resolve(__dirname, "./routers"));
const errorHandlerLoader = require(path.resolve(__dirname, "./errorHandler"));

async function appLoader(app) {
  await mongooseLoader();
  await expressLoader(app);
  await routerLoader(app);
  await errorHandlerLoader(app);
}

module.exports = appLoader;
