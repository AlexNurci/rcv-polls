const { DataTypes } = require("sequelize");
const db = require("./db");

const Ballot = db.define("ballot", {
  pollId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "polls",
      key: "id",
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow anonymous voting
    references: {
      model: "users",
      key: "id",
    },
  },
  rankings: {
    type: DataTypes.JSONB,
    allowNull: false,
    validate: {
      isArray(value) {
        if (!Array.isArray(value)) {
          throw new Error("Rankings must be an array");
        }
      },
    },
  },
  // Store a unique identifier for anonymous voters (e.g., IP + user agent hash)
  voterIdentifier: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Ballot;
