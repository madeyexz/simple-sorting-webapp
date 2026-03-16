import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("assignments").collect();
  },
});

export const assign = mutation({
  args: {
    itemId: v.id("items"),
    questionId: v.id("questions"),
    category: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { itemId, questionId, category }) => {
    const existing = await ctx.db
      .query("assignments")
      .withIndex("by_question_item", (q) =>
        q.eq("questionId", questionId).eq("itemId", itemId)
      )
      .first();

    if (existing) {
      if (category === null) {
        await ctx.db.delete(existing._id);
      } else {
        await ctx.db.patch(existing._id, { category });
      }
    } else if (category !== null) {
      await ctx.db.insert("assignments", { itemId, questionId, category });
    }
  },
});
