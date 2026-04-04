import { supabaseClient } from "./supabase.js";
import { setAuthMessage, showAuthSection } from "./ui.js";

// --- DOM refs ---
const emailInput        = document.getElementById("email");
const passwordInput     = document.getElementById("password");
const loginForm         = document.getElementById("loginForm");
const forgotForm        = document.getElementById("forgotForm");
const resetEmailInput   = document.getElementById("resetEmail");
const resetMessage      = document.getElementById("resetMessage");
const newPasswordInput  = document.getElementById("newPassword");
const setPasswordMessage = document.getElementById("setPasswordMessage");

// --- SVG icons ---
const EYE_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_CLOSED = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

// --- Auth actions ---
export async function signUp() {
  const email    = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    setAuthMessage("Wpisz email i hasło.", true);
    return;
  }

  const { error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  setAuthMessage("Konto utworzone. Teraz zaloguj się.");
}

export async function signIn() {
  const email    = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    setAuthMessage("Wpisz email i hasło.", true);
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  setAuthMessage("");
  // onAuthStateChange in main.js handles the rest
}

export async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) alert(error.message);
  // onAuthStateChange in main.js handles the rest
}

// --- Password visibility toggle ---
export function togglePasswordVisibility(inputEl, btnEl) {
  const isHidden = inputEl.type === "password";
  inputEl.type   = isHidden ? "text" : "password";
  btnEl.innerHTML = isHidden ? EYE_CLOSED : EYE_OPEN;
}

// --- Forgot password flow ---
export function showForgotForm() {
  loginForm.style.display  = "none";
  forgotForm.style.display = "block";
  resetMessage.textContent = "";
}

export function showLoginForm() {
  forgotForm.style.display = "none";
  loginForm.style.display  = "block";
}

export async function sendPasswordReset() {
  const email = resetEmailInput.value.trim();

  if (!email) {
    resetMessage.textContent = "Wpisz adres email.";
    resetMessage.style.color = "#ff8eb7";
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href
  });

  if (error) {
    resetMessage.textContent = error.message;
    resetMessage.style.color = "#ff8eb7";
    return;
  }

  resetMessage.textContent = "Link resetujący został wysłany na podany email.";
  resetMessage.style.color = "#9feaff";
}

export async function setNewPassword() {
  const password = newPasswordInput.value.trim();

  if (!password || password.length < 6) {
    setPasswordMessage.textContent = "Hasło musi mieć co najmniej 6 znaków.";
    setPasswordMessage.style.color = "#ff8eb7";
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({ password });

  if (error) {
    setPasswordMessage.textContent = error.message;
    setPasswordMessage.style.color = "#ff8eb7";
    return;
  }

  setPasswordMessage.textContent = "Hasło zostało zmienione. Możesz się zalogować.";
  setPasswordMessage.style.color = "#9feaff";
  newPasswordInput.value = "";
  setTimeout(showAuthSection, 2000);
}
