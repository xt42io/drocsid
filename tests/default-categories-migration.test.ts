import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("legacy generated categories are removed without deleting channels", async () => {
  const database = new PGlite();
  try {
    const journal = JSON.parse(
      readFileSync("drizzle/meta/_journal.json", "utf8"),
    );
    for (const entry of journal.entries.filter(
      (item: { idx: number }) => item.idx < 11,
    ))
      await database.exec(
        readFileSync(`drizzle/${entry.tag}.sql`, "utf8"),
      );
    await database.exec(`
      INSERT INTO communities (id,name,description,icon,color,category)
      VALUES ('legacy','Legacy','','sun','peach','Test'),('custom','Custom','','sun','peach','Test');
      INSERT INTO channel_categories (id,community_id,name)
      VALUES
        ('start','legacy','START HERE'),
        ('common','legacy','THE COMMON ROOM'),
        ('projects','legacy','PROJECTS'),
        ('custom-start','custom','START HERE');
      INSERT INTO conversations (id,kind,community_id,channel_id,name,category_id)
      VALUES
        ('legacy:welcome','channel','legacy','welcome','welcome','start'),
        ('legacy:general','channel','legacy','general','general','common'),
        ('legacy:projects','channel','legacy','projects','projects','projects'),
        ('custom:start','channel','custom','start','start','custom-start');
    `);

    await database.exec(
      readFileSync(
        "drizzle/0011_remove_default_channel_categories.sql",
        "utf8",
      ),
    );

    const channels = await database.query<{
      id: string;
      category_id: string | null;
    }>("SELECT id, category_id FROM conversations ORDER BY id");
    assert.deepEqual(channels.rows, [
      { id: "custom:start", category_id: "custom-start" },
      { id: "legacy:general", category_id: null },
      { id: "legacy:projects", category_id: "projects" },
      { id: "legacy:welcome", category_id: null },
    ]);
    const categories = await database.query<{ id: string }>(
      "SELECT id FROM channel_categories ORDER BY id",
    );
    assert.deepEqual(categories.rows, [
      { id: "custom-start" },
      { id: "projects" },
    ]);
  } finally {
    await database.close();
  }
});
