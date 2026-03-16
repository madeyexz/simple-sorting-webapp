import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect();
    return questions.sort((a, b) => a.order - b.order);
  },
});

export const create = mutation({
  args: { text: v.string(), categories: v.array(v.string()) },
  handler: async (ctx, { text, categories }) => {
    const existing = await ctx.db.query("questions").collect();
    return await ctx.db.insert("questions", {
      text,
      categories,
      order: existing.length,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("questions"),
    text: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, text, categories }) => {
    const updates: Record<string, unknown> = {};
    if (text !== undefined) updates.text = text;
    if (categories !== undefined) updates.categories = categories;
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("questions") },
  handler: async (ctx, { id }) => {
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_question", (q) => q.eq("questionId", id))
      .collect();
    for (const a of assignments) {
      await ctx.db.delete(a._id);
    }
    await ctx.db.delete(id);
  },
});

export const renameCategory = mutation({
  args: {
    questionId: v.id("questions"),
    oldCategory: v.string(),
    newCategory: v.string(),
  },
  handler: async (ctx, { questionId, oldCategory, newCategory }) => {
    const question = await ctx.db.get(questionId);
    if (!question) return;

    await ctx.db.patch(questionId, {
      categories: question.categories.map((c) =>
        c === oldCategory ? newCategory : c
      ),
    });

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_question", (q) => q.eq("questionId", questionId))
      .collect();
    for (const a of assignments) {
      if (a.category === oldCategory) {
        await ctx.db.patch(a._id, { category: newCategory });
      }
    }
  },
});

export const deleteCategory = mutation({
  args: {
    questionId: v.id("questions"),
    category: v.string(),
  },
  handler: async (ctx, { questionId, category }) => {
    const question = await ctx.db.get(questionId);
    if (!question) return;

    await ctx.db.patch(questionId, {
      categories: question.categories.filter((c) => c !== category),
    });

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_question", (q) => q.eq("questionId", questionId))
      .collect();
    for (const a of assignments) {
      if (a.category === category) {
        await ctx.db.delete(a._id);
      }
    }
  },
});
