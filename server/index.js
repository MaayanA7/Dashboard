import express from "express";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config({ path: ".env.whatsapp" });

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
    notify: row.notify === 1,
    last_notified: row.last_notified || null,
    reminder_time: row.reminder_time || null,
    createdAt: row.created_at || null,
    completedAt: row.completed_at || null,
    checklist: row.checklist ? JSON.parse(row.checklist) : [],
  };
}

function rowToNote(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tags: row.tags ? JSON.parse(row.tags) : [],
    color: row.color,
    createdAt: row.created_at,
    orderIndex: row.order_index ?? 0,
  };
}

const whatsappConfig = {
  token: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  templateName: process.env.WHATSAPP_TEMPLATE_NAME,
  templateLang: process.env.WHATSAPP_TEMPLATE_LANG || "en_US",
  recipient: process.env.WHATSAPP_RECIPIENT,
};

function isWhatsAppConfigured() {
  return (
    whatsappConfig.token &&
    whatsappConfig.phoneNumberId &&
    whatsappConfig.templateName &&
    whatsappConfig.recipient
  );
}

async function sendWhatsAppTemplate(task, reason) {
  if (!isWhatsAppConfigured()) {
    throw new Error("WhatsApp is not configured.");
  }
  const url = `https://graph.facebook.com/v19.0/${whatsappConfig.phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: whatsappConfig.recipient,
    type: "template",
    template: {
      name: whatsappConfig.templateName,
      language: { code: whatsappConfig.templateLang },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: task.title },
            { type: "text", text: task.due || "No due date" },
            { type: "text", text: reason },
          ],
        },
      ],
    },
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${whatsappConfig.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "WhatsApp API error");
  }
  return response.json();
}

app.get("/api/tasks", (req, res) => {
  const rows = db.prepare("SELECT * FROM tasks ORDER BY rowid DESC").all();
  res.json(rows.map(rowToTask));
});

app.post("/api/tasks", (req, res) => {
  const task = req.body;
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO tasks
     (id, title, summary, status, priority, due, assignee, project, progress, tags, repeat, notify, last_notified, reminder_time, created_at, completed_at, checklist)
     VALUES (@id, @title, @summary, @status, @priority, @due, @assignee, @project, @progress, @tags, @repeat, @notify, @last_notified, @reminder_time, @created_at, @completed_at, @checklist)`
  );
  stmt.run({
    ...task,
    tags: JSON.stringify(task.tags || []),
    repeat: task.repeat ? JSON.stringify(task.repeat) : null,
    notify: task.notify ? 1 : 0,
    last_notified: task.last_notified || null,
    reminder_time: task.reminder_time || null,
    created_at: task.createdAt || new Date().toISOString(),
    completed_at: task.completedAt || null,
    checklist: JSON.stringify(task.checklist || []),
  });
  if (task.notify) {
    sendWhatsAppTemplate(task, "Task created").catch((err) =>
      console.error("WhatsApp error:", err.message)
    );
  }
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
      assignee=@assignee, project=@project, progress=@progress, tags=@tags, repeat=@repeat,
      notify=@notify, last_notified=@last_notified, reminder_time=@reminder_time,
      created_at=@created_at, completed_at=@completed_at, checklist=@checklist
     WHERE id=@id`
  ).run({
    ...next,
    tags: JSON.stringify(next.tags || []),
    repeat: next.repeat ? JSON.stringify(next.repeat) : null,
    notify: next.notify ? 1 : 0,
    reminder_time: next.reminder_time || null,
    created_at: next.createdAt || new Date().toISOString(),
    completed_at: next.completedAt || null,
    checklist: JSON.stringify(next.checklist || []),
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

app.get("/api/notes", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM notes ORDER BY order_index ASC, created_at DESC")
    .all();
  res.json(rows.map(rowToNote));
});

app.post("/api/notes", (req, res) => {
  const note = req.body;
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO notes
     (id, title, body, tags, color, created_at, order_index)
     VALUES (@id, @title, @body, @tags, @color, @created_at, @order_index)`
  );
  stmt.run({
    id: note.id,
    title: note.title,
    body: note.body || "",
    tags: JSON.stringify(note.tags || []),
    color: note.color || "midnight",
    created_at: note.createdAt || new Date().toISOString(),
    order_index: note.orderIndex ?? 0,
  });
  res.json(note);
});

app.put("/api/notes/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const existing = db.prepare("SELECT * FROM notes WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Note not found" });
  const next = { ...rowToNote(existing), ...updates };
  db.prepare(
    `UPDATE notes SET
      title=@title, body=@body, tags=@tags, color=@color, created_at=@created_at, order_index=@order_index
     WHERE id=@id`
  ).run({
    id: next.id,
    title: next.title,
    body: next.body || "",
    tags: JSON.stringify(next.tags || []),
    color: next.color || "midnight",
    created_at: next.createdAt || new Date().toISOString(),
    order_index: next.orderIndex ?? 0,
  });
  res.json(next);
});

app.delete("/api/notes/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM notes WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.post("/api/tasks/:id/notify", async (req, res) => {
  try {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    const taskObj = rowToTask(task);
    await sendWhatsAppTemplate(taskObj, "Manual notification");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "WhatsApp error" });
  }
});

function startDueDateScheduler() {
  setInterval(async () => {
    if (!isWhatsAppConfigured()) return;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const timeNow = now.toTimeString().slice(0, 5);
    const rows = db
      .prepare(
        "SELECT * FROM tasks WHERE due = ? AND notify = 1"
      )
      .all(today);
    for (const row of rows) {
      const task = rowToTask(row);
      if (!task.reminder_time) continue;
      const alreadySentKey = `${today}T${task.reminder_time}`;
      if (task.last_notified === alreadySentKey) continue;
      if (timeNow < task.reminder_time) continue;
      if (!task.repeat && task.last_notified) continue;
      try {
        await sendWhatsAppTemplate(
          task,
          task.repeat ? "Recurring reminder" : "Due today"
        );
        db.prepare("UPDATE tasks SET last_notified = ? WHERE id = ?").run(
          alreadySentKey,
          task.id
        );
      } catch (error) {
        console.error("WhatsApp error:", error.message);
      }
    }
  }, 60 * 1000);
}

const port = process.env.PORT || 5174;
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});

startDueDateScheduler();
