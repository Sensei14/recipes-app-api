const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const recipeSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  steps: { type: Array, required: true },
  ingredients: { type: Array, required: true },
  author: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  fans: [{ type: mongoose.Types.ObjectId, required: false, ref: "User" }],
  comments: { type: Array, required: false },
  ratings: { type: Array, required: false },
  image: { type: String, required: false },
  category: { type: String, require: true }
});

module.exports = mongoose.model("Recipe", recipeSchema);
