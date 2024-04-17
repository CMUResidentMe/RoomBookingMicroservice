const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const roomSchema = new Schema({
  name: { type: String, required: true },
  room_type: {
    type: String,
    required: true,
    enum: ["party", "study", "hangout"],
  },
  description: String,
  capacity: Number,
});

module.exports = mongoose.model("Room", roomSchema);
