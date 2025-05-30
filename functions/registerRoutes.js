const http = require("http");
const { z } = require("zod");
const admin = require("firebase-admin");
const FirestoreStorage = require('./storage');  // path depends on file structure
const storage = new FirestoreStorage();

const {
  insertUserSchema,
  insertWaterUsageSchema,
  insertAlertSchema,
  insertConservationTipSchema
} = require("./shared/schema");

async function registerRoutes(app) {
  // User registration
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:firebaseUid", async (req, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.params.firebaseUid);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Water usage
  app.post("/api/water-usage", async (req, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.body.firebaseUid || "demo-user");
      if (!user) return res.status(401).json({ error: "User not found" });

      const usageData = insertWaterUsageSchema.parse({
        ...req.body,
        userId: user.id,
      });

      const usage = await storage.createWaterUsage(usageData);
      await checkUsageThreshold(user.id, parseFloat(usageData.amount), usageData.date);

      res.json(usage);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/water-usage", async (req, res) => {
    try {
      const firebaseUid = req.query.firebaseUid;
      if (!firebaseUid) return res.status(400).json({ error: "Firebase UID required" });

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) return res.status(404).json({ error: "User not found" });

      const usage = await storage.getWaterUsageByUser(user.id);
      res.json(usage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Conservation tips
  app.get("/api/conservation-tips", async (req, res) => {
    try {
      const firebaseUid = req.query.firebaseUid;
      if (!firebaseUid) return res.json([]);

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) return res.json([]);

      let tips = await storage.getConservationTipsByUser(user.id);
      if (tips.length === 0) {
        await generateConservationTips(user.id);
        tips = await storage.getConservationTipsByUser(user.id);
      }

      res.json(tips);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Alerts
  app.get("/api/alerts", async (req, res) => {
    try {
      const firebaseUid = req.query.firebaseUid;
      if (!firebaseUid) return res.json([]);

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) return res.json([]);

      const alerts = await storage.getAlertsByUser(user.id);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Community stats
  app.get("/api/community-stats", async (req, res) => {
    try {
      const stats = await storage.getCommunityStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Helper Functions
  async function checkUsageThreshold(userId, amount, date) {
    const user = await storage.getUser(userId);
    if (!user) return;

    const dailyUsage = await storage.getDailyUsage(userId, date);
    const target = user.dailyTarget || 200;

    if (dailyUsage > target * 0.8) {
      await storage.createAlert({
        userId,
        type: "threshold",
        title: "Usage Alert",
        message: "You're approaching your daily target. Consider shorter activities for the rest of the day.",
      });
    }

    if (dailyUsage > target) {
      await storage.createAlert({
        userId,
        type: "threshold",
        title: "Target Exceeded",
        message: `You've exceeded your daily water target of ${target}L. Current usage: ${Math.round(dailyUsage)}L.`,
      });
    }
  }

  async function generateConservationTips(userId) {
    const usage = await storage.getWaterUsageByUser(userId);

    const showerUsage = usage.filter((u) => u.activity === "bathing");
    const avgShowerUsage =
      showerUsage.length > 0
        ? showerUsage.reduce((sum, u) => sum + parseFloat(u.amount), 0) / showerUsage.length
        : 0;

    if (avgShowerUsage > 100) {
      await storage.createConservationTip({
        userId,
        title: "Optimize Shower Time",
        description: `Your average shower uses ${Math.round(avgShowerUsage)}L. Try reducing by 2 minutes to save 20L daily.`,
        impact: `Potential savings: ${Math.round((avgShowerUsage - 80) * 7)}L/week`,
        category: "bathing",
      });
    }

    const cookingUsage = usage.filter((u) => u.activity === "cooking");
    if (cookingUsage.length > 0) {
      await storage.createConservationTip({
        userId,
        title: "Efficient Cooking",
        description: "Use a bowl of water to wash vegetables instead of running water continuously.",
        impact: "Potential savings: 50L/week",
        category: "cooking",
      });
    }
  }

  const httpServer = http.createServer(app);
  return httpServer;
}

module.exports = { registerRoutes };
