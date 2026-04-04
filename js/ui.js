// --- DOM refs ---
const loadingSection = document.getElementById("loadingSection");
const authSection    = document.getElementById("authSection");
const appSection     = document.getElementById("appSection");
const resetSection   = document.getElementById("resetSection");
const loginForm      = document.getElementById("loginForm");
const forgotForm     = document.getElementById("forgotForm");
const userInfo       = document.getElementById("userInfo");
const authMessage    = document.getElementById("authMessage");

const costsTab   = document.getElementById("costsTab");
const incomeTab  = document.getElementById("incomeTab");
const reportsTab = document.getElementById("reportsTab");

export const tabButtons       = document.querySelectorAll(".tab-btn");
export const expenseDateInput = document.getElementById("expenseDate");
export const incomeDateInput  = document.getElementById("incomeDate");

// --- Utilities ---
export function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

export function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#ff8eb7" : "#9feaff";
}

// --- Section visibility ---
export function showLoadingSection() {
  loadingSection.style.display = "block";
  authSection.style.display    = "none";
  appSection.style.display     = "none";
  resetSection.style.display   = "none";
}

export function showAuthSection() {
  loadingSection.style.display = "none";
  authSection.style.display    = "block";
  appSection.style.display     = "none";
  resetSection.style.display   = "none";
  loginForm.style.display      = "block";
  forgotForm.style.display     = "none";
  userInfo.textContent         = "";
}

export function showAppSection(user) {
  loadingSection.style.display = "none";
  authSection.style.display    = "none";
  appSection.style.display     = "block";
  resetSection.style.display   = "none";
  userInfo.textContent         = `Zalogowano jako: ${user.email}`;
  expenseDateInput.value       = expenseDateInput.value || getTodayDate();
}

export function showResetSection() {
  loadingSection.style.display = "none";
  authSection.style.display    = "none";
  appSection.style.display     = "none";
  resetSection.style.display   = "block";
}

// --- Tab switching ---
export function switchTab(tabName) {
  tabButtons.forEach(btn => btn.classList.remove("active"));
  costsTab.classList.remove("active");
  incomeTab.classList.remove("active");
  reportsTab.classList.remove("active");

  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  if (tabName === "costs")   costsTab.classList.add("active");
  if (tabName === "income")  incomeTab.classList.add("active");
  if (tabName === "reports") reportsTab.classList.add("active");
}
