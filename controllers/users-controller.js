const HttpError = require("../models/http-error");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

const signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new HttpError("Wprowadzone dane nie są poprawne", 422));
  }

  const { name, password, email } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ name });
  } catch (error) {
    return next(
      new HttpError(
        "Rejestracja zakończona niepowodzeniem. Spróbuj ponownie.",
        500
      )
    );
  }

  if (existingUser) {
    return next(new HttpError("Użytkownik o tej nazwie już istnieje.", 422));
  }

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 10);
  } catch (error) {
    return next(
      new HttpError(
        "Rejestracja zakończona niepowodzeniem. Spróbuj ponownie.",
        500
      )
    );
  }

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    recipes: [],
    favouriteRecipes: []
  });

  try {
    await newUser.save();
  } catch (error) {
    return next(
      new HttpError(
        "Rejestracja zakończona niepowodzeniem. Spróbuj ponownie.",
        500
      )
    );
  }

  res.status(201).json({ message: "Użytkownik pomyślnie zarejestrowany" });
};

const login = async (req, res, next) => {
  const { name, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ name });
  } catch (error) {
    return next(new HttpError("Logowanie nie powiodło się.", 500));
  }

  if (!existingUser) {
    return next(new HttpError("Niepoprawne dane logowania.", 401));
  }

  let isPasswordValid = false;

  try {
    isPasswordValid = await bcrypt.compare(password, existingUser.password);
  } catch (error) {
    return next(new HttpError("Logowanie nie powiodło się.", 500));
  }

  if (!isPasswordValid) {
    return next(new HttpError("Niepoprawne dane logowania.", 401));
  }

  let token;

  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        name: existingUser.name
      },
      process.env.JWT_KEY,
      { expiresIn: "6h" }
    );
  } catch (error) {
    return next(new HttpError("Logowanie nie powiodło się.", 500));
  }

  res.json({
    userId: existingUser.id,
    name: existingUser.name,
    token,

    favouriteRecipes: existingUser.favouriteRecipes
  });
};

exports.signup = signup;
exports.login = login;
