import { mutation } from "./_generated/server";

export const run = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("items").first();
    if (existing) return "Already seeded";

    // Items
    const itemNames = [
      "6G", "IOT", "LLM", "moonlake's data farm", "spacetimeDB",
      "factory ai", "LunaBill", "cmux", "insforge", "centriai.com",
      "join-a-project-on-a-map",
    ];
    const itemIds: Record<string, string> = {};
    for (const name of itemNames) {
      const id = await ctx.db.insert("items", { name });
      itemIds[name] = id;
    }

    // Questions
    const q1 = await ctx.db.insert("questions", {
      text: "Did I feel genuine curiosity, or was I performing interest?",
      categories: ["genuine curiosity", "interesting", "ok-ish", "boring"],
      order: 0,
    });
    await ctx.db.insert("questions", {
      text: "Could I imagine spending a boring Tuesday afternoon on this?",
      categories: ["yes", "no"],
      order: 1,
    });
    await ctx.db.insert("questions", {
      text: "Does this problem get more important over time, or is it a point solution?",
      categories: ["gets more important", "point solution"],
      order: 2,
    });
    await ctx.db.insert("questions", {
      text: "Does it connect to my existing intuitions about augmentation and human capability?",
      categories: ["yes", "no"],
      order: 3,
    });

    // Assignments for Q1
    const q1Map: Record<string, string[]> = {
      "genuine curiosity": ["6G", "IOT", "LLM"],
      "interesting": ["moonlake's data farm", "spacetimeDB", "factory ai"],
      "ok-ish": ["LunaBill", "cmux", "insforge", "centriai.com"],
      "boring": ["join-a-project-on-a-map"],
    };
    for (const [category, names] of Object.entries(q1Map)) {
      for (const name of names) {
        await ctx.db.insert("assignments", {
          itemId: itemIds[name] as any,
          questionId: q1,
          category,
        });
      }
    }

    return "Seeded successfully";
  },
});
