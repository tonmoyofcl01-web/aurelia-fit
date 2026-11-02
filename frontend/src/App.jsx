import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import {
  Activity,
  Bell,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Dumbbell,
  FileBarChart,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  UserRound,
  Wallet,
  X,
  RefreshCw,
  Download,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Lock,
  ClipboardList,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const nav = [
  { label: "OVERVIEW", items: [["Dashboard", LayoutDashboard], ["Reports", FileBarChart]] },
  { label: "MANAGEMENT", items: [["Members", Users], ["Trainers", UserRound], ["Memberships", CalendarDays], ["Plans", ClipboardList], ["Attendance", CalendarCheck], ["Payments", Wallet], ["Workout Plans", Dumbbell]] },
  { label: "SYSTEM", items: [["Settings", Settings]] },
];

const pageRoles = {
  Dashboard: ["owner", "admin", "receptionist", "trainer"],
  Reports: ["owner", "admin"],
  Members: ["owner", "admin", "receptionist"],
  Trainers: ["owner", "admin"],
  Memberships: ["owner", "admin", "receptionist"],
  Plans: ["owner", "admin"],
  Attendance: ["owner", "admin", "receptionist", "trainer"],
  Payments: ["owner", "admin", "receptionist"],
  "Workout Plans": ["owner", "admin", "trainer"],
  Settings: ["owner", "admin", "receptionist", "trainer"],
};

const resources = {
  Members: {
    path: "members",
    fields: [
      ["name", "Full name", "text", true],
      ["email", "Email", "email"],
      ["phone", "Phone", "text", true],
      ["gender", "Gender", "select"],
      ["dateOfBirth", "Date of birth", "date"],
      ["address", "Address", "text"],
      ["emergencyContact", "Emergency contact", "text"],
      ["status", "Status", "select"],
    ],
  },
  Trainers: {
    path: "trainers",
    fields: [
      ["name", "Full name", "text", true],
      ["email", "Email", "email"],
      ["phone", "Phone", "text"],
      ["specialization", "Specialization", "text"],
      ["experience", "Experience (years)", "number"],
      ["status", "Status", "select"],
    ],
  },
  Plans: {
    path: "plans",
    fields: [
      ["name", "Plan name", "text", true],
      ["durationMonths", "Duration (months)", "number", true],
      ["price", "Price (BDT)", "number", true],
      ["description", "Description", "text"],
      ["active", "Active", "select"],
    ],
  },
  Memberships: {
    path: "memberships",
    fields: [
      ["member", "Member", "member", true],
      ["plan", "Membership plan", "plan", true],
      ["startDate", "Start date", "date", true],
      ["amount", "Amount (BDT)", "number"],
      ["trainer", "Assigned trainer", "trainer"],
    ],
  },
  Payments: {
    path: "payments",
    fields: [
      ["member", "Member", "member", true],
      ["membership", "Related membership", "membership"],
      ["amount", "Amount (BDT)", "number", true],
      ["method", "Payment method", "select"],
      ["status", "Status", "select"],
      ["reference", "Reference number", "text"],
      ["note", "Note", "text"],
    ],
  },
  "Workout Plans": {
    path: "workouts",
    fields: [
      ["title", "Workout title", "text", true],
      ["member", "Member", "member", true],
      ["trainer", "Trainer", "trainer"],
      ["startDate", "Start date", "date"],
      ["endDate", "End date", "date"],
      ["scheduleText", "Weekly workout schedule", "textarea"],
      ["notes", "Notes", "text"],
    ],
  },
};

const money = (n) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(n || 0);
const date = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", {
        timeZone: "Asia/Dhaka",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const formatWorkoutSchedule = (days = []) => days.map((day) => {
  const exercises = (day.exercises || []).map((exercise) => `${exercise.name}${exercise.sets || exercise.reps ? ` (${exercise.sets || 3}x${exercise.reps || "10"})` : ""}`).join("; ");
  return [day.day || "", day.focus || "", exercises].join(" | ").trim();
}).join("\n");

const parseWorkoutSchedule = (value = "") => value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
  const [day = "", focus = "", exerciseText = ""] = line.split("|").map((part) => part.trim());
  const exercises = exerciseText.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const match = part.match(/^(.*?)(?:\s*\((\d+)\s*x\s*([^)]*)\))?$/i);
    return { name: (match?.[1] || part).trim(), ...(match?.[2] ? { sets: Number(match[2]), reps: (match[3] || "10").trim() } : {}) };
  });
  return { day, focus, exercises };
});

