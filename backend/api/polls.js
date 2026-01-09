const express = require("express");
const router = express.Router();
const { Poll, User, Ballot } = require("../database");
const { authenticateJWT } = require("../auth");
const crypto = require("crypto");

// Get all polls for the authenticated user
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const polls = await Poll.findAll({
      where: { creatorId: req.user.id },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "username"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ polls });
  } catch (error) {
    console.error("Error fetching polls:", error);
    res.status(500).json({ error: "Failed to fetch polls" });
  }
});

// Get a poll by ID (public endpoint for voting) - must be before /:id route
router.get("/public/:id", async (req, res) => {
  try {
    const poll = await Poll.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "username"],
        },
      ],
    });

    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    res.json({ poll });
  } catch (error) {
    console.error("Error fetching poll:", error);
    res.status(500).json({ error: "Failed to fetch poll" });
  }
});

// Calculate and get poll results (must be before /:id route)
router.get("/:id/results", async (req, res) => {
  try {
    const poll = await Poll.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Ballot,
          as: "ballots",
        },
      ],
    });

    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    // Only calculate results if poll is closed or expired
    const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
    if (!poll.isClosed && !isExpired) {
      return res.status(400).json({ error: "Poll is still active. Close it first to see results." });
    }

    // If results already calculated, return them
    if (poll.results) {
      return res.json({ results: poll.results });
    }

    // Calculate results using instant runoff voting
    const results = calculateInstantRunoff(poll.options, poll.ballots);

    // Save results to poll
    poll.results = results;
    await poll.save();

    res.json({ results });
  } catch (error) {
    console.error("Error calculating results:", error);
    res.status(500).json({ error: "Failed to calculate results" });
  }
});

// Get a single poll by ID (authenticated, for editing)
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const poll = await Poll.findOne({
      where: {
        id: req.params.id,
        creatorId: req.user.id, // Only allow users to see their own polls
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "username"],
        },
      ],
    });

    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    res.json({ poll });
  } catch (error) {
    console.error("Error fetching poll:", error);
    res.status(500).json({ error: "Failed to fetch poll" });
  }
});

// Create a new poll
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const { name, options, expiresAt } = req.body;

    if (!name || !options) {
      return res
        .status(400)
        .json({ error: "Name and options are required" });
    }

    if (!Array.isArray(options) || options.length === 0) {
      return res
        .status(400)
        .json({ error: "Options must be a non-empty array" });
    }

    // Validate expiration date if provided
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return res
        .status(400)
        .json({ error: "Expiration date must be in the future" });
    }

    const poll = await Poll.create({
      name,
      options,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      creatorId: req.user.id,
    });

    const pollWithCreator = await Poll.findOne({
      where: { id: poll.id },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "username"],
        },
      ],
    });

    res.status(201).json({ poll: pollWithCreator });
  } catch (error) {
    console.error("Error creating poll:", error);
    res.status(500).json({ error: "Failed to create poll" });
  }
});

// Update a poll
router.put("/:id", authenticateJWT, async (req, res) => {
  try {
    const { name, options, expiresAt, isClosed } = req.body;

    const poll = await Poll.findOne({
      where: {
        id: req.params.id,
        creatorId: req.user.id, // Only allow users to update their own polls
      },
    });

    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    if (name) poll.name = name;
    if (options) {
      if (!Array.isArray(options) || options.length === 0) {
        return res
          .status(400)
          .json({ error: "Options must be a non-empty array" });
      }
      poll.options = options;
    }
    if (expiresAt !== undefined) {
      if (expiresAt === null || expiresAt === "") {
        poll.expiresAt = null;
      } else {
        const expDate = new Date(expiresAt);
        if (expDate < new Date()) {
          return res
            .status(400)
            .json({ error: "Expiration date must be in the future" });
        }
        poll.expiresAt = expDate;
      }
    }
    if (typeof isClosed === "boolean") poll.isClosed = isClosed;

    await poll.save();

    const pollWithCreator = await Poll.findOne({
      where: { id: poll.id },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "username"],
        },
      ],
    });

    res.json({ poll: pollWithCreator });
  } catch (error) {
    console.error("Error updating poll:", error);
    res.status(500).json({ error: "Failed to update poll" });
  }
});

// Delete a poll
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const poll = await Poll.findOne({
      where: {
        id: req.params.id,
        creatorId: req.user.id, // Only allow users to delete their own polls
      },
    });

    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    await poll.destroy();
    res.json({ message: "Poll deleted successfully" });
  } catch (error) {
    console.error("Error deleting poll:", error);
    res.status(500).json({ error: "Failed to delete poll" });
  }
});

