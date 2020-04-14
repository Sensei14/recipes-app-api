const express = require("express");
const router = express.Router();
const recipesController = require("../controllers/recipes-controller");
const { check } = require("express-validator");
const auth = require("../middleware/auth");
const fileUpload = require('../middleware/file-upload');

router.get("/", recipesController.getRecipes);
router.get("/:id", recipesController.getRecipeById);
router.get("/user/:id", recipesController.getRecipesByUserId);

router.use(auth);


router.get("/favourite/all", recipesController.getFavouriteRecipes)

router.post(
  "/",
  fileUpload.single('image'),
  [
    check("title")
      .not()
      .isEmpty(),
    check("description")
      .not()
      .isEmpty()
  ],
  recipesController.createRecipe
);
router.delete("/:id", recipesController.deleteRecipe);
router.patch(
  "/:id",
  [
    check("title")
      .not()
      .isEmpty(),
    check("description")
      .not()
      .isEmpty(),
    check("steps").isArray({ min: 1 }),
    check("ingredients").isArray({ min: 1 })
  ],
  recipesController.updateRecipe
);

router.patch("/like/:id", recipesController.likeRecipe);
router.post("/comment",
  [
    check("text").isLength({ min: 5 })
  ]
  , recipesController.addComment)

router.post('/rate', recipesController.rateRecipe);


module.exports = router;
