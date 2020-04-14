const fs = require('fs');
const HttpError = require("../models/http-error");
const Recipe = require("../models/recipe");
const User = require("../models/user");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const getRecipes = async (req, res, next) => {
  let recipes = [];

  const search = req.query.search;
  const category = req.query.category;

  if (search || category) {
    try {
      recipes = await Recipe.find({ title: { $regex: "^" + search }, category: category });
    } catch (error) {
      return next(new HttpError("Wyszukiwanie nie powiodło się", 500));
    }
  }
  else {
    try {
      recipes = await Recipe.find();
    } catch (error) {
      return next(new HttpError("Wyszukiwanie nie powiodło się", 500));
    }
  }

  res.json({
    recipes: recipes.map(recipe => recipe.toObject({ getters: true }))
  });
};

const getRecipeById = async (req, res, next) => {
  const id = req.params.id;

  let recipe;

  try {
    recipe = await Recipe.findById(id).populate("author", "name");
  } catch (error) {
    return next(new HttpError("Wyszukiwanie nie powiodło się", 500));
  }

  if (!recipe) {
    return next(new HttpError("Nie znaleziono przepisu o takim ID", 404));
  }

  res.json(recipe.toObject({ getters: true }));
};

const getRecipesByUserId = async (req, res, next) => {
  const userId = req.params.id;
  let recipes;

  try {
    recipes = await Recipe.find({ author: userId });
  } catch (error) {
    return next(new HttpError("Wyszukiwanie nie powiodło się", 500));
  }

  if (!recipes || recipes.length === 0) {
    return next(
      new HttpError("Nie znaleziono przepisów dla tego użytkownika.", 404)
    );
  }

  res.json({
    recipes: recipes.map(recipe => recipe.toObject({ getters: true }))
  });
};
const createRecipe = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Wprowadzone dane są niepoprawne.", 422));
  }

  const { title, description, category } = req.body;
  let { steps, ingredients } = req.body;
  const userId = req.userData.userId;
  let user;

  steps = JSON.parse(steps);
  ingredients = JSON.parse(ingredients);

  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(
      new HttpError("Wystąpił błąd podczas dodawania przepisu.", 500)
    );
  }

  if (!user) {
    return next(new HttpError("Nie znaleziono użytkownika o podanym ID", 404));
  }

  let createdRecipe;
  if (req.file) {
    createdRecipe = new Recipe({
      title,
      description,
      steps,
      ingredients,
      author: userId,
      fans: [],
      comments: [],
      ratings: [],
      image: req.file.path,
      category
    });
  } else {
    createdRecipe = new Recipe({
      title,
      description,
      steps,
      ingredients,
      author: userId,
      fans: [],
      comments: [],
      ratings: [],
      image: "",
      category
    });
  }



  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await createdRecipe.save({ session: sess });
    user.recipes.push(createdRecipe);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError("Wystąpił bład podczas dodawania przepisu", 500));
  }

  res.status(201).json({ recipe: createdRecipe });
};
const deleteRecipe = async (req, res, next) => {
  const recipeId = req.params.id;

  let recipe;

  try {
    recipe = await Recipe.findById(recipeId).populate("author");
  } catch (error) {
    return next(new HttpError("Wystąpił bład podczas usuwania przepisu", 500));
  }

  if (!recipe) {
    return next(new HttpError("Nie znaleziono przepisu.", 404));
  }

  if (recipe.author.id !== req.userData.userId) {
    return next(
      new HttpError("Nie masz uprawnień do usunięcia tego przepisu.", 401)
    );
  }

  const imagePath = recipe.image;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await recipe.remove({ session: sess });
    recipe.author.recipes.pull(recipe);
    await recipe.author.save({ session: sess });

    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError("Wystąpił bład podczas usuwania przepisu", 500));
  }

  fs.unlink(imagePath, err => { });

  res.status(200).json({ message: "Przepis usunięty pomyślnie." });
};

const updateRecipe = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new HttpError("Wprowadzone dane są niepoprawne", 422));
  }

  const recipeId = req.params.id;
  const { title, description, steps, ingredients } = req.body;

  let recipe;

  try {
    recipe = await Recipe.findById(recipeId);
  } catch (error) {
    return next(
      new HttpError("Wystąpił błąd podczas edytowania przepisu", 500)
    );
  }

  if (recipe.author.toString() !== req.userData.userId) {
    return next(
      new HttpError("Nie masz uprawnień do edycji tego przepisu.", 401)
    );
  }

  recipe.title = title;
  recipe.description = description;
  recipe.steps = steps;
  recipe.ingredients = ingredients;

  try {
    await recipe.save();
  } catch (error) {
    return next(
      new HttpError("Wystąpił błąd podczas edytowania przepisu", 500)
    );
  }

  res.status(200).json({ message: "Pomyślnie edytowano przepis" });
};

