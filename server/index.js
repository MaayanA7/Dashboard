import express from "express";
import db from "./db.js";

const app = express();
app.use(express.json());

function rowToTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    status: row.status,
    priority: row.priority,
    due: row.due,
    assignee: row.assignee,
    project: row.project,
    progress: row.progress ?? 0,
    tags: row.tags ? JSON.parse(row.tags) : [],
    repeat: row.repeat ? JSON.parse(row.repeat) : null,
  };
}

app.get("/api/tasks", (req, res) => {
  const rows = db.prepare("SELECT * FROM tasks ORDER BY rowid DESC").all();
  res.json(rows.map(rowToTask));
});

app.post("/api/tasks", (req, res) => {
  const task = req.body;
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO tasks
     (id, title, summary, status, priority, due, assignee, project, progress, tags, repeat)
     VALUES (@id, @title, @summary, @status, @priority, @due, @assignee, @project, @progress, @tags, @repeat)`
  );
  stmt.run({
    ...task,
    tags: JSON.stringify(task.tags || []),
    repeat: task.repeat ? JSON.stringify(task.repeat) : null,
  });
  res.json(task);
});

app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const existing = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(id);
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const next = { ...rowToTask(existing), ...updates };
  db.prepare(
    `UPDATE tasks SET
      title=@title, summary=@summary, status=@status, priority=@priority, due=@due,
      assignee=@assignee, project=@project, progress=@progress, tags=@tags, repeat=@repeat
     WHERE id=@id`
  ).run({
    ...next,
    tags: JSON.stringify(next.tags || []),
    repeat: next.repeat ? JSON.stringify(next.repeat) : null,
  });
  res.json(next);
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.delete("/api/tasks", (req, res) => {
  db.prepare("DELETE FROM tasks").run();
  res.json({ ok: true });
});

const port = process.env.PORT || 5174;
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
