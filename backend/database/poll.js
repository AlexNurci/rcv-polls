const { DataTypes } = require("sequelize");
const db = require("./db");

const Poll = db.define("poll", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  options: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    validate: {
      isArray(value) {
        if (!Array.isArray(value)) {
          throw new Error("Options must be an array");
        }
      },
    },
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true, // Optional expiration date
  },
  results: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
  },
  isClosed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  creatorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "users", // Use string reference to avoid circular dependency
      key: "id",
    },
  },
});

module.exports = Poll;