const likeRecipe = async (req, res, next) => {
  const recipeId = req.params.id;

  let recipe;

  try {
    recipe = await Recipe.findById(recipeId);
  } catch (error) {
    return next(new HttpError("Wystąpił błąd, spróbuj ponownie później.", 500));
  }

  if (!recipe) {
    return next(new HttpError("Nie znaleziono takiego przepisu.", 404));
  }

  const userId = req.userData.userId;

  let user;

  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError("Wystąpił błąd, spróbuj ponownie później.", 500));
  }

  if (!user) {
    return next(new HttpError("Nie znaleziono takiego użytkownika.", 404));
  }

  const favRecipes = user.favouriteRecipes;
  const isFav = favRecipes.indexOf(recipeId);

  if (isFav !== -1) {
    try {
      const sess = await mongoose.startSession();
      sess.startTransaction();

      recipe.fans.pull(user);
      await recipe.save({ session: sess });
      user.favouriteRecipes.pull(recipe);
      await user.save({ session: sess });
      await sess.commitTransaction();
    } catch (error) {
      return next(
        new HttpError("Wystąpił błąd. Spróbuj ponownie później", 500)
      );
    }
    res
      .status(200)
      .json({ message: "Usunięto z ulubionych", status: "removed" });
  } else {
    try {
      const sess = await mongoose.startSession();
      sess.startTransaction();

      user.favouriteRecipes.push(recipe);
      await user.save({ session: sess });
      recipe.fans.push(user);
      await recipe.save({ session: sess });

      await sess.commitTransaction();
    } catch (error) {
      return next(
        new HttpError("Wystąpił błąd. Spróbuj ponownie później", 500)
      );
    }
    res.status(200).json({ message: "Dodano do ulubionych", status: "added" });
  }
};

const getFavouriteRecipes = async (req, res, next) => {
  const userId = req.userData.userId;
  let user;

  try {
    user = await User.findById(userId).populate('favouriteRecipes');
  } catch (error) {
    return next(
      new HttpError('Wystąpił błąd. Spróbuj ponownie później', 500)
    );
  }

  if (!user) {
    return next(
      new HttpError('Nie znaleziono użytkownika', 404)
    )
  }
  const favRecipes = user.favouriteRecipes.map(recipe => recipe.toObject({ getters: true }))
  res.json(favRecipes)
}

const addComment = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new HttpError("Wprowadzone dane są niepoprawne", 422));
  }

  const userId = req.userData.userId;
  const { recipeId, text } = req.body
  let user;

  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError('Wystąpił błąd. Spróbuj ponownie później', 500))
  }

  if (!user) {
    return next(
      new HttpError('Nie znaleziono użytkownika', 404)
    )
  }

  let recipe;
  try {
    recipe = await Recipe.findById(recipeId);
  } catch (error) {
    return next(new HttpError('Wystąpił błąd. Spróbuj ponownie później', 500))
  }

  if (!recipe) {
    return next(
      new HttpError('Nie znaleziono przepisu', 404)
    )
  }

  const comment = {
    author: user.name,
    text,
    date: new Date()
  }

  recipe.comments.push(comment)

  try {
    await recipe.save();
  } catch (error) {
    new HttpError("Wystąpił błąd podczas dodawania komentarza", 500)
  }

  res.json({ message: 'Dodano komentarz', status: 201 })

}


const rateRecipe = async (req, res, next) => {
  const userId = req.userData.userId;
  const recipeId = req.body.recipeId;
  const rate = req.body.rate;

  let user;
  try {
    user = await User.findById(userId)
  } catch (error) {
    new HttpError("Wystąpił błąd! Spróbuj ponownie później.", 500);
  }

  if (!user) {
    new HttpError("Nie znaleziono użytkownika", 404);
  }

  let recipe;

  try {
    recipe = await Recipe.findById(recipeId);
  } catch (error) {
    new HttpError("Wystąpił błąd! Spróbuj ponownie później.", 500);
  }

  if (!recipe) {
    new HttpError("Nie znaleziono przepisu.", 404)
  }

  const rating = {
    author: userId,
    rate,
  };

  const ratings = recipe.ratings;
  const didRate = ratings.find(item => item.author === userId);

  if (didRate) {
    return next(new HttpError('Ten przepis został już przez Ciebie oceniony.'))
  } else {
    recipe.ratings.push(rating);
    await recipe.save();
    res.json({ message: 'Dodano ocenę', status: 201 })
  }
}

exports.getRecipes = getRecipes;
exports.getRecipeById = getRecipeById;
exports.getRecipesByUserId = getRecipesByUserId;
exports.createRecipe = createRecipe;
exports.deleteRecipe = deleteRecipe;
exports.updateRecipe = updateRecipe;
exports.likeRecipe = likeRecipe;
exports.getFavouriteRecipes = getFavouriteRecipes;
exports.addComment = addComment;
exports.rateRecipe = rateRecipe;
