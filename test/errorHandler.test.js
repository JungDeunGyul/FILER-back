const createError = require("http-errors");
const express = require("express");
const supertest = require("supertest");
const errorHandlerLoader = require("../src/loaders/errorHandler");

describe("errorHandlerLoader", () => {
  let app;

  beforeEach(() => {
    app = express();
    errorHandlerLoader(app);
  });

  it("should handle 404 error", async () => {
    const response = await supertest(app).get("/nonexistent-route");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({});
  });
});