// Submit a vote
router.post("/:id/vote", async (req, res) => {
  try {
    const { rankings } = req.body;
    const pollId = req.params.id;

    // Get poll
    const poll = await Poll.findOne({ where: { id: pollId } });
    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    // Check if poll is active
    const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
    if (poll.isClosed || isExpired) {
      return res.status(400).json({ error: "This poll is no longer accepting votes" });
    }

    // Validate rankings
    if (!Array.isArray(rankings) || rankings.length === 0) {
      return res.status(400).json({ error: "Rankings are required" });
    }

    // Validate that all options are ranked and no duplicates
    const rankedOptions = rankings.map((r) => r.option);
    const uniqueOptions = new Set(rankedOptions);
    if (uniqueOptions.size !== rankings.length) {
      return res.status(400).json({ error: "Each option can only be ranked once" });
    }

    // Validate that all poll options are included
    const pollOptionsSet = new Set(poll.options);
    for (const ranking of rankings) {
      if (!pollOptionsSet.has(ranking.option)) {
        return res.status(400).json({ error: "Invalid option in rankings" });
      }
    }

    // Validate ranks are sequential starting from 1
    const ranks = rankings.map((r) => r.rank).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length; i++) {
      if (ranks[i] !== i + 1) {
        return res.status(400).json({ error: "Ranks must be sequential starting from 1" });
      }
    }

    // Check for duplicate votes (by user if authenticated, or by identifier)
    let voterIdentifier = null;
    let userId = null;

    // Try to get user from token (optional)
    const token = req.cookies.token;
    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Token invalid or expired, continue as anonymous
      }
    }

    // Create identifier for anonymous voters
    if (!userId) {
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get("user-agent") || "";
      voterIdentifier = crypto
        .createHash("sha256")
        .update(`${ip}-${userAgent}-${pollId}`)
        .digest("hex");
    }

    // Check for existing vote
    const existingVote = await Ballot.findOne({
      where: userId
        ? { pollId, userId }
        : { pollId, voterIdentifier },
    });

    if (existingVote) {
      return res.status(400).json({ error: "You have already voted on this poll" });
    }

    // Create ballot
    const ballot = await Ballot.create({
      pollId,
      userId,
      rankings,
      voterIdentifier,
    });

    res.status(201).json({ message: "Vote submitted successfully", ballot });
  } catch (error) {
    console.error("Error submitting vote:", error);
    res.status(500).json({ error: "Failed to submit vote" });
  }
});

// Instant Runoff Voting Algorithm
function calculateInstantRunoff(options, ballots) {
  if (!ballots || ballots.length === 0) {
    return {
      winner: null,
      rounds: [],
      message: "No votes have been cast yet.",
    };
  }

  const rounds = [];
  let remainingOptions = [...options];
  let currentBallots = ballots.map((b) => ({
    id: b.id,
    rankings: b.rankings,
  }));

  let roundNumber = 1;

  while (remainingOptions.length > 1) {
    // Count first-choice votes for each remaining option
    const voteCounts = {};
    remainingOptions.forEach((option) => {
      voteCounts[option] = 0;
    });

    currentBallots.forEach((ballot) => {
      // Find the highest-ranked option that's still in the race
      const sortedRankings = [...ballot.rankings].sort((a, b) => a.rank - b.rank);
      for (const ranking of sortedRankings) {
        if (remainingOptions.includes(ranking.option)) {
          voteCounts[ranking.option]++;
          break;
        }
      }
    });

    const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
    const majority = Math.floor(totalVotes / 2) + 1;

    // Check for majority winner
    for (const option of remainingOptions) {
      if (voteCounts[option] >= majority) {
        rounds.push({
          round: roundNumber,
          voteCounts: { ...voteCounts },
          eliminated: null,
          winner: option,
        });
        return {
          winner: option,
          rounds,
          totalVotes,
        };
      }
    }

    // Find option with fewest votes
    let minVotes = Infinity;
    let eliminatedOption = null;
    for (const option of remainingOptions) {
      if (voteCounts[option] < minVotes) {
        minVotes = voteCounts[option];
        eliminatedOption = option;
      }
    }

    // Remove eliminated option
    remainingOptions = remainingOptions.filter((opt) => opt !== eliminatedOption);

    rounds.push({
      round: roundNumber,
      voteCounts: { ...voteCounts },
      eliminated: eliminatedOption,
      winner: null,
    });

    roundNumber++;
  }

  // If only one option remains, it's the winner
  if (remainingOptions.length === 1) {
    const finalVoteCounts = {};
    remainingOptions.forEach((option) => {
      finalVoteCounts[option] = 0;
    });

    currentBallots.forEach((ballot) => {
      const sortedRankings = [...ballot.rankings].sort((a, b) => a.rank - b.rank);
      for (const ranking of sortedRankings) {
        if (remainingOptions.includes(ranking.option)) {
          finalVoteCounts[ranking.option]++;
          break;
        }
      }
    });

    rounds.push({
      round: roundNumber,
      voteCounts: finalVoteCounts,
      eliminated: null,
      winner: remainingOptions[0],
    });

    return {
      winner: remainingOptions[0],
      rounds,
      totalVotes: currentBallots.length,
    };
  }

  return {
    winner: null,
    rounds,
    message: "Unable to determine a winner.",
  };
}

module.exports = router;
