const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const usersController = require("../controllers/users-controller");

router.post("/login", usersController.login);
router.post(
  "/signup",
  [
    check("name")
      .not()
      .isEmpty(),
    check("email")
      .normalizeEmail()
      .isEmail(),
    check("password").isLength({ min: 5 })
  ],
  usersController.signup
);

module.exports = router;
