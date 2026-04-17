const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    at: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    conversationId: {
      type: String,
      default: "",
      index: true,
    },
    context: {
      conversationId: { type: String, default: "" },
      patientName: { type: String, default: "" },
      disease: { type: String, default: "" },
      location: { type: String, default: "" },
      lastIntent: { type: String, default: "" },
      lastQuery: { type: String, default: "" },
      lastTopic: { type: String, default: "" },
      filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    history: {
      type: [historySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const ChatSession =
  mongoose.models.ChatSession || mongoose.model("ChatSession", chatSessionSchema);

module.exports = { ChatSession };
