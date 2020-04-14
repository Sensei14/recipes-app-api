const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true, minlength: 5 },
  recipes: [{ type: mongoose.Types.ObjectId, required: false, ref: "Recipe" }],
  favouriteRecipes: [
    { type: mongoose.Types.ObjectId, required: false, ref: "Recipe" }
  ]
});

module.exports = mongoose.model("User", userSchema);
