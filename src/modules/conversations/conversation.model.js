const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientName: {
      type: String,
      default: "",
      trim: true,
    },
    disease: {
      type: String,
      default: "",
      trim: true,
    },
    intent: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    summary: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      default: "active",
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    archived: {
      type: Boolean,
      default: false,
    },
    sessionId: {
      type: String,
      default: "",
      trim: true,
    },
    turnsCount: {
      type: Number,
      default: 0,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Conversation =
  mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);

module.exports = { Conversation };
