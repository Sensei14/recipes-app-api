const fs = require('fs');
const path = require('path');
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const server = express();
const HttpError = require("./models/http-error");

const userRoutes = require("./routes/users-routes");
const recipesRoutes = require("./routes/recipes-routes");

server.use(bodyParser.json());

server.use('/uploads/images', express.static(path.join('uploads', 'images')));

server.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  next();
});

server.use("/api/users", userRoutes);
server.use("/api/recipes", recipesRoutes);

server.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => { });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occured! " });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@example-tgaeq.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    server.listen(process.env.PORT || 5000);
    console.log("Server is running...");
  })
  .catch(error => {
    console.log(error);
  });
