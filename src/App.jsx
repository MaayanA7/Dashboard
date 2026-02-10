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
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChat, setAiChat] = useState([]);
  const [aiTab, setAiTab] = useState("summary");
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
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              repeat: status === "done" ? null : task.repeat,
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
      }),
    }).catch(() => {});
  }

  function handleCreateTask(e) {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    const id = `tsk-${Date.now()}`;
    const task = {
      id,
      title: newTask.title.trim(),
      summary: newTask.summary.trim() || "No summary yet",
      status: newTask.status,
      priority: newTask.priority,
      due: newTask.due || "2026-02-20",
      assignee: newTask.assignee.trim() || "NA",
      project: newTask.project.trim() || "General",
      progress: 0,
      tags: newTask.tags
        ? newTask.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        : [],
      repeat: newTask.repeatEnabled
        ? {
            interval: Number(newTask.repeatInterval) || 1,
            unit: newTask.repeatUnit,
            endDate: newTask.repeatEndDate || null,
          }
        : null,
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
    });
  }

  function openTask(task) {
    setDetailTask(task);
  }

  function closeTask() {
    setDetailTask(null);
  }

  function deleteTask(taskId) {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setDetailTask((prev) => (prev?.id === taskId ? null : prev));
    fetch(`/api/tasks/${taskId}`, { method: "DELETE" }).catch(() => {});
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dashboard-theme", theme);
  }, [theme]);

  const navItems = [
    "Overview",
    "My Tasks",
    "Roadmap",
    "Insights",
    "Settings",
  ];

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
            className="icon-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Hide sidebar"
            type="button"
          >
            ◀
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
          <div className="team-card">
            <div className="team-card__title">Team Pulse</div>
            <p>3 blockers need attention today.</p>
            <button className="ghost-btn">Resolve blockers</button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">RDT Group - Success Board</p>
            <h1>Product Ops Dashboard</h1>
            <div className="section-pill">{activeSection}</div>
          </div>
          <div className="topbar-actions">
            {!sidebarOpen && (
              <button
                className="icon-btn light panel-toggle"
                onClick={() => setSidebarOpen(true)}
                type="button"
              >
                Panel
                <span className="panel-arrow">▶</span>
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
              <span className="mono">FEB 09, 2026</span>
            </div>
            <button className="primary-btn" onClick={() => setFormOpen(true)}>
              + New task
            </button>
            <button className="ghost-btn" onClick={() => setAiOpen(true)}>
              AI
            </button>
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

        {activeSection !== "Overview" && (
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
                                <span className="mono">Due {task.due}</span>
                                <span className="avatar">{task.assignee}</span>
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
                  placeholder="What needs to happen?"
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

      {detailTask && (
        <div className="modal-backdrop" onClick={closeTask}>
          <div
            className="modal detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{detailTask.title}</h2>
              <div className="modal-header-actions">
                <button
                  className="danger-btn"
                  onClick={() => deleteTask(detailTask.id)}
                  type="button"
                >
                  Delete
                </button>
                <button className="ghost-btn" onClick={closeTask} type="button">
                  Close
                </button>
              </div>
            </div>
            <div className="detail-grid">
              <div className="detail-block">
                <h3>Summary</h3>
                <p>{detailTask.summary}</p>
              </div>
              <div className="detail-block">
                <h3>Status</h3>
                <p>
                  {columns.find((col) => col.id === detailTask.status)?.label}
                </p>
              </div>
              <div className="detail-block">
                <h3>Priority</h3>
                <span
                  className="badge"
                  style={{ background: badgeColor(detailTask.priority) }}
                >
                  {detailTask.priority.toUpperCase()}
                </span>
              </div>
              <div className="detail-block">
                <h3>Project</h3>
                <p className="mono">{detailTask.project}</p>
              </div>
              <div className="detail-block">
                <h3>Due</h3>
                <p className="mono">{detailTask.due}</p>
              </div>
              <div className="detail-block">
                <h3>Assignee</h3>
                <div className="detail-assignee">
                  <span className="avatar">{detailTask.assignee}</span>
                  <span className="mono">{detailTask.assignee}</span>
                </div>
              </div>
              <div className="detail-block">
                <h3>Tags</h3>
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
                <h3>Repeat</h3>
                {detailTask.repeat ? (
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
