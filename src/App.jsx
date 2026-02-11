import React, { useMemo, useState, useEffect } from "react";

const columns = [
  { id: "backlog", label: "Backlog" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

const priorities = [
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

const initialTasks = [
  {
    id: "tsk-1",
    title: "Refresh onboarding flow",
    summary: "Polish copy and add progress gating",
    status: "in_progress",
    priority: "high",
    due: "2026-02-12",
    assignee: "MA",
    project: "Growth",
    progress: 55,
    tags: ["UX", "Experiment"],
  },
  {
    id: "tsk-2",
    title: "Ship mobile dashboard",
    summary: "Compact widgets for exec review",
    status: "review",
    priority: "critical",
    due: "2026-02-10",
    assignee: "LK",
    project: "Core",
    progress: 80,
    tags: ["Mobile"],
  },
  {
    id: "tsk-3",
    title: "Migrate analytics events",
    summary: "Backfill missing signup events",
    status: "backlog",
    priority: "medium",
    due: "2026-02-18",
    assignee: "JS",
    project: "Data",
    progress: 10,
    tags: ["Data"],
  },
  {
    id: "tsk-4",
    title: "Design new pricing page",
    summary: "Hero, FAQ, and comparison table",
    status: "done",
    priority: "low",
    due: "2026-02-05",
    assignee: "NV",
    project: "Marketing",
    progress: 100,
    tags: ["Web"],
  },
  {
    id: "tsk-5",
    title: "Stabilize API response times",
    summary: "Optimize cache + query plan",
    status: "in_progress",
    priority: "critical",
    due: "2026-02-11",
    assignee: "RK",
    project: "Platform",
    progress: 40,
    tags: ["Infra"],
  },
  {
    id: "tsk-6",
    title: "Customer feedback triage",
    summary: "Summarize top issues",
    status: "backlog",
    priority: "high",
    due: "2026-02-14",
    assignee: "AL",
    project: "Support",
    progress: 5,
    tags: ["CS"],
  },
];

const palette = {
  backlog: "#F6C1FF",
  in_progress: "#FFB38A",
  review: "#7DE0FF",
  done: "#95F6B5",
  critical: "#FF4D4D",
  high: "#FF8C42",
  medium: "#FFCC4D",
  low: "#72C2FF",
};

function badgeColor(value) {
  return palette[value] || "#DDE2F3";
}

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function getInitials(name) {
  if (!name) return "NA";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function parseSummaryChecklist(text) {
  const lines = (text || "").split("\n");
  const checklist = [];
  const summaryLines = [];
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("*")) {
      const item = trimmed.replace(/^\*\s*/, "").trim();
      if (item) {
        checklist.push({ text: item, done: false });
      }
    } else {
      summaryLines.push(line);
    }
  });
  return {
    summary: summaryLines.join("\n").trim(),
    checklist,
  };
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("board");
  const [activeSection, setActiveSection] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("dashboard-theme") || "light";
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [draggingId, setDraggingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [detailEdit, setDetailEdit] = useState(false);
  const [detailDraft, setDetailDraft] = useState(null);
  const [notifyStatus, setNotifyStatus] = useState({ status: "idle", message: "" });
  const [notes, setNotes] = useState([]);
  const [notesError, setNotesError] = useState("");
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [noteEditOpen, setNoteEditOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(null);
  const [draggingNoteId, setDraggingNoteId] = useState(null);
  const [dragOverNoteId, setDragOverNoteId] = useState(null);
  const [monitorRange, setMonitorRange] = useState("day");
  const [newNote, setNewNote] = useState({
    title: "",
    body: "",
    tags: "",
    color: "midnight",
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChat, setAiChat] = useState([]);
  const [aiTab, setAiTab] = useState("summary");
  const [now, setNow] = useState(() => new Date());
  const [newTask, setNewTask] = useState({
    title: "",
    summary: "",
    status: "backlog",
    priority: "medium",
    due: "",
    assignee: "",
    project: "",
    tags: "",
    repeatEnabled: false,
    repeatInterval: 1,
    repeatUnit: "weeks",
    repeatEndDate: "",
    notify: false,
    reminder_time: "",
  });

  const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || "/api/ai/v1";
  const AI_MODEL = import.meta.env.VITE_AI_MODEL || "local-model";

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = !term
        ? true
        : [task.title, task.summary, task.project, task.tags.join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(term);
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const insights = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.status === "done").length;
    const critical = tasks.filter((task) => task.priority === "critical").length;
    const dueSoon = tasks.filter((task) => task.due <= "2026-02-12").length;
    return { total, done, critical, dueSoon };
  }, [tasks]);

  const monitorStats = useMemo(() => {
    const nowDate = new Date();
    const start = new Date(nowDate);
    if (monitorRange === "day") {
      start.setHours(0, 0, 0, 0);
    } else if (monitorRange === "week") {
      const day = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
    } else if (monitorRange === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    }
    const created = tasks.filter((task) => {
      if (!task.createdAt) return false;
      return new Date(task.createdAt) >= start;
    }).length;
    const completed = tasks.filter((task) => {
      if (!task.completedAt) return false;
      return new Date(task.completedAt) >= start;
    }).length;
    const active = tasks.filter((task) => task.status !== "done").length;
    const overdue = tasks.filter((task) => {
      if (!task.due) return false;
      return task.status !== "done" && new Date(task.due) < nowDate;
    }).length;
    return { created, completed, active, overdue };
  }, [tasks, monitorRange]);

  function handleDrop(status) {
    if (!draggingId) return;
    setTasks((prev) =>
      prev.map((task) =>
        task.id === draggingId ? { ...task, status } : task
      )
    );
    fetch(`/api/tasks/${draggingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
    setDraggingId(null);
  }

  function handleStatusChange(taskId, status) {
    const completedAt = status === "done" ? new Date().toISOString() : null;
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              repeat: status === "done" ? null : task.repeat,
              completedAt,
            }
          : task
      )
    );
    fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        repeat: status === "done" ? null : undefined,
        completedAt,
      }),
    }).catch(() => {});
  }

  function handleCreateTask(e) {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    const id = `tsk-${Date.now()}`;
    const parsed = parseSummaryChecklist(newTask.summary);
    const task = {
      id,
      title: newTask.title.trim(),
      summary: parsed.summary || "No summary yet",
      status: newTask.status,
      priority: newTask.priority,
      due: newTask.due || "2026-02-20",
      assignee: newTask.assignee.trim() || "NA",
      project: newTask.project.trim() || "General",
      progress: 0,
      tags: newTask.tags
        ? newTask.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        : [],
      createdAt: new Date().toISOString(),
      completedAt: newTask.status === "done" ? new Date().toISOString() : null,
      repeat: newTask.repeatEnabled
        ? {
            interval: Number(newTask.repeatInterval) || 1,
            unit: newTask.repeatUnit,
            endDate: newTask.repeatEndDate || null,
          }
        : null,
      notify: newTask.notify,
      reminder_time: newTask.reminder_time || null,
      checklist: parsed.checklist,
    };
    setTasks((prev) => [task, ...prev]);
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    }).catch(() => {});
    setFormOpen(false);
    setNewTask({
      title: "",
      summary: "",
      status: "backlog",
      priority: "medium",
      due: "",
      assignee: "",
      project: "",
      tags: "",
      repeatEnabled: false,
      repeatInterval: 1,
      repeatUnit: "weeks",
      repeatEndDate: "",
      notify: false,
      reminder_time: "",
    });
  }

  function openTask(task) {
    setDetailTask(task);
    setDetailEdit(false);
    setDetailDraft({
      ...task,
      tags: task.tags.join(", "),
      summary: [
        task.summary,
        ...(task.checklist || []).map((item) => `* ${item.text}`),
      ]
        .filter(Boolean)
        .join("\n"),
      repeatEnabled: !!task.repeat,
      repeatInterval: task.repeat?.interval ?? 1,
      repeatUnit: task.repeat?.unit ?? "weeks",
      repeatEndDate: task.repeat?.endDate ?? "",
    });
    setNotifyStatus({ status: "idle", message: "" });
  }

  function closeTask() {
    setDetailTask(null);
    setDetailEdit(false);
    setDetailDraft(null);
    setNotifyStatus({ status: "idle", message: "" });
  }

  function deleteTask(taskId) {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setDetailTask((prev) => (prev?.id === taskId ? null : prev));
    fetch(`/api/tasks/${taskId}`, { method: "DELETE" }).catch(() => {});
  }

  function saveTaskEdits() {
    if (!detailDraft || !detailTask) return;
    const parsed = parseSummaryChecklist(detailDraft.summary);
    const updates = {
      title: detailDraft.title?.trim() || detailTask.title,
      summary: parsed.summary || detailTask.summary,
      status: detailDraft.status || detailTask.status,
      priority: detailDraft.priority || detailTask.priority,
      due: detailDraft.due || detailTask.due,
      assignee: detailDraft.assignee?.trim() || detailTask.assignee,
      project: detailDraft.project?.trim() || detailTask.project,
      tags: detailDraft.tags
        ? detailDraft.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      notify: !!detailDraft.notify,
      reminder_time: detailDraft.reminder_time || null,
      repeat: detailDraft.repeatEnabled
        ? {
            interval: Number(detailDraft.repeatInterval) || 1,
            unit: detailDraft.repeatUnit || "weeks",
            endDate: detailDraft.repeatEndDate || null,
          }
        : null,
      checklist: parsed.checklist.length ? parsed.checklist : detailTask.checklist,
    };
    setTasks((prev) =>
      prev.map((task) => (task.id === detailTask.id ? { ...task, ...updates } : task))
    );
    setDetailTask((prev) => (prev ? { ...prev, ...updates } : prev));
    fetch(`/api/tasks/${detailTask.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => {});
    setDetailEdit(false);
  }

  async function sendWhatsApp(taskId) {
    setNotifyStatus({ status: "loading", message: "" });
    try {
      const response = await fetch(`/api/tasks/${taskId}/notify`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send WhatsApp");
      }
      setNotifyStatus({ status: "success", message: "Sent." });
    } catch (error) {
      setNotifyStatus({ status: "error", message: error.message });
    }
  }

  function toggleChecklistItem(taskId, index) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const nextChecklist = (task.checklist || []).map((item, idx) =>
          idx === index ? { ...item, done: !item.done } : item
        );
        fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checklist: nextChecklist }),
        }).catch(() => {});
        return { ...task, checklist: nextChecklist };
      })
    );
    if (detailTask?.id === taskId) {
      setDetailTask((prev) => {
        if (!prev) return prev;
        const nextChecklist = (prev.checklist || []).map((item, idx) =>
          idx === index ? { ...item, done: !item.done } : item
        );
        return { ...prev, checklist: nextChecklist };
      });
    }
  }

  function taskContext() {
    return tasks
      .map(
        (task) =>
          `${task.id} | ${task.title} | ${task.summary} | status:${task.status} | priority:${task.priority} | due:${task.due} | project:${task.project} | tags:${task.tags.join(",")}`
      )
      .join("\n");
  }

  async function callLLM(messages, { temperature = 0.4, max_tokens = 400 } = {}) {
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        temperature,
        max_tokens,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "AI request failed");
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  function buildUserPrompt(instruction, payload) {
    return {
      role: "user",
      content: `${instruction}\n\n${payload}`,
    };
  }

  function parseAiJson(content) {
    if (!content) return null;
    let text = content.trim();
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
      text = fenceMatch[1].trim();
    }
    if (text[0] !== "{" && text[0] !== "[") {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        text = text.slice(start, end + 1);
      }
    }
    return JSON.parse(text);
  }

  async function runAi(action) {
    setAiError("");
    setAiOutput("");
    setAiBusy(true);
    try {
      if (action === "summary") {
        const content = await callLLM([
          buildUserPrompt(
            "Summarize the task board. Return a concise executive summary in 5 bullet points.",
            taskContext()
          ),
        ]);
        setAiOutput(content);
      }
      if (action === "priority") {
        const content = await callLLM([
          buildUserPrompt(
            "Suggest task priorities. Return ONLY JSON array of {id, priority} with priority in [critical, high, medium, low].",
            taskContext()
          ),
        ]);
        const parsed = parseAiJson(content);
        setTasks((prev) =>
          prev.map((task) => {
            const match = parsed.find((item) => item.id === task.id);
            if (!match) return task;
            fetch(`/api/tasks/${task.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ priority: match.priority }),
            }).catch(() => {});
            return { ...task, priority: match.priority };
          })
        );
        setAiOutput("Priorities updated.");
      }
      if (action === "next") {
        const content = await callLLM([
          buildUserPrompt(
            "Recommend next best actions. Return a short ordered list.",
            taskContext()
          ),
        ]);
        setAiOutput(content);
      }
      if (action === "autotag") {
        const content = await callLLM([
          buildUserPrompt(
            "Tag tasks. Return ONLY JSON array of {id, tags} where tags is an array of short labels.",
            taskContext()
          ),
        ]);
        const parsed = parseAiJson(content);
        setTasks((prev) =>
          prev.map((task) => {
            const match = parsed.find((item) => item.id === task.id);
            if (!match) return task;
            fetch(`/api/tasks/${task.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tags: match.tags }),
            }).catch(() => {});
            return { ...task, tags: match.tags };
          })
        );
        setAiOutput("Tags updated.");
      }
      if (action === "nlp") {
        const content = await callLLM([
          buildUserPrompt(
            "Convert the request into a task. Return ONLY JSON with fields: title, summary, status, priority, due, assignee, project, tags (array). Use status in [backlog,in_progress,review,done] and priority in [critical,high,medium,low].",
            aiInput
          ),
        ]);
        const parsed = parseAiJson(content);
        const id = `tsk-${Date.now()}`;
        const task = {
          id,
          title: parsed.title || "New task",
          summary: parsed.summary || "No summary yet",
          status: parsed.status || "backlog",
          priority: parsed.priority || "medium",
          due: parsed.due || "2026-02-20",
          assignee: parsed.assignee || "NA",
          project: parsed.project || "General",
          progress: 0,
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          repeat: null,
        };
        setTasks((prev) => [task, ...prev]);
        fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
        }).catch(() => {});
        setAiOutput("Task created.");
      }
    } catch (error) {
      setAiError(error.message || "AI request failed");
    } finally {
      setAiBusy(false);
    }
  }

  async function sendChat() {
    if (!aiChatInput.trim()) return;
    const userMessage = { role: "user", content: aiChatInput.trim() };
    const nextChat = [...aiChat, userMessage];
    setAiChat(nextChat);
    setAiChatInput("");
    setAiBusy(true);
    setAiError("");
    try {
      const contextMessage = buildUserPrompt(
        "You are a task assistant. You can create or edit tasks when asked. " +
          "Return ONLY JSON (no extra text, no code fences) with fields: response (string) and actions (array). " +
          "Each action is one of: " +
          "{type:'create', task:{title,summary,status,priority,due,assignee,project,tags}} " +
          "or {type:'update', id, updates:{title,summary,status,priority,due,assignee,project,tags}}. " +
          "Use status in [backlog,in_progress,review,done] and priority in [critical,high,medium,low]. " +
          "If no changes needed, return actions: [].",
        `Tasks:\n${taskContext()}`
      );
      const content = await callLLM([contextMessage, ...nextChat], {
        temperature: 0.4,
      });
      let parsed;
      try {
        parsed = parseAiJson(content);
      } catch (err) {
        throw new Error("AI returned invalid JSON. Try again.");
      }
      const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
      if (actions.length) {
        setTasks((prev) => {
          let nextTasks = [...prev];
          actions.forEach((action) => {
            if (action.type === "create" && action.task) {
              const id = `tsk-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              const task = {
                id,
                title: action.task.title || "New task",
                summary: action.task.summary || "No summary yet",
                status: action.task.status || "backlog",
                priority: action.task.priority || "medium",
                due: action.task.due || "2026-02-20",
                assignee: action.task.assignee || "NA",
                project: action.task.project || "General",
                progress: 0,
                tags: Array.isArray(action.task.tags) ? action.task.tags : [],
                repeat: null,
              };
              nextTasks = [task, ...nextTasks];
              fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(task),
              }).catch(() => {});
            }
            if (action.type === "update" && action.id && action.updates) {
              nextTasks = nextTasks.map((task) =>
                task.id === action.id
                  ? { ...task, ...action.updates }
                  : task
              );
              fetch(`/api/tasks/${action.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(action.updates),
              }).catch(() => {});
            }
          });
          return nextTasks;
        });
      }
      const responseText =
        parsed.response || "Done. I updated your tasks as requested.";
      setAiChat((prev) => [...prev, { role: "assistant", content: responseText }]);
    } catch (error) {
      setAiError(error.message || "AI request failed");
    } finally {
      setAiBusy(false);
    }
  }

  function parseDate(value) {
    if (!value) return null;
    return new Date(`${value}T00:00:00`);
  }

  function formatDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function advanceDate(date, interval, unit) {
    const next = new Date(date);
    if (unit === "days") {
      next.setDate(next.getDate() + interval);
    } else if (unit === "weeks") {
      next.setDate(next.getDate() + interval * 7);
    } else {
      next.setMonth(next.getMonth() + interval);
    }
    return next;
  }

  function advanceRecurringTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let changed = false;
    const updated = tasks.map((task) => {
      if (!task.repeat || task.status === "done" || !task.due) return task;
      const dueDate = parseDate(task.due);
      if (!dueDate) return task;
      const endDate = task.repeat.endDate
        ? parseDate(task.repeat.endDate)
        : null;
      let nextDue = new Date(dueDate);
      while (nextDue < today) {
        const candidate = advanceDate(
          nextDue,
          task.repeat.interval,
          task.repeat.unit
        );
        if (endDate && candidate > endDate) break;
        nextDue = candidate;
      }
      if (nextDue.getTime() !== dueDate.getTime()) {
        changed = true;
        fetch(`/api/tasks/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ due: formatDate(nextDue) }),
        }).catch(() => {});
        return { ...task, due: formatDate(nextDue) };
      }
      return task;
    });
    if (changed) {
      setTasks(updated);
    }
  }

  useEffect(() => {
    async function loadTasks() {
      try {
        const response = await fetch("/api/tasks");
        if (!response.ok) throw new Error("Failed to load tasks");
        const data = await response.json();
        if (data.length === 0) {
          setTasks([]);
          return;
        }
        setTasks(data);
      } catch (error) {
        setTasks([]);
      }
    }
    loadTasks();
    advanceRecurringTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveNotesLocal(nextNotes) {
    try {
      window.localStorage.setItem("notes-cache", JSON.stringify(nextNotes));
    } catch (error) {
      // ignore
    }
  }

  function loadNotesLocal() {
    try {
      const cached = window.localStorage.getItem("notes-cache");
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      return [];
    }
  }

  useEffect(() => {
    async function loadNotes() {
      try {
        const response = await fetch("/api/notes");
        if (!response.ok) throw new Error("Failed to load notes");
        const data = await response.json();
        setNotes(data);
        saveNotesLocal(data);
        setNotesError("");
      } catch (error) {
        const localNotes = loadNotesLocal();
        setNotes(localNotes);
        setNotesError("Notes API offline. Showing local cache.");
      }
    }
    loadNotes();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dashboard-theme", theme);
  }, [theme]);

  const navItems = ["Overview", "Notes", "Monitor"];

  function formatDateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function getBuckets(range) {
    const nowDate = new Date();
    if (range === "day") {
      const start = startOfDay(addDays(nowDate, -6));
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    if (range === "week") {
      const buckets = [];
      const start = startOfDay(addDays(nowDate, -7 * 7));
      for (let i = 0; i < 8; i += 1) {
        buckets.push(addDays(start, i * 7));
      }
      return buckets;
    }
    if (range === "month") {
      const buckets = [];
      const start = new Date(nowDate.getFullYear(), nowDate.getMonth() - 11, 1);
      for (let i = 0; i < 12; i += 1) {
        buckets.push(new Date(start.getFullYear(), start.getMonth() + i, 1));
      }
      return buckets;
    }
    const buckets = [];
    const start = new Date(nowDate.getFullYear() - 4, 0, 1);
    for (let i = 0; i < 5; i += 1) {
      buckets.push(new Date(start.getFullYear() + i, 0, 1));
    }
    return buckets;
  }

  function bucketLabel(range, date) {
    if (range === "day") return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (range === "week") return `Wk ${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString(undefined, { month: "short" })}`;
    if (range === "month") return date.toLocaleDateString(undefined, { month: "short" });
    return date.getFullYear().toString();
  }

  function computeSeries(range) {
    const buckets = getBuckets(range);
    const created = buckets.map(() => 0);
    const completed = buckets.map(() => 0);
    const overdue = buckets.map(() => 0);
    const bucketEnds = buckets.map((bucket, index) => {
      if (range === "day") return addDays(bucket, 1);
      if (range === "week") return addDays(bucket, 7);
      if (range === "month") return new Date(bucket.getFullYear(), bucket.getMonth() + 1, 1);
      return new Date(bucket.getFullYear() + 1, 0, 1);
    });

    tasks.forEach((task) => {
      const createdAt = task.createdAt ? new Date(task.createdAt) : null;
      const completedAt = task.completedAt ? new Date(task.completedAt) : null;
      buckets.forEach((bucket, index) => {
        const end = bucketEnds[index];
        if (createdAt && createdAt >= bucket && createdAt < end) created[index] += 1;
        if (completedAt && completedAt >= bucket && completedAt < end) completed[index] += 1;
      });
    });

    buckets.forEach((bucket, index) => {
      const end = bucketEnds[index];
      overdue[index] = tasks.filter((task) => {
        if (!task.due) return false;
        const dueDate = new Date(task.due);
        const completedAt = task.completedAt ? new Date(task.completedAt) : null;
        return dueDate < end && (!completedAt || completedAt >= end);
      }).length;
    });

    return { buckets, created, completed, overdue };
  }

  function handleCreateNote(e) {
    e.preventDefault();
    if (!newNote.title.trim()) return;
    const nextIndex = notes.length;
    const note = {
      id: `note-${Date.now()}`,
      title: newNote.title.trim(),
      body: newNote.body.trim(),
      tags: newNote.tags
        ? newNote.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      color: newNote.color,
      createdAt: new Date().toISOString(),
      orderIndex: nextIndex,
    };
    setNotes((prev) => [note, ...prev]);
    saveNotesLocal([note, ...notes]);
    fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note),
    }).catch(() => {
      setNotesError("Notes API offline. Saved locally.");
    });
    setNoteFormOpen(false);
    setNewNote({ title: "", body: "", tags: "", color: "midnight" });
  }

  function openNote(note) {
    setNoteDraft({ ...note, tags: note.tags.join(", ") });
    setNoteEditOpen(true);
  }

  function saveNoteEdits(e) {
    e.preventDefault();
    if (!noteDraft) return;
    const updates = {
      ...noteDraft,
      title: noteDraft.title.trim() || "Untitled",
      body: noteDraft.body?.trim() || "",
      tags: noteDraft.tags
        ? noteDraft.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    };
    setNotes((prev) =>
      prev.map((note) => (note.id === updates.id ? updates : note))
    );
    saveNotesLocal(
      notes.map((note) => (note.id === updates.id ? updates : note))
    );
    fetch(`/api/notes/${updates.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => {
      setNotesError("Notes API offline. Saved locally.");
    });
    setNoteEditOpen(false);
    setNoteDraft(null);
  }

  function moveNote(targetId) {
    if (!draggingNoteId || draggingNoteId === targetId) return;
    setNotes((prev) => {
      const currentIndex = prev.findIndex((note) => note.id === draggingNoteId);
      const targetIndex = prev.findIndex((note) => note.id === targetId);
      if (currentIndex === -1 || targetIndex === -1) return prev;
      const next = [...prev];
      const temp = next[currentIndex];
      next[currentIndex] = next[targetIndex];
      next[targetIndex] = temp;
      saveNotesLocal(next);
      fetch(`/api/notes/${next[currentIndex].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIndex: currentIndex }),
      }).catch(() => {
        setNotesError("Notes API offline. Saved locally.");
      });
      fetch(`/api/notes/${next[targetIndex].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIndex: targetIndex }),
      }).catch(() => {
        setNotesError("Notes API offline. Saved locally.");
      });
      return next;
    });
    setDraggingNoteId(null);
    setDragOverNoteId(null);
  }

  return (
    <div
      className={classNames(
        "app",
        !sidebarOpen && "app--collapsed",
        theme === "dark" && "theme-dark"
      )}
    >
      <aside className={classNames("sidebar", !sidebarOpen && "collapsed")}>
          <div className="logo-row">
            <div className="logo">TaskFlow</div>
            <button
            className="icon-btn panel-icon"
            onClick={() => setSidebarOpen(false)}
            aria-label="Hide sidebar"
            type="button"
          >
            <span className="panel-glyph">▮▯</span>
          </button>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item}
              className={classNames(
                "nav-item",
                activeSection === item && "active"
              )}
              onClick={() => setActiveSection(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="team-card clock-card">
            <div className="team-card__title">Matrix</div>
            <div className="clock">
              <div className="clock-face" />
              <div
                className="hand hour"
                style={{
                  transform: `translate(-50%, -100%) rotate(${
                    ((now.getHours() % 12) + now.getMinutes() / 60) * 30
                  }deg)`,
                }}
              />
              <div
                className="hand minute"
                style={{
                  transform: `translate(-50%, -100%) rotate(${
                    (now.getMinutes() + now.getSeconds() / 60) * 6
                  }deg)`,
                }}
              />
              <div
                className="hand second"
                style={{
                  transform: `translate(-50%, -100%) rotate(${
                    now.getSeconds() * 6
                  }deg)`,
                }}
              />
              <div className="clock-center" />
            </div>
            <div className="clock-date">
              {now.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">RDT Group - Success Visions</p>
            <h1>Board</h1>
            <div className="section-pill">{activeSection}</div>
          </div>
          <div className="topbar-actions">
            {!sidebarOpen && (
              <button
                className="icon-btn light panel-icon"
                onClick={() => setSidebarOpen(true)}
                type="button"
              >
                <span className="panel-glyph">▮▯</span>
              </button>
            )}
            <button
              className="ghost-btn"
              onClick={() =>
                setTheme((prev) => (prev === "dark" ? "light" : "dark"))
              }
              type="button"
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <div className="pill">
              <span className="mono">
                {now
                  .toLocaleDateString(undefined, {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })
                  .toUpperCase()}
              </span>
            </div>
            <button className="ghost-btn" onClick={() => setAiOpen(true)}>
              AI
            </button>
            {activeSection === "Overview" && (
              <button className="primary-btn" onClick={() => setFormOpen(true)}>
                + New task
              </button>
            )}
            {activeSection === "Notes" && (
              <button className="primary-btn" onClick={() => setNoteFormOpen(true)}>
                + New note
              </button>
            )}
          </div>
        </header>

        {activeSection === "Overview" && (
          <section className="insights">
            <InsightCard label="Total tasks" value={insights.total} trend="+8%" />
            <InsightCard label="Completed" value={insights.done} trend="+3%" />
            <InsightCard label="Critical" value={insights.critical} trend="-2%" />
            <InsightCard
              label="Due in 3 days"
              value={insights.dueSoon}
              trend="+5"
            />
          </section>
        )}

        {activeSection !== "Overview" &&
          activeSection !== "Notes" &&
          activeSection !== "Monitor" && (
          <section className="section-banner">
            <div>
              <h2>{activeSection}</h2>
              <p>
                This section is ready for custom widgets. Tell me what you want
                to track here.
              </p>
            </div>
            <button className="primary-btn" onClick={() => setFormOpen(true)}>
              Add widget
            </button>
          </section>
        )}

        {activeSection === "Notes" && (
          <section className="notes-board">
            {notesError && <div className="notes-error">{notesError}</div>}
            {notes.length === 0 ? (
              <div className="notes-empty">
                No notes yet. Create your first note.
              </div>
            ) : (
              <div className="notes-grid">
                {notes.map((note) => (
                  <article
                    key={note.id}
                    className={`note-card ${note.color} ${
                      dragOverNoteId === note.id ? "drag-over" : ""
                    }`}
                    draggable
                    onDragStart={() => setDraggingNoteId(note.id)}
                    onDragEnd={() => setDraggingNoteId(null)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverNoteId(note.id);
                    }}
                    onDrop={() => moveNote(note.id)}
                    onClick={() => openNote(note)}
                  >
                    <h4>{note.title}</h4>
                    <p>{note.body || "No content yet."}</p>
                    {note.tags.length > 0 && (
                      <div className="card-tags">
                        {note.tags.map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="note-meta">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeSection === "Monitor" && (
          <section className="monitor-section">
            <div className="monitor-header">
              <div className="monitor-tabs">
                {[
                  { id: "day", label: "Daily" },
                  { id: "week", label: "Weekly" },
                  { id: "month", label: "Monthly" },
                  { id: "year", label: "Yearly" },
                ].map((item) => (
                  <button
                    key={item.id}
                    className={classNames(
                      "monitor-tab",
                      monitorRange === item.id && "active"
                    )}
                    onClick={() => setMonitorRange(item.id)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="monitor-metrics">
              <div>
                <span>Created</span>
                <strong>{monitorStats.created}</strong>
              </div>
              <div>
                <span>Completed</span>
                <strong>{monitorStats.completed}</strong>
              </div>
              <div>
                <span>Active</span>
                <strong>{monitorStats.active}</strong>
              </div>
              <div>
                <span>Overdue</span>
                <strong>{monitorStats.overdue}</strong>
              </div>
            </div>
            <MonitorCharts range={monitorRange} series={computeSeries(monitorRange)} tasks={tasks} />
          </section>
        )}

        {activeSection === "Overview" && (
          <section className="overview-shell">
            <div className="controls">
              <div className="search">
                <input
                  placeholder="Search tasks, tags, or projects"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="filters">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.label}
                    </option>
                  ))}
                </select>
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                >
                  <option value="all">All priorities</option>
                  {priorities.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="view-toggle">
                <button
                  className={classNames("toggle", view === "board" && "active")}
                  onClick={() => setView("board")}
                >
                  Board
                </button>
                <button
                  className={classNames("toggle", view === "list" && "active")}
                  onClick={() => setView("list")}
                >
                  List
                </button>
              </div>
            </div>
            {view === "board" ? (
              <section className="board">
                {columns.map((column) => {
                  const tasksInColumn = filteredTasks.filter(
                    (task) => task.status === column.id
                  );
                  return (
                    <div
                      key={column.id}
                      className="column"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(column.id)}
                    >
                      <div className="column-header">
                        <div>
                          <h3>{column.label}</h3>
                          <span>{tasksInColumn.length} tasks</span>
                        </div>
                        <span className="column-pill" />
                      </div>
                      <div className="column-body">
                        {tasksInColumn.map((task) => (
                          <article
                            key={task.id}
                            className="card"
                            draggable
                            onDragStart={() => setDraggingId(task.id)}
                            onDragEnd={() => setDraggingId(null)}
                            onClick={() => openTask(task)}
                          >
                            <div className="card-header">
                              <span
                                className="badge"
                                style={{ background: badgeColor(task.priority) }}
                              >
                                {task.priority.toUpperCase()}
                              </span>
                              <span className="mono">{task.project}</span>
                            </div>
                            <h4>{task.title}</h4>
                            <p>{task.summary}</p>
                            <div className="card-tags">
                              {task.tags.map((tag) => (
                                <span key={tag} className="tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="card-footer">
                              <div className="progress">
                                <div
                                  className="progress-bar"
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                              <div className="meta">
                                <span className="meta-left">
                                  {task.repeat && (
                                    <span className="repeat-pill">Repeat</span>
                                  )}
                                  <span className="mono">Due {task.due}</span>
                                </span>
                                <span className="avatar">
                                  {getInitials(task.assignee)}
                                </span>
                              </div>
                            </div>
                          </article>
                        ))}
                        {tasksInColumn.length === 0 && (
                          <div className="empty">Drop tasks here</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            ) : (
              <section className="list">
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Due</th>
                      <th>Owner</th>
                      <th>Project</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr key={task.id} onClick={() => openTask(task)}>
                        <td>
                          <div className="list-title">{task.title}</div>
                          <div className="list-summary">{task.summary}</div>
                        </td>
                        <td>
                          <select
                            value={task.status}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              handleStatusChange(task.id, event.target.value)
                            }
                          >
                            {columns.map((col) => (
                              <option key={col.id} value={col.id}>
                                {col.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{ background: badgeColor(task.priority) }}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="mono">{task.due}</td>
                        <td>
                          <span className="avatar">{task.assignee}</span>
                        </td>
                        <td className="mono">{task.project}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </section>
        )}
      </main>

      {formOpen && (
        <div className="modal-backdrop" onClick={() => setFormOpen(false)}>
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Create new task</h2>
              <button className="ghost-btn" onClick={() => setFormOpen(false)}>
                Close
              </button>
            </div>
            <form className="modal-form" onSubmit={handleCreateTask}>
              <label>
                Title
                <input
                  value={newTask.title}
                  onChange={(event) =>
                    setNewTask((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g. Launch new campaign"
                  required
                />
              </label>
              <label>
                Summary
                <textarea
                  value={newTask.summary}
                  onChange={(event) =>
                    setNewTask((prev) => ({
                      ...prev,
                      summary: event.target.value,
                    }))
                  }
                  placeholder="What needs to happen? Use * for checklist items"
                />
              </label>
              <div className="grid">
                <label>
                  Status
                  <select
                    value={newTask.status}
                    onChange={(event) =>
                      setNewTask((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                  >
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Priority
                  <select
                    value={newTask.priority}
                    onChange={(event) =>
                      setNewTask((prev) => ({
                        ...prev,
                        priority: event.target.value,
                      }))
                    }
                  >
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Due date
                  <input
                    type="date"
                    value={newTask.due}
                    onChange={(event) =>
                      setNewTask((prev) => ({
                        ...prev,
                        due: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Assignee (initials)
                  <input
                    value={newTask.assignee}
                    onChange={(event) =>
                      setNewTask((prev) => ({
                        ...prev,
                        assignee: event.target.value,
                      }))
                    }
                    placeholder="e.g. MA"
                  />
                </label>
                <label>
                  Project
                  <input
                    value={newTask.project}
                    onChange={(event) =>
                      setNewTask((prev) => ({
                        ...prev,
                        project: event.target.value,
                      }))
                    }
                    placeholder="e.g. Growth"
                  />
                </label>
                <label>
                  Tags (comma separated)
                  <input
                    value={newTask.tags}
                    onChange={(event) =>
                      setNewTask((prev) => ({
                        ...prev,
                        tags: event.target.value,
                      }))
                    }
                    placeholder="UX, Experiment"
                  />
                </label>
              </div>
              <div className="repeat-block">
                <label className="repeat-toggle">
                  <input
                    type="checkbox"
                    checked={newTask.notify}
                    onChange={(event) =>
                      setNewTask((prev) => ({
                        ...prev,
                        notify: event.target.checked,
                      }))
                    }
                  />
                  Send WhatsApp notification
                </label>
                {newTask.notify && (
                  <label>
                    Reminder time
                    <input
                      type="time"
                      value={newTask.reminder_time}
                      onChange={(event) =>
                        setNewTask((prev) => ({
                          ...prev,
                          reminder_time: event.target.value,
                        }))
                      }
                    />
                  </label>
                )}
                <label className="repeat-toggle">
                  <input
                    type="checkbox"
                    checked={newTask.repeatEnabled}
                    onChange={(event) =>
                      setNewTask((prev) => ({
                        ...prev,
                        repeatEnabled: event.target.checked,
                      }))
                    }
                  />
                  Repeat task
                </label>
                {newTask.repeatEnabled && (
                  <div className="repeat-grid">
                    <label>
                      Every
                      <input
                        type="number"
                        min="1"
                        value={newTask.repeatInterval}
                        onChange={(event) =>
                          setNewTask((prev) => ({
                            ...prev,
                            repeatInterval: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Unit
                      <select
                        value={newTask.repeatUnit}
                        onChange={(event) =>
                          setNewTask((prev) => ({
                            ...prev,
                            repeatUnit: event.target.value,
                          }))
                        }
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                    </label>
                    <label>
                      End date (optional)
                      <input
                        type="date"
                        value={newTask.repeatEndDate}
                        onChange={(event) =>
                          setNewTask((prev) => ({
                            ...prev,
                            repeatEndDate: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Create task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {noteFormOpen && (
        <div className="modal-backdrop" onClick={() => setNoteFormOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Create new note</h2>
              <button className="ghost-btn" onClick={() => setNoteFormOpen(false)}>
                Close
              </button>
            </div>
            <form className="modal-form" onSubmit={handleCreateNote}>
              <label>
                Title
                <input
                  value={newNote.title}
                  onChange={(event) =>
                    setNewNote((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Note title"
                  required
                />
              </label>
              <label>
                Content
                <textarea
                  value={newNote.body}
                  onChange={(event) =>
                    setNewNote((prev) => ({ ...prev, body: event.target.value }))
                  }
                  placeholder="Write your note..."
                />
              </label>
              <div className="grid">
                <label>
                  Tags (comma separated)
                  <input
                    value={newNote.tags}
                    onChange={(event) =>
                      setNewNote((prev) => ({ ...prev, tags: event.target.value }))
                    }
                    placeholder="ideas, research"
                  />
                </label>
                <label>
                  Color
                  <select
                    value={newNote.color}
                    onChange={(event) =>
                      setNewNote((prev) => ({ ...prev, color: event.target.value }))
                    }
                  >
                    <option value="midnight">Midnight</option>
                    <option value="indigo">Indigo</option>
                    <option value="teal">Teal</option>
                    <option value="sunset">Sunset</option>
                  </select>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setNoteFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Create note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {noteEditOpen && noteDraft && (
        <div className="modal-backdrop" onClick={() => setNoteEditOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit note</h2>
              <button className="ghost-btn" onClick={() => setNoteEditOpen(false)}>
                Close
              </button>
            </div>
            <form className="modal-form" onSubmit={saveNoteEdits}>
              <label>
                Title
                <input
                  value={noteDraft.title}
                  onChange={(event) =>
                    setNoteDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>
              <label>
                Content
                <textarea
                  value={noteDraft.body}
                  onChange={(event) =>
                    setNoteDraft((prev) => ({ ...prev, body: event.target.value }))
                  }
                />
              </label>
              <div className="grid">
                <label>
                  Tags (comma separated)
                  <input
                    value={noteDraft.tags}
                    onChange={(event) =>
                      setNoteDraft((prev) => ({ ...prev, tags: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Color
                  <select
                    value={noteDraft.color}
                    onChange={(event) =>
                      setNoteDraft((prev) => ({ ...prev, color: event.target.value }))
                    }
                  >
                    <option value="midnight">Midnight</option>
                    <option value="indigo">Indigo</option>
                    <option value="teal">Teal</option>
                    <option value="sunset">Sunset</option>
                  </select>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setNoteEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailTask && (
        <div className="modal-backdrop" onClick={closeTask}>
          <div
            className="modal detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {detailEdit ? (
                  <input
                    className="detail-input title"
                    value={detailDraft?.title || ""}
                    onChange={(event) =>
                      setDetailDraft((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                ) : (
                  detailTask.title
                )}
              </h2>
              <div className="modal-header-actions">
                <button
                  className="danger-btn"
                  onClick={() => deleteTask(detailTask.id)}
                  type="button"
                >
                  Delete
                </button>
                {detailEdit ? (
                  <button className="primary-btn" onClick={saveTaskEdits} type="button">
                    Save
                  </button>
                ) : (
                  <button
                    className="ghost-btn"
                    onClick={() => setDetailEdit(true)}
                    type="button"
                  >
                    Edit
                  </button>
                )}
                <button
                  className="ghost-btn"
                  onClick={() => sendWhatsApp(detailTask.id)}
                  type="button"
                >
                  Send WhatsApp
                </button>
                <button className="ghost-btn" onClick={closeTask} type="button">
                  Close
                </button>
              </div>
            </div>
            {notifyStatus.status !== "idle" && (
              <div
                className={classNames(
                  "notify-status",
                  notifyStatus.status === "error" && "error"
                )}
              >
                {notifyStatus.status === "loading" ? "Sending..." : notifyStatus.message}
              </div>
            )}
            <div className="detail-grid">
              <div className="detail-block summary">
                <h3>Summary</h3>
                {detailEdit ? (
                  <textarea
                    className="detail-input"
                    value={detailDraft?.summary || ""}
                    onChange={(event) =>
                      setDetailDraft((prev) => ({ ...prev, summary: event.target.value }))
                    }
                  />
                ) : (
                  <p>{detailTask.summary}</p>
                )}
              </div>
              <div className="detail-block">
                <h3>Status</h3>
                {detailEdit ? (
                  <select
                    className="detail-input"
                    value={detailDraft?.status || detailTask.status}
                    onChange={(event) =>
                      setDetailDraft((prev) => ({ ...prev, status: event.target.value }))
                    }
                  >
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p>{columns.find((col) => col.id === detailTask.status)?.label}</p>
                )}
              </div>
              <div className="detail-block">
                <h3>Priority</h3>
                {detailEdit ? (
                  <select
                    className="detail-input"
                    value={detailDraft?.priority || detailTask.priority}
                    onChange={(event) =>
                      setDetailDraft((prev) => ({
                        ...prev,
                        priority: event.target.value,
                      }))
                    }
                  >
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="badge"
                    style={{ background: badgeColor(detailTask.priority) }}
                  >
                    {detailTask.priority.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="detail-block">
                <h3>Project</h3>
                {detailEdit ? (
                  <input
                    className="detail-input"
                    value={detailDraft?.project || ""}
                    onChange={(event) =>
                      setDetailDraft((prev) => ({ ...prev, project: event.target.value }))
                    }
                  />
                ) : (
                  <p className="mono">{detailTask.project}</p>
                )}
              </div>
              <div className="detail-block">
                <h3>Due</h3>
                {detailEdit ? (
                  <input
                    className="detail-input"
                    type="date"
                    value={detailDraft?.due || ""}
                    onChange={(event) =>
                      setDetailDraft((prev) => ({ ...prev, due: event.target.value }))
                    }
                  />
                ) : (
                  <p className="mono">{detailTask.due}</p>
                )}
              </div>
              <div className="detail-block">
                <h3>WhatsApp</h3>
                {detailEdit ? (
                  <div className="detail-whatsapp">
                    <label className="repeat-toggle">
                      <input
                        type="checkbox"
                        checked={!!detailDraft?.notify}
                        onChange={(event) =>
                          setDetailDraft((prev) => ({
                            ...prev,
                            notify: event.target.checked,
                          }))
                        }
                      />
                      Notify
                    </label>
                    <input
                      className="detail-input"
                      type="time"
                      value={detailDraft?.reminder_time || ""}
                      onChange={(event) =>
                        setDetailDraft((prev) => ({
                          ...prev,
                          reminder_time: event.target.value,
                        }))
                      }
                    />
                  </div>
                ) : (
                  <p className="mono">
                    {detailTask.notify ? (
                      <>
                        <span className="status-on">On</span> at{" "}
                        {detailTask.reminder_time || "—"}
                      </>
                    ) : (
                      "Off"
                    )}
                  </p>
                )}
              </div>
              <div className="detail-block">
                <h3>Assignee</h3>
                <div className="detail-assignee">
                  <span className="avatar">
                    {getInitials(detailTask.assignee)}
                  </span>
                  {!detailEdit && (
                    <span className="mono">{detailTask.assignee}</span>
                  )}
                  {detailEdit && (
                    <input
                      className="detail-input small"
                      value={detailDraft?.assignee || ""}
                      onChange={(event) =>
                        setDetailDraft((prev) => ({
                          ...prev,
                          assignee: event.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              </div>
              <div className="detail-block">
                <h3>Tags</h3>
                {detailEdit ? (
                  <input
                    className="detail-input"
                    value={detailDraft?.tags || ""}
                    onChange={(event) =>
                      setDetailDraft((prev) => ({ ...prev, tags: event.target.value }))
                    }
                    placeholder="Comma separated"
                  />
                ) : (
                  <div className="card-tags">
                    {detailTask.tags.length ? (
                      detailTask.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="tag">No tags</span>
                    )}
                  </div>
                )}
              </div>
              <div className="detail-block">
                <h3>Progress</h3>
                <div className="progress">
                  <div
                    className="progress-bar"
                    style={{ width: `${detailTask.progress}%` }}
                  />
                </div>
              </div>
              <div className="detail-block">
                <h3>Checklist</h3>
                {detailTask.checklist && detailTask.checklist.length ? (
                  <ul className="checklist">
                    {detailTask.checklist.map((item, index) => (
                      <li key={`${item.text}-${index}`}>
                        <label className="check-item">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => toggleChecklistItem(detailTask.id, index)}
                          />
                          <span className={item.done ? "done" : ""}>{item.text}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No checklist</p>
                )}
                {detailEdit && (
                  <p className="helper">
                    Tip: add checklist items in Summary using * at the start of a line.
                  </p>
                )}
              </div>
              <div className="detail-block">
                <h3>Repeat</h3>
                {detailEdit ? (
                  <div className="detail-repeat">
                    <label className="repeat-toggle">
                      <input
                        type="checkbox"
                        checked={!!detailDraft?.repeatEnabled}
                        onChange={(event) =>
                          setDetailDraft((prev) => ({
                            ...prev,
                            repeatEnabled: event.target.checked,
                          }))
                        }
                      />
                      Repeat task
                    </label>
                    {detailDraft?.repeatEnabled && (
                      <div className="detail-repeat-grid">
                        <label>
                          Every
                          <input
                            className="detail-input"
                            type="number"
                            min="1"
                            value={detailDraft?.repeatInterval ?? 1}
                            onChange={(event) =>
                              setDetailDraft((prev) => ({
                                ...prev,
                                repeatInterval: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          Unit
                          <select
                            className="detail-input"
                            value={detailDraft?.repeatUnit || "weeks"}
                            onChange={(event) =>
                              setDetailDraft((prev) => ({
                                ...prev,
                                repeatUnit: event.target.value,
                              }))
                            }
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                          </select>
                        </label>
                        <label>
                          End date
                          <input
                            className="detail-input"
                            type="date"
                            value={detailDraft?.repeatEndDate || ""}
                            onChange={(event) =>
                              setDetailDraft((prev) => ({
                                ...prev,
                                repeatEndDate: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                    )}
                  </div>
                ) : detailTask.repeat ? (
                  <p>
                    Every {detailTask.repeat.interval} {detailTask.repeat.unit}
                    {detailTask.repeat.endDate
                      ? `, until ${detailTask.repeat.endDate}`
                      : ""}
                  </p>
                ) : (
                  <p>None</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {aiOpen && (
        <div className="modal-backdrop" onClick={() => setAiOpen(false)}>
          <div
            className="modal ai-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>AI Control Center</h2>
              <button className="ghost-btn" onClick={() => setAiOpen(false)}>
                Close
              </button>
            </div>
            <div className="ai-tabs">
              {[
                { id: "summary", label: "Summary" },
                { id: "priority", label: "Priority" },
                { id: "next", label: "Next action" },
                { id: "autotag", label: "Auto-tag" },
                { id: "nlp", label: "NLP create" },
                { id: "chat", label: "Chat" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={classNames("ai-tab", aiTab === tab.id && "active")}
                  onClick={() => setAiTab(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {aiTab !== "chat" && (
              <div className="ai-panel">
                {aiTab === "nlp" && (
                  <textarea
                    className="ai-input"
                    value={aiInput}
                    onChange={(event) => setAiInput(event.target.value)}
                    placeholder='e.g. "Add a task to review Q2 metrics next Friday for Growth"'
                  />
                )}
                <div className="ai-actions">
                  <button
                    className="primary-btn"
                    onClick={() => runAi(aiTab)}
                    disabled={aiBusy}
                  >
                    {aiBusy ? "Working..." : "Run"}
                  </button>
                  {aiError && <span className="ai-error">{aiError}</span>}
                </div>
                {aiOutput && <pre className="ai-output">{aiOutput}</pre>}
              </div>
            )}

            {aiTab === "chat" && (
              <div className="ai-chat">
                <div className="ai-chat-log">
                  {aiChat.map((msg, index) => (
                    <div
                      key={`${msg.role}-${index}`}
                      className={classNames(
                        "ai-chat-msg",
                        msg.role === "user" && "user"
                      )}
                    >
                      <strong>{msg.role === "user" ? "You" : "Nic"}:</strong>{" "}
                      {msg.content}
                    </div>
                  ))}
                </div>
                {aiError && <div className="ai-error">{aiError}</div>}
                <div className="ai-chat-input">
                  <input
                    value={aiChatInput}
                    onChange={(event) => setAiChatInput(event.target.value)}
                    placeholder="Ask about your tasks..."
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (!aiBusy) {
                          sendChat();
                        }
                      }
                    }}
                  />
                  <button
                    className="primary-btn"
                    onClick={sendChat}
                    disabled={aiBusy}
                  >
                    {aiBusy ? "..." : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InsightCard({ label, value, trend }) {
  return (
    <div className="insight-card">
      <div>
        <p>{label}</p>
        <h2>{value}</h2>
      </div>
      <span className="trend">{trend}</span>
    </div>
  );
}

function MonitorCharts({ range, series, tasks }) {
  const { buckets, created, completed, overdue } = series;
  const maxValue = Math.max(1, ...created, ...completed, ...overdue);

  function makePath(values) {
    const width = 900;
    const height = 120;
    const step = width / Math.max(1, values.length - 1);
    return values
      .map((value, index) => {
        const x = index * step;
        const y = height - (value / maxValue) * height;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }

  const statusCounts = tasks.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    },
    {}
  );
  const priorityCounts = tasks.reduce(
    (acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="monitor-charts">
      <div className="monitor-card-lg">
        <h3>Created vs Completed</h3>
        <svg viewBox="0 0 900 120" preserveAspectRatio="none">
          <path d={makePath(created)} className="line created" />
          <path d={makePath(completed)} className="line completed" />
        </svg>
        <div className="monitor-legend">
          <span className="dot created" /> Created
          <span className="dot completed" /> Completed
        </div>
      </div>
      <div className="monitor-card-lg">
        <h3>Overdue</h3>
        <svg viewBox="0 0 900 120" preserveAspectRatio="none">
          <path d={makePath(overdue)} className="line overdue" />
        </svg>
        <div className="monitor-legend">
          <span className="dot overdue" /> Overdue
        </div>
      </div>
      <div className="monitor-card-lg">
        <h3>Status breakdown</h3>
        <div className="bar-list">
          {["backlog", "in_progress", "review", "done"].map((status) => (
            <div key={status} className="bar-row">
              <span>{status.replace("_", " ")}</span>
              <div className="bar">
                <div
                  style={{
                    width: `${((statusCounts[status] || 0) / Math.max(1, tasks.length)) * 100}%`,
                  }}
                />
              </div>
              <strong>{statusCounts[status] || 0}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="monitor-card-lg">
        <h3>Priority breakdown</h3>
        <div className="bar-list">
          {["critical", "high", "medium", "low"].map((priority) => (
            <div key={priority} className="bar-row">
              <span>{priority}</span>
              <div className="bar">
                <div
                  style={{
                    width: `${((priorityCounts[priority] || 0) / Math.max(1, tasks.length)) * 100}%`,
                  }}
                />
              </div>
              <strong>{priorityCounts[priority] || 0}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
