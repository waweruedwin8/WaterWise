// shared/schema.js
const { z } = require("zod");

const insertUserSchema = z.object({
  firebaseUid: z.string(),
  name: z.string(),
  email: z.string().email(),
  dailyTarget: z.number().optional(),
});

const insertWaterUsageSchema = z.object({
  userId: z.string(),
  amount: z.string().or(z.number()), // Firestore can accept either
  date: z.string(), // Expected to be in ISO format e.g., "2024-08-22"
  activity: z.string(),
});

const insertAlertSchema = z.object({
  userId: z.string(),
  type: z.enum(["threshold", "info", "warning"]),
  title: z.string(),
  message: z.string(),
});

const insertConservationTipSchema = z.object({
  userId: z.string(),
  title: z.string(),
  description: z.string(),
  impact: z.string(),
  category: z.string(),
});

module.exports = {
  insertUserSchema,
  insertWaterUsageSchema,
  insertAlertSchema,
  insertConservationTipSchema,
};
