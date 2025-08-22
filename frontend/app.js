const API_BASE = "http://localhost:5000/api";

const getToken = () => localStorage.getItem("token");
const setToken = (t) => localStorage.setItem("token", t);
const getUser = () => JSON.parse(localStorage.getItem("user") || "null");
const setUser = (u) => localStorage.setItem("user", JSON.stringify(u));
const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); location.href="index.html"; };

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && getToken()) headers["Authorization"] = "Bearer " + getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error((await res.json()).message || "Request failed");
  return res.json();
}

// Auth Helpers (hook to forms if present)
async function handleRegister(e) {
  e.preventDefault();
  const f = e.target;
  const payload = {
    name: f.name.value,
    email: f.email.value,
    password: f.password.value
  };
  await api("/auth/register", { method: "POST", body: payload });
  alert("Registered! Please login.");
  location.href = "index.html";
}

async function handleLogin(e) {
  e.preventDefault();
  const f = e.target;
  const { token, user } = await api("/auth/login", {
    method: "POST",
    body: { email: f.email.value, password: f.password.value }
  });
  setToken(token); setUser(user);
  alert("Logged in!");
  location.href = "dashboard.html";
}

async function loadServices(containerId = "servicesList") {
  const list = await api("/services");
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = list.map(s => `
    <div class="card">
      <h3>${s.name} — ₹${s.price}</h3>
      <p>${s.description || ""}</p>
      <small>Duration: ${s.durationMins} mins</small>
      <div style="margin-top:8px">
        <a class="btn" href="book.html?service=${s._id}">Book</a>
      </div>
    </div>
  `).join("");
}

async function initBook() {
  const params = new URLSearchParams(location.search);
  const serviceId = params.get("service");
  const form = document.getElementById("bookForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/appointments", {
        method: "POST",
        auth: true,
        body: {
          service: serviceId || form.service.value,
          date: form.date.value,
          time: form.time.value,
          notes: form.notes.value
        }
      });
      alert("Appointment booked!");
      location.href = "dashboard.html";
    } catch (err) { alert(err.message); }
  });

  // if serviceId absent, load dropdown
  if (!serviceId) {
    const services = await api("/services");
    const sel = document.getElementById("service");
    services.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s._id; opt.textContent = `${s.name} — ₹${s.price}`;
      sel.appendChild(opt);
    });
  }
}

async function loadMyAppointments() {
  const container = document.getElementById("myAppointments");
  if (!container) return;
  try {
    const data = await api("/appointments/mine", { auth: true });
    container.innerHTML = data.map(a => `
      <div class="card">
        <div><b>Service:</b> ${a.service?.name || "-"}</div>
        <div><b>Date:</b> ${a.date} &nbsp; <b>Time:</b> ${a.time}</div>
        <div><b>Status:</b> ${a.status}</div>
        <div><small>#${a._id}</small></div>
      </div>
    `).join("") || "<p>No appointments yet.</p>";
  } catch (e) {
    container.innerHTML = `<p>Please login to view appointments.</p>`;
  }
}

async function adminGuard() {
  const u = getUser();
  if (!u || u.role !== "admin") {
    alert("Admin only"); location.href = "index.html";
  }
}

async function adminLoadAllAppointments() {
  const container = document.getElementById("allAppointments");
  if (!container) return;
  try {
    const data = await api("/appointments", { auth: true });
    container.innerHTML = data.map(a => `
      <div class="card">
        <div><b>User:</b> ${a.user?.name} (${a.user?.email})</div>
        <div><b>Service:</b> ${a.service?.name} — ₹${a.service?.price}</div>
        <div><b>Date/Time:</b> ${a.date} ${a.time}</div>
        <div>
          <label>Status:</label>
          <select data-id="${a._id}" class="statusSel">
            ${["booked","completed","canceled"].map(s => `<option ${a.status===s?"selected":""}>${s}</option>`).join("")}
          </select>
        </div>
      </div>
    `).join("");
    container.querySelectorAll(".statusSel").forEach(sel => {
      sel.addEventListener("change", async (e) => {
        const id = e.target.getAttribute("data-id");
        await api(`/appointments/${id}/status`, { method: "PUT", auth: true, body: { status: e.target.value }});
        alert("Updated");
      });
    });
  } catch (e) {
    container.innerHTML = `<p>${e.message}</p>`;
  }
}

async function adminLoadServices() {
  const container = document.getElementById("adminServices");
  const list = await api("/services");
  container.innerHTML = list.map(s => `
    <div class="card">
      <h3>${s.name} — ₹${s.price}</h3>
      <div>Duration: ${s.durationMins} mins</div>
      <div>${s.active ? "Active" : "Inactive"}</div>
      <small>ID: ${s._id}</small>
    </div>
  `).join("");
}

async function adminCreateService(e) {
  e.preventDefault();
  const f = e.target;
  await api("/services", {
    method: "POST",
    auth: true,
    body: {
      name: f.name.value,
      description: f.description.value,
      price: Number(f.price.value),
      durationMins: Number(f.duration.value)
    }
  });
  alert("Service created");
  adminLoadServices();
  f.reset();
}

// Small helpers to show auth state in nav
function mountAuthNav() {
  const navUser = document.getElementById("navUser");
  if (!navUser) return;
  const u = getUser();
  navUser.innerHTML = u ? `
    <span>Hi, ${u.name} (${u.role})</span>
    <button class="btn" onclick="logout()">Logout</button>
  ` : `
    <a href="index.html#login">Login</a>
  `;
}

// Page bootstrap
document.addEventListener("DOMContentLoaded", () => {
  mountAuthNav();
  if (document.getElementById("servicesList")) loadServices();
  if (document.getElementById("bookForm")) initBook();
  if (document.getElementById("myAppointments")) loadMyAppointments();
  if (document.getElementById("allAppointments")) { adminGuard().then(()=>{ adminLoadAllAppointments(); adminLoadServices(); }); }
  const reg = document.getElementById("registerForm"); if (reg) reg.addEventListener("submit", handleRegister);
  const log = document.getElementById("loginForm"); if (log) log.addEventListener("submit", handleLogin);
  const addSvc = document.getElementById("createServiceForm"); if (addSvc) addSvc.addEventListener("submit", adminCreateService);
});
