import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  items: defineTable({
    name: v.string(),
  }),
  questions: defineTable({
    text: v.string(),
    categories: v.array(v.string()),
    order: v.number(),
  }),
  assignments: defineTable({
    itemId: v.id("items"),
    questionId: v.id("questions"),
    category: v.string(),
  })
    .index("by_question", ["questionId"])
    .index("by_item", ["itemId"])
    .index("by_question_item", ["questionId", "itemId"]),
});
