const db = require("./db");
const User = require("./user");
const Poll = require("./poll");
const Ballot = require("./ballot");

// Define associations after both models are loaded to avoid circular dependency
Poll.belongsTo(User, { foreignKey: "creatorId", as: "creator" });
User.hasMany(Poll, { foreignKey: "creatorId", as: "polls" });

Ballot.belongsTo(Poll, { foreignKey: "pollId", as: "poll" });
Poll.hasMany(Ballot, { foreignKey: "pollId", as: "ballots" });

Ballot.belongsTo(User, { foreignKey: "userId", as: "voter" });
User.hasMany(Ballot, { foreignKey: "userId", as: "ballots" });

module.exports = {
  db,
  User,
  Poll,
  Ballot,
};