function App() {
  const [user, setUser] = useState(null),
    [page, setPage] = useState("Dashboard"),
    [loading, setLoading] = useState(true),
    [sidebar, setSidebar] = useState(false),
    [toast, setToast] = useState(""),
    [logoutBusy, setLogoutBusy] = useState(false),
    [notificationsOpen, setNotificationsOpen] = useState(false),
    [notifications, setNotifications] = useState([]),
    [notificationsBusy, setNotificationsBusy] = useState(false),
    [profileOpen, setProfileOpen] = useState(false);
  const toastTimer = useRef(null);
  const profileMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const notify = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  useEffect(() => {
    if (!profileOpen && !notificationsOpen) return undefined;
    const closeOnOutside = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileOpen(false);
      if (!notificationMenuRef.current?.contains(event.target)) setNotificationsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen, notificationsOpen]);
  const loadUser = async () => {
    try {
      const r = await api.get("/auth/me");
      setUser(r.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadUser();
    const f = () => { setUser(null); setNotificationsOpen(false); setProfileOpen(false); };
    window.addEventListener("aurelia:unauthorized", f);
    return () => window.removeEventListener("aurelia:unauthorized", f);
  }, []);
  const logout = async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await api.post("/auth/logout");
    } catch {
      // Clear the local session even when the API is temporarily unavailable.
    } finally {
      setUser(null);
      setPage("Dashboard");
      setLogoutBusy(false);
      setNotificationsOpen(false);
      setProfileOpen(false);
    }
  };
  const toggleNotifications = async () => {
    if (notificationsOpen) {
      setNotificationsOpen(false);
      return;
    }
    setProfileOpen(false);
    setNotificationsOpen(true);
    setNotificationsBusy(true);
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data.data || []);
    } catch (error) {
      notify(error.response?.data?.message || "Unable to load notifications.");
    } finally {
      setNotificationsBusy(false);
    }
  };
  const markNotificationRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((current) => current.map((item) => item._id === id ? { ...item, read: true } : item));
    } catch (error) {
      notify(error.response?.data?.message || "Could not update notification.");
    }
  };
  if (loading)
    return (
      <div className="screen-center">
        <div className="loader" />
        <span>Preparing your workspace</span>
      </div>
    );
  if (!user) return <Login onLogin={(u) => setUser(u)} />;
  if (user.role === "member") {
    return (
      <div className="screen-center access-notice">
        <div className="brand-mark"><Activity size={22} /></div>
        <h2>Member access</h2>
        <p>The member self-service portal is not part of this staff management workspace yet.</p>
        <button className="signout-btn" onClick={logout} disabled={logoutBusy}><LogOut size={15} /> Sign out</button>
      </div>
    );
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebar ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Activity size={21} />
          </div>
          <div>
            <b>AURELIA</b>
            <small>FIT MANAGEMENT</small>
          </div>
          <button
            className="icon-btn mobile-close"
            onClick={() => setSidebar(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="gym-switch">
          <div className="gym-avatar">AF</div>
          <div>
            <b>Aurelia Fit</b>
            <small>Management workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav>
          {nav.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items
                .filter(([name]) => pageRoles[name]?.includes(user.role))
                .map(([name, Icon]) => (
                  <button
                    key={name}
                    className={`nav-link ${page === name ? "active" : ""}`}
                    onClick={() => {
                      setPage(name);
                      setSidebar(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <Icon size={18} />
                    <span>{name}</span>
                    {name === "Dashboard" && <i />}
                  </button>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon">
              <ShieldCheck size={18} />
            </div>
            <b>Built for better business</b>
            <p>Keep your members, team and operations in sync.</p>
            <span> AURELIA · 01</span>
          </div>
          <button
            className="profile-mini profile-mini-button"
            type="button"
            onClick={() => { setPage("Settings"); setSidebar(false); }}
            aria-label="Open account settings"
          >
            <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
            <div className="profile-info">
              <b>{user.name}</b>
              <small>{user.role}</small>
            </div>
            <span className="profile-settings-action" aria-hidden="true">
              <Settings size={16} className="profile-settings-icon" />
            </span>
          </button>
        </div>
      </aside>
      {sidebar && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebar(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            onClick={() => setSidebar(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} /> <b>{page}</b>
          </div>
          <div className="top-actions">
            <span className="today-label">
              <span className="live-dot" />
              {new Date().toLocaleDateString("en-US", {
                timeZone: "Asia/Dhaka",
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <div className="notification-wrap" ref={notificationMenuRef}>
              <button className={`icon-btn notification-btn ${notificationsOpen ? "is-open" : ""}`} type="button" aria-label="Open notifications" aria-haspopup="dialog" aria-expanded={notificationsOpen} onClick={toggleNotifications}>
                <Bell size={18} />
                {notifications.some((item) => !item.read) && <i className="notification-dot" />}
              </button>
              {notificationsOpen && (
                <div className="notification-popover" role="dialog" aria-label="Notifications">
                  <div className="notification-heading"><b>Notifications</b><button type="button" className="text-btn" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}>Close</button></div>
                  {notificationsBusy ? <div className="empty-state">Loading notifications…</div> : notifications.length === 0 ? <div className="empty-state">You’re all caught up.</div> : notifications.map((item) => (
                    <button type="button" key={item._id} className={`notification-item ${item.read ? "read" : "unread"}`} onClick={() => markNotificationRead(item._id)}>
                      <span className="notification-mark" />
                      <span><b>{item.title || "Update"}</b><small>{item.message || "No additional details."}</small></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="profile-menu-wrap" ref={profileMenuRef}>
              <button
                className={`top-avatar profile-trigger ${profileOpen ? "is-open" : ""}`}
                type="button"
                aria-label="Open account menu"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => {
                  setNotificationsOpen(false);
                  setProfileOpen((open) => !open);
                }}
              >
                {user.name?.[0]?.toUpperCase()}
              </button>
              {profileOpen && (
                <div className="profile-popover" role="menu">
                  <div className="profile-popover-user">
                    <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
                    <div>
                      <b>{user.name}</b>
                      <small>{user.email}</small>
                      <span>{user.role}</span>
                    </div>
                  </div>
                  <div className="profile-popover-divider" />
                  <button type="button" role="menuitem" onClick={() => { setPage("Settings"); setProfileOpen(false); }}>
                    <Settings size={15} /> Account settings
                  </button>
                  <button type="button" role="menuitem" className="profile-popover-logout" onClick={logout} disabled={logoutBusy}>
                    <LogOut size={15} /> {logoutBusy ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-wrap">
          {page === "Dashboard" ? (
            <Dashboard notify={notify} />
          ) : page === "Attendance" ? (
            <AttendancePage notify={notify} />
          ) : page === "Reports" ? (
            <Reports />
          ) : page === "Settings" ? (
            <SettingsPage notify={notify} user={user} onUserUpdate={setUser} />
          ) : (
            <ResourcePage key={page} title={page} notify={notify} user={user} />
          )}
        </div>
      </main>
      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api.post("/auth/login", { email, password });
      onLogin(r.data.user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to sign in. Check your API connection.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-screen">
      <div className="login-visual">
        <div className="login-brand">
          <div className="brand-mark">
            <Activity />
          </div>
          <b>
            AURELIA <span>FIT</span>
          </b>
        </div>
        <div className="visual-copy">
          <span className="eyebrow">THE ART OF WELLNESS</span>
          <h1>
            Elevate your
            <br />
            <em>every move.</em>
          </h1>
          <p>
            A considered space to manage your fitness community, with clarity
            and confidence.
          </p>
        </div>
        <div className="visual-foot">
          <span>STRENGTH · DISCIPLINE · BALANCE</span>
          <span>EST. 2026</span>
        </div>
      </div>
      <div className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <div className="login-symbol">
            <Activity />
          </div>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>
            Sign in to your
            <br />
            workspace.
          </h2>
          <p className="muted">
            Enter your credentials to access the dashboard.
          </p>
          <label>Email address</label>
          <div className="input-icon">
            <Mail size={17} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gym.com"
              required
            />
          </div>
          <label>Password</label>
          <div className="input-icon">
            <Lock size={17} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          {error && (
            <div className="form-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <button className="primary-btn login-submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"} <ChevronRight size={17} />
          </button>
          <small className="login-note">
            Secure access · Authorized personnel only
          </small>
        </form>
      </div>
    </div>
  );
}

function PageHeading({ eyebrow, title, desc, action }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      {action}
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null),
    [err, setErr] = useState(""),
    [loading, setLoading] = useState(true);
  const loadDashboard = async () => {
    setLoading(true);
    setErr("");
    try {
      const response = await api.get("/dashboard");
      setData(response.data);
    } catch (error) {
      setErr(error.response?.data?.message || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadDashboard(); }, []);
  return (
    <>
      <PageHeading
        eyebrow="YOUR BUSINESS AT A GLANCE"
        title="Good to see you."
        desc="Here’s what’s happening at your fitness club today."
        action={
          <button className="outline-btn" onClick={loadDashboard} disabled={loading}>
            <RefreshCw size={15} /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />
      {err && (
        <div className="alert">
          <AlertCircle size={17} />
          {err}
        </div>
      )}
      {!data && loading ? (
        <div className="loading-card"><div className="loader" />Loading your performance overview…</div>
      ) : !data ? (
        <div className="panel empty-state large"><AlertCircle size={25} /><b>Dashboard unavailable</b><span>{err || "The dashboard could not be loaded."}</span><button className="outline-btn" onClick={loadDashboard}>Try again</button></div>
      ) : (
        <>
          <div className="stats-grid">
            {[
              [
                "Total members",
                data.stats.members,
                Users,
                "All registered members",
                "gold",
              ],
              [
                "Active members",
                data.stats.activeMembers,
                HeartPulse,
                "Currently active",
                "green",
              ],
              [
                "Monthly revenue",
                money(data.stats.monthRevenue),
                Coins,
                "Paid this month",
                "gold",
              ],
              [
                "Today’s check-ins",
                data.stats.attendanceToday,
                CalendarCheck,
                "Attendance today",
                "blue",
              ],
              [
                "Active trainers",
                data.stats.trainers,
                Dumbbell,
                "Available coaching team",
                "green",
              ],
              [
                "Expiring soon",
                data.stats.expiring,
                Clock,
                "Within next 7 days",
                "orange",
              ],
            ].map(([label, value, Icon, sub, tone]) => (
              <div className="stat-card" key={label}>
                <div className="stat-top">
                  <span>{label}</span>
                  <div className={`stat-icon ${tone}`}>
                    <Icon size={19} />
                  </div>
                </div>
                <strong>{value}</strong>
                <small>{sub}</small>
              </div>
            ))}
          </div>
          <div className="dashboard-grid">
            <section className="panel revenue-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">REVENUE OVERVIEW</span>
                  <h3>Monthly performance</h3>
                </div>
              </div>
              <div className="chart-wrap">
                {(data.revenue || []).length === 0 ? <div className="empty-chart">Revenue activity will appear here after the first payment.</div> : <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenue || []}>
                    <CartesianGrid stroke="#452b34" vertical={false} />
                    <XAxis
                      dataKey="_id"
                      tick={{ fill: "#7f8b85", fontSize: 11 }}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#7f8b85", fontSize: 11 }}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#24151b",
                        border: "1px solid #603440",
                        color: "#f7e9ec",
                        borderRadius: 10,
                      }}
                      formatter={(v) => money(v)}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#cf465b"
                      fill="#cf465b"
                      fillOpacity={0.12}
                    />
                  </AreaChart>
                </ResponsiveContainer>}
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">MEMBERSHIP HEALTH</span>
                  <h3>Current status</h3>
                </div>
              </div>
              {(data.membershipStats || []).length ? (
                data.membershipStats.map((x) => (
                  <div className="report-line" key={x._id}>
                    <span className="status">{x._id}</span>
                    <b>{x.count}</b>
                  </div>
                ))
              ) : (
                <div className="empty-state">No membership data yet.</div>
              )}
            </section>
          </div>
          <div className="bottom-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">LATEST ACTIVITY</span>
                  <h3>Recent members</h3>
                </div>
              </div>
              {(data.recentMembers || []).length ? (
                data.recentMembers.map((m) => (
                  <div className="activity-row" key={m._id}>
                    <div className="avatar">{m.name?.[0]?.toUpperCase()}</div>
                    <div>
                      <b>{m.name}</b>
                      <small>
                        {m.memberId} · {date(m.createdAt)}
                      </small>
                    </div>
                    <span className={`status ${m.status}`}>{m.status}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">No members registered yet.</div>
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">RECENT TRANSACTIONS</span>
                  <h3>Latest payments</h3>
                </div>
              </div>
              {(data.recentPayments || []).length ? (
                data.recentPayments.map((p) => (
                  <div className="activity-row" key={p._id}>
                    <div className="stat-icon green">
                      <Wallet size={17} />
                    </div>
                    <div>
                      <b>{p.member?.name || "Member"}</b>
                      <small>{date(p.createdAt)}</small>
                    </div>
                    <strong>{money(p.amount)}</strong>
                  </div>
                ))
              ) : (
                <div className="empty-state">No payments recorded yet.</div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}

function ResourcePage({ title, notify, user }) {
  const cfg = resources[title];
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null),
    [form, setForm] = useState({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [listError, setListError] = useState(""),
    [referenceOptions, setReferenceOptions] = useState({ members: [], plans: [], trainers: [], memberships: [] });
  const load = () => {
    if (!cfg) return;
    setLoading(true);
    setListError("");
    api
      .get("/" + cfg.path, { params: { search, limit: 100 } })
      .then((r) => setRows(r.data.data || []))
      .catch((e) => {
        setListError(e.response?.data?.message || "Unable to load records.");
        notify(e.response?.data?.message || "Unable to load records.");
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (cfg) load();
  }, [title, search]);
  useEffect(() => {
    if (!modal || !cfg) return;
    const requiredReferences = [...new Set(cfg.fields.map((field) => field[2]).filter((type) => ["member", "plan", "trainer", "membership"].includes(type)))];
    if (!requiredReferences.length) return;
    const requests = requiredReferences.map((type) => {
      const path = type === "member" ? "members" : type === "plan" ? "plans" : type === "membership" ? "memberships" : "trainers";
      const params = type === "plan" ? { active: true, limit: 100 } : type === "membership" ? { limit: 100 } : { status: "active", limit: 100 };
      return api.get(`/${path}`, { params }).then((response) => [type === "member" ? "members" : type === "plan" ? "plans" : type === "membership" ? "memberships" : "trainers", response.data.data || []]);
    });
    Promise.all(requests).then((results) => setReferenceOptions((current) => ({ ...current, ...Object.fromEntries(results) }))).catch((loadError) => setError(loadError.response?.data?.message || "Unable to load selection options."));
  }, [modal, title]);
  const openNew = () => {
    setEditing(null);
    setForm({});
    setError("");
    setModal(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    const editable = { ...row };
    if (title === "Workout Plans") editable.scheduleText = formatWorkoutSchedule(row.days || []);
    for (const [key, , type] of cfg.fields) {
      if (["member", "plan", "trainer", "membership"].includes(type)) editable[key] = row[key]?._id || row[key] || "";
      if (type === "date" && row[key]) editable[key] = String(row[key]).slice(0, 10);
    }
    setForm(editable);
    setError("");
    setModal(true);
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { ...form };
      if (title === "Workout Plans") {
        payload.days = parseWorkoutSchedule(payload.scheduleText || "");
        delete payload.scheduleText;
      }
      if (editing) await api.patch("/" + cfg.path + "/" + editing._id, payload);
      else await api.post("/" + cfg.path, payload);
      setModal(false);
      notify(editing ? "Record updated." : "Record created.");
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not save this record.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (row) => {
    if (!confirm("Delete this record? This action cannot be undone.")) return;
    try {
      await api.delete("/" + cfg.path + "/" + row._id);
      notify("Record deleted.");
      load();
    } catch (e) {
      notify(e.response?.data?.message || "Could not delete this record.");
    }
  };
  const tableFields = cfg ? (title === "Members" ? [["memberId", "Member ID"], ...cfg.fields].slice(0, 5) : cfg.fields.slice(0, 5)) : [];
  if (!cfg) return <div className="empty-state">This section is not available.</div>;
  return (
    <>
      <PageHeading
        eyebrow="GYM OPERATIONS"
        title={title}
        desc={`Manage your gym ${title.toLowerCase()} records.`}
        action={
          <button className="primary-btn" onClick={openNew}>
            <Plus size={17} /> Add{" "}
            {title === "Plans"
              ? "plan"
              : title === "Workout Plans"
                ? "workout plan"
                : title.slice(0, -1).toLowerCase()}
          </button>
        }
      />
      <div className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder={`Search ${title.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="outline-btn" onClick={load}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
        {loading ? (
          <div className="loading-card"><div className="loader" />Loading records…</div>
        ) : listError ? (
          <div className="empty-state large"><AlertCircle size={22} /><b>Unable to load records</b><span>{listError}</span><button className="outline-btn" onClick={load}>Try again</button></div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            No records found. Add your first record to get started.
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {tableFields.map(([k, l]) => (
                    <th key={k}>{l}</th>
                  ))}
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    {tableFields.map(([k]) => (
                      <td key={k}>
                        {k === "price" || k === "amount"
                          ? money(row[k])
                          : k === "member"
                            ? row.member?.name || row.member
                            : k === "plan"
                              ? row.plan?.name || row.plan
                              : k === "trainer"
                                ? row.trainer?.name || row.trainer
                                : k === "membership"
                                  ? row.membership?.plan?.name || row.membership?._id || row.membership || "—"
                                  : typeof row[k] === "boolean"
                                  ? row[k]
                                    ? "Yes"
                                    : "No"
                                  : k === "startDate" ||
                                      k === "endDate" ||
                                      k === "dateOfBirth"
                                    ? date(row[k])
                                    : (row[k] ?? "—")}
                      </td>
                    ))}
                    <td className="right">
                      <button
                        className="icon-btn"
                        title="Edit"
                        onClick={() => openEdit(row)}
                      >
                        <Edit2 size={16} />
                      </button>
                      { ["owner", "admin"].includes(user?.role) && (
                        <button className="icon-btn danger" title="Delete" aria-label="Delete record" onClick={() => remove(row)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={save}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">
                  {editing ? "UPDATE RECORD" : "NEW RECORD"}
                </span>
                <h3>
                  {editing ? "Edit" : "Add"}{" "}
                  {title === "Plans"
                    ? "membership plan"
                    : title === "Workout Plans"
                      ? "workout plan"
                      : title.slice(0, -1).toLowerCase()}
                </h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="form-grid">
              {cfg.fields.map(([key, label, type, required]) => (
                <div className="field" key={key}>
                  <label>
                    {label}
                    {required ? " *" : ""}
                  </label>
                  {["member", "plan", "trainer", "membership"].includes(type) ? (
                    <select
                      value={form[key]?._id || form[key] || ""}
                      required={required}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value, ...(key === "member" && title === "Payments" ? { membership: "" } : {}) })}
                    >
                      <option value="">Choose {label.toLowerCase()}…</option>
                      {(referenceOptions[type === "member" ? "members" : type === "plan" ? "plans" : type === "membership" ? "memberships" : "trainers"] || []).filter((option) => type !== "membership" || !form.member || String(option.member?._id || option.member) === String(form.member)).map((option) => (
                        <option value={option._id} key={option._id}>
                          {type === "member" ? `${option.memberId || "Member"} · ${option.name}` : type === "plan" ? `${option.name} · ${money(option.price)}` : type === "membership" ? `${option.member?.name || "Member"} · ${option.plan?.name || "Membership"}` : option.name}
                        </option>
                      ))}
                    </select>
                  ) : type === "textarea" ? (
                    <textarea
                      rows={5}
                      value={form[key] ?? ""}
                      placeholder={title === "Workout Plans" ? "Monday | Upper body | Bench press (3x10); Push-ups (3x12)\nWednesday | Lower body | Squats (4x8); Lunges (3x12)" : "Enter details…"}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  ) : type === "select" ? (
                    <select
                      value={form[key] ?? (key === "status" ? title === "Payments" ? "paid" : "active" : key === "method" ? "cash" : key === "active" ? "true" : "")}
                      onChange={(e) => setForm({ ...form, [key]: key === "active" ? e.target.value === "true" : e.target.value })}
                    >
                      <option value="">Select…</option>
                      {(key === "status"
                        ? title === "Payments" ? ["paid", "pending", "refunded"] : title === "Memberships" ? ["active", "expired", "cancelled"] : ["active", "inactive"]
                        : key === "gender" ? ["Male", "Female", "Other"]
                        : key === "method" ? ["cash", "bank", "mobile_banking", "card"]
                        : ["true", "false"]
                      ).map((option) => <option value={option} key={option}>{option.replaceAll("_", " ")}</option>)}
                    </select>
                  ) : (
                    <input
                      type={type}
                      value={type === "date" && form[key] ? String(form[key]).slice(0, 10) : form[key] ?? ""}
                      required={required}
                      min={type === "number" ? 0 : undefined}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
            {error && (
              <div className="form-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="outline-btn"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button className="primary-btn" disabled={busy}>
                {busy ? "Saving…" : editing ? "Save changes" : "Create record"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function AttendancePage({ notify }) {
  const [rows, setRows] = useState([]),
    [members, setMembers] = useState([]),
    [member, setMember] = useState(""),
    [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/attendance", { params: { limit: 100 } }),
      api.get("/members", { params: { limit: 100, status: "active" } }),
    ])
      .then(([a, m]) => {
        setRows(a.data.data);
        setMembers(m.data.data);
      })
      .catch((e) =>
        notify(e.response?.data?.message || "Unable to load attendance."),
      )
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  const checkIn = async () => {
    if (!member) return notify("Choose a member first.");
    try {
      await api.post("/attendance", { member });
      notify("Check-in recorded.");
      setMember("");
      load();
    } catch (e) {
      notify(e.response?.data?.message || "Check-in failed.");
    }
  };
  const checkout = async (id) => {
    try {
      await api.patch("/attendance/checkout/" + id);
      notify("Check-out recorded.");
      load();
    } catch (e) {
      notify(e.response?.data?.message || "Check-out failed.");
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="DAILY OPERATIONS"
        title="Attendance"
        desc="Track member visits and daily gym activity."
      />
      <div className="panel checkin-panel">
        <div>
          <span className="eyebrow">QUICK CHECK-IN</span>
          <h3>Welcome to the club.</h3>
          <p>Select a member to record their arrival.</p>
        </div>
        <div className="checkin-controls">
          <select value={member} onChange={(e) => setMember(e.target.value)}>
            <option value="">Choose a member…</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.memberId} · {m.name}
              </option>
            ))}
          </select>
          <button className="primary-btn" onClick={checkIn}>
            <Check size={17} /> Check in
          </button>
        </div>
      </div>
      <div className="panel table-panel">
        <div className="panel-heading padded">
          <div>
            <span className="eyebrow">VISIT LOG</span>
            <h3>Recent attendance</h3>
          </div>
          <button className="outline-btn" onClick={load}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
        {loading ? (
          <div className="loading-card">
            <div className="loader" />
            Loading attendance…
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">No attendance records yet.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Date</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Status</th>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <b>{r.member?.name || "Member"}</b>
                      <small className="cell-sub">
                        {r.member?.memberId || ""}
                      </small>
                    </td>
                    <td>{date(r.date)}</td>
                    <td>
                      {new Date(r.checkIn).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      {r.checkOut
                        ? new Date(r.checkOut).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={`status ${r.checkOut ? "completed" : "active"}`}
                      >
                        {r.checkOut ? "Completed" : "Checked in"}
                      </span>
                    </td>
                    <td className="right">
                      {!r.checkOut && (
                        <button
                          className="outline-btn small-btn"
                          onClick={() => checkout(r.member?._id)}
                        >
                          Check out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Reports() {
  const currentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [from, setFrom] = useState(`${currentDate.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(currentDate);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/reports", { params: { from, to } });
      setData(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, [from, to]);

  const csv = () => {
    if (!data) return;
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const lines = [
      ["Report period", from, to].map(quote).join(","),
      "",
      ["Month", "Paid revenue (BDT)", "Transactions"].map(quote).join(","),
      ...(data.revenue || []).map((item) => [item._id, item.total, item.count].map(quote).join(",")),
      "",
      ["Metric", "Value"].map(quote).join(","),
      ["New registrations", data.registrations || 0].map(quote).join(","),
      ["Attendance visits", data.attendance || 0].map(quote).join(","),
      ...(data.paymentStats || []).map((item) => [`Payment ${item._id}`, item.total].map(quote).join(",")),
    ];
    const blob = new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `aurelia-fit-report-${from}-to-${to}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <PageHeading
        eyebrow="BUSINESS INTELLIGENCE"
        title="Reports & insights"
        desc="Understand revenue, attendance and membership activity."
        action={<button className="outline-btn" onClick={csv} disabled={!data || loading}><Download size={16} /> Export report CSV</button>}
      />
      <div className="report-filter panel">
        <div className="field"><label htmlFor="report-from">From</label><input id="report-from" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></div>
        <div className="field"><label htmlFor="report-to">To</label><input id="report-to" type="date" value={to} min={from} max={currentDate} onChange={(event) => setTo(event.target.value)} /></div>
        <span className="report-range-note">Showing results for the selected period</span>
        {loading && <span className="muted">Updating…</span>}
      </div>
      {error && <div className="alert"><AlertCircle size={16} />{error}<button className="text-btn" onClick={loadReports}>Retry</button></div>}
      {loading && !data ? (
        <div className="loading-card"><div className="loader" />Preparing reports…</div>
      ) : !data ? (
        <div className="panel empty-state large">No report data is available. Adjust the date range or try again.</div>
      ) : (
        <>
          <div className="stats-grid report-stats">
            <div className="stat-card"><div className="stat-top"><span>New registrations</span><Users size={18} /></div><strong>{data.registrations || 0}</strong><small>Selected reporting period</small></div>
            <div className="stat-card"><div className="stat-top"><span>Attendance visits</span><CalendarCheck size={18} /></div><strong>{data.attendance || 0}</strong><small>Recorded check-ins</small></div>
            <div className="stat-card"><div className="stat-top"><span>Paid revenue</span><Coins size={18} /></div><strong>{money((data.revenue || []).reduce((sum, item) => sum + item.total, 0))}</strong><small>Within reporting period</small></div>
          </div>
          <div className="panel revenue-panel">
            <div className="panel-heading"><div><span className="eyebrow">REVENUE REPORT</span><h3>Monthly revenue</h3></div></div>
            <div className="chart-wrap">
              {(data.revenue || []).length === 0 ? <div className="empty-chart">No paid revenue was recorded during this period.</div> : <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenue}>
                  <CartesianGrid stroke="#452b34" vertical={false} />
                  <XAxis dataKey="_id" tick={{ fill: "#a18d94", fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fill: "#a18d94", fontSize: 11 }} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#24151b", border: "1px solid #603440", borderRadius: 10, color: "#f7e9ec" }} formatter={(value) => money(value)} />
                  <Area type="monotone" dataKey="total" stroke="#cf465b" fill="#cf465b" fillOpacity={0.16} />
                </AreaChart>
              </ResponsiveContainer>}
            </div>
          </div>
          <div className="bottom-grid">
            <section className="panel"><div className="panel-heading"><div><span className="eyebrow">PAYMENT STATUS</span><h3>Payment summary</h3></div></div>
              {(data.paymentStats || []).length ? data.paymentStats.map((item) => <div className="report-line" key={item._id}><span className={`status ${item._id}`}>{item._id}</span><b>{money(item.total)}</b><small>{item.count} records</small></div>) : <div className="empty-state">No payment records in this period.</div>}
            </section>
            <section className="panel"><div className="panel-heading"><div><span className="eyebrow">MEMBERSHIP MIX</span><h3>Membership status</h3></div></div>
              {(data.membershipStats || []).length ? data.membershipStats.map((item) => <div className="report-line" key={item._id}><span className={`status ${item._id}`}>{item._id}</span><b>{item.count}</b></div>) : <div className="empty-state">No membership data in this period.</div>}
            </section>
          </div>
        </>
      )}
    </>
  );
}

function SettingsPage({ notify, user, onUserUpdate }) {
  const canManageGym = ["owner", "admin"].includes(user?.role);
  const [data, setData] = useState({ name: "Aurelia Fit", currency: "BDT" });
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    setProfile({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
  }, [user?.name, user?.email, user?.phone]);

  useEffect(() => {
    if (!canManageGym) return undefined;
    let active = true;
    api.get("/settings")
      .then((r) => { if (active) setData(r.data.data || { name: "Aurelia Fit", currency: "BDT" }); })
      .catch((e) => { if (active) setSettingsError(e.response?.data?.message || "Unable to load gym settings."); });
    return () => { active = false; };
  }, [canManageGym]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileBusy(true);
    try {
      const response = await api.patch("/auth/profile", profile);
      onUserUpdate?.(response.data.user);
      notify("Account profile updated.");
    } catch (e) {
      notify(e.response?.data?.message || "Could not update account profile.");
    } finally {
      setProfileBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setSettingsError("");
    try {
      const response = await api.patch("/settings", data);
      setData(response.data.data || data);
      notify("Gym settings saved.");
    } catch (e) {
      setSettingsError(e.response?.data?.message || "Could not save settings.");
    } finally {
      setBusy(false);
    }
  };

  const change = async (e) => {
    e.preventDefault();
    setPasswordBusy(true);
    setPasswordError("");
    try {
      await api.patch("/auth/password", password);
      setPassword({ currentPassword: "", newPassword: "" });
      notify("Password changed successfully.");
    } catch (e) {
      setPasswordError(e.response?.data?.message || "Password update failed.");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <>
      <PageHeading eyebrow="WORKSPACE CONFIGURATION" title="Settings" desc="Manage your gym identity and account security." />
      <div className="settings-grid">
        <form className="panel settings-panel account-settings-panel" onSubmit={saveProfile}>
          <div className="panel-heading">
            <div><span className="eyebrow">PERSONAL ACCOUNT</span><h3>Profile details</h3></div>
            <div className="stat-icon blue"><UserRound /></div>
          </div>
          <p className="settings-description">Update the name and contact details associated with your staff account.</p>
          <div className="field">
            <label>Full name</label>
            <input type="text" autoComplete="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required maxLength={80} />
          </div>
          <div className="field">
            <label>Email address</label>
            <input type="email" autoComplete="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required maxLength={254} />
          </div>
          <div className="field">
            <label>Phone number</label>
            <input type="tel" autoComplete="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} maxLength={30} />
          </div>
          <div className="settings-role-note"><ShieldCheck size={15} /><span>Account role: <b>{user?.role}</b>. Role permissions cannot be changed here.</span></div>
          <button className="primary-btn" disabled={profileBusy}>{profileBusy ? "Saving profile…" : "Save profile"}</button>
        </form>

        {canManageGym && <form className="panel settings-panel" onSubmit={save}>
          <div className="panel-heading">
            <div><span className="eyebrow">BUSINESS PROFILE</span><h3>Gym information</h3></div>
            <div className="stat-icon gold"><Dumbbell /></div>
          </div>
          {settingsError && <div className="form-error" role="alert">{settingsError}</div>}
          {[["name", "Gym name"], ["email", "Contact email"], ["phone", "Phone number"], ["address", "Address"], ["openingHours", "Opening hours"]].map(([k, l]) => (
            <div className="field" key={k}>
              <label>{l}</label>
              <input type={k === "email" ? "email" : "text"} value={data[k] || ""} onChange={(e) => setData({ ...data, [k]: e.target.value })} />
            </div>
          ))}
          <div className="field">
            <label>Currency</label>
            <select value={data.currency || "BDT"} onChange={(e) => setData({ ...data, currency: e.target.value })}>
              <option value="BDT">BDT — Bangladeshi Taka</option>
            </select>
          </div>
          <button className="primary-btn" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
        </form>}

        <form className="panel settings-panel" onSubmit={change}>
          <div className="panel-heading">
            <div><span className="eyebrow">ACCOUNT PROTECTION</span><h3>Change password</h3></div>
            <div className="stat-icon green"><ShieldCheck /></div>
          </div>
          <p className="settings-description">Choose a strong password you do not use on other websites.</p>
          <div className="field">
            <label>Current password</label>
            <input type="password" autoComplete="current-password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} required />
          </div>
          <div className="field">
            <label>New password</label>
            <input type="password" autoComplete="new-password" minLength={10} value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} required />
            <small className="muted">Use at least 10 characters. A unique passphrase is recommended.</small>
          </div>
          {passwordError && <div className="form-error" role="alert">{passwordError}</div>}
          <button className="outline-btn" disabled={passwordBusy}>{passwordBusy ? "Updating…" : "Update password"}</button>
        </form>
      </div>
    </>
  );
}

export default App;
