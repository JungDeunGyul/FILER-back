const express = require("express");
const path = require("path");
const logger = require("morgan");
const cors = require("cors");

async function expressLoader(app) {
  app.use(logger("dev"));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: false }));
  app.use(express.static(path.join(__dirname, "public")));

  app.use(
    cors({
      origin: [process.env.CLIENT_URL],
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      credentials: true,
      preflightContinue: true,
      optionsSuccessStatus: 200,
    }),
  );
}

module.exports = expressLoader;
