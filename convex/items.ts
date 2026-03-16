import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("items").collect();
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await ctx.db.insert("items", { name });
  },
});

export const remove = mutation({
  args: { id: v.id("items") },
  handler: async (ctx, { id }) => {
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_item", (q) => q.eq("itemId", id))
      .collect();
    for (const a of assignments) {
      await ctx.db.delete(a._id);
    }
    await ctx.db.delete(id);
  },
});
