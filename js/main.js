import { supabaseClient } from "./supabase.js";
import { state } from "./state.js";
import {
  tabButtons, expenseDateInput, incomeDateInput, getTodayDate,
  showAppSection, showAuthSection, showResetSection, showSettingsSection, switchTab
} from "./ui.js";
import {
  signIn, signUp, signOut,
  togglePasswordVisibility,
  showForgotForm, showLoginForm,
  sendPasswordReset, setNewPassword
} from "./auth.js";
import { addExpense, render, loadKindCost } from "./expenses.js";
import { addIncome, renderIncome, loadKindIncome } from "./income.js";
import { loadReportsData } from "./reports.js";
import { loadSettings, addKindCost, addKindIncome } from "./settings.js";

// --- Auth ---
document.getElementById("loginBtn").addEventListener("click", signIn);
document.getElementById("registerBtn").addEventListener("click", signUp);
document.getElementById("logoutBtn").addEventListener("click", signOut);

// --- Password toggles ---
document.getElementById("togglePassword").addEventListener("click", e =>
  togglePasswordVisibility(document.getElementById("password"), e.currentTarget)
);
document.getElementById("toggleNewPassword").addEventListener("click", e =>
  togglePasswordVisibility(document.getElementById("newPassword"), e.currentTarget)
);

// --- Forgot password ---
document.getElementById("forgotBtn").addEventListener("click", showForgotForm);
document.getElementById("backToLoginBtn").addEventListener("click", showLoginForm);
document.getElementById("sendResetBtn").addEventListener("click", sendPasswordReset);
document.getElementById("setPasswordBtn").addEventListener("click", setNewPassword);

// --- Tabs ---
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    switchTab(btn.dataset.tab);
    if (btn.dataset.tab === "reports") loadReportsData();
  });
});

// --- Expenses ---
document.getElementById("addExpenseBtn").addEventListener("click", addExpense);
expenseDateInput.addEventListener("change", render);

// --- Income ---
document.getElementById("addIncomeBtn").addEventListener("click", addIncome);
incomeDateInput.addEventListener("change", renderIncome);

// --- Settings ---
document.getElementById("settingsBtn").addEventListener("click", async () => {
  showSettingsSection();
  await loadSettings();
});
document.getElementById("closeSettingsBtn").addEventListener("click", () => {
  showAppSection(state.currentUser);
});
document.getElementById("addKindCostBtn").addEventListener("click", addKindCost);
document.getElementById("addKindIncomeBtn").addEventListener("click", addKindIncome);

// --- Initialisation ---
expenseDateInput.value = getTodayDate();
incomeDateInput.value  = getTodayDate();

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    showResetSection();
    return;
  }

  state.currentUser = session?.user ?? null;

  if (state.currentUser) {
    showAppSection(state.currentUser);
    switchTab("costs");
    await Promise.all([loadKindCost(), loadKindIncome()]);
    await render();
    await renderIncome();
  } else {
    showAuthSection();
  }
});
