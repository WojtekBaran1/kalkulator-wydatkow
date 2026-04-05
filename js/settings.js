import { supabaseClient } from "./supabase.js";
import { state } from "./state.js";
import { loadKindCost } from "./expenses.js";
import { loadKindIncome } from "./income.js";

// --- DOM refs ---
const kindCostList    = document.getElementById("kindCostList");
const kindIncomeList  = document.getElementById("kindIncomeList");
const kindCostInput   = document.getElementById("kindCostInput");
const kindIncomeInput = document.getElementById("kindIncomeInput");

// --- Load both dictionaries ---
export async function loadSettings() {
  await Promise.all([
    loadKindTable("kind_cost",   "expenses",  "expense_date", kindCostList,   loadKindCost),
    loadKindTable("kind_income", "incomes",   "income_date",  kindIncomeList, loadKindIncome),
  ]);
}

async function loadKindTable(kindTable, usageTable, usageDateCol, listEl, refreshDropdown) {
  if (!state.currentUser) return;

  const { data, error } = await supabaseClient
    .from(kindTable)
    .select("id, name")
    .eq("user_id", state.currentUser.id)
    .order("name");

  if (error) { alert(error.message); return; }

  listEl.innerHTML = "";

  if (!data || data.length === 0) {
    const empty = document.createElement("li");
    empty.className   = "kind-item kind-empty";
    empty.textContent = "Brak pozycji";
    listEl.appendChild(empty);
    return;
  }

  data.forEach(item => {
    const li = document.createElement("li");
    li.className = "kind-item";

    const nameSpan = document.createElement("span");
    nameSpan.className   = "kind-item-name";
    nameSpan.textContent = item.name;

    // --- Edit button ---
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edytuj";
    editBtn.className   = "edit-btn";
    editBtn.onclick     = () => startEditing(li, nameSpan, item, kindTable, refreshDropdown);

    // --- Delete button ---
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Usuń";
    deleteBtn.className   = "delete-btn";
    deleteBtn.onclick     = async () => {
      const { count } = await supabaseClient
        .from(usageTable)
        .select("id", { count: "exact", head: true })
        .eq("user_id", state.currentUser.id)
        .eq("kind_id", item.id);

      if (count > 0) {
        showKindNotification(li, `Nie można usunąć — kategoria jest używana w ${count} pozycji.`);
        return;
      }

      const { error } = await supabaseClient.from(kindTable).delete().eq("id", item.id);
      if (error) { alert(error.message); return; }
      await loadSettings();
      await refreshDropdown();
    };

    const btnGroup = document.createElement("div");
    btnGroup.className = "kind-btn-group";
    btnGroup.appendChild(editBtn);
    btnGroup.appendChild(deleteBtn);

    li.appendChild(nameSpan);
    li.appendChild(btnGroup);
    listEl.appendChild(li);
  });
}

function startEditing(li, nameSpan, item, kindTable, refreshDropdown) {
  const input = document.createElement("input");
  input.className = "kind-edit-input";
  input.value     = item.name;

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Zapisz";
  saveBtn.className   = "add-btn kind-save-btn";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Anuluj";
  cancelBtn.className   = "secondary-btn kind-cancel-btn";

  const btnGroup = li.querySelector(".kind-btn-group");

  li.replaceChild(input, nameSpan);
  btnGroup.innerHTML = "";
  btnGroup.appendChild(saveBtn);
  btnGroup.appendChild(cancelBtn);

  input.focus();
  input.select();

  const save = async () => {
    const newName = input.value.trim();
    if (!newName || newName === item.name) { cancel(); return; }

    const { error } = await supabaseClient
      .from(kindTable).update({ name: newName }).eq("id", item.id);

    if (error) { alert(error.message); return; }

    item.name = newName;
    await loadSettings();
    await refreshDropdown();
  };

  const cancel = () => {
    li.replaceChild(nameSpan, input);
    btnGroup.innerHTML = "";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edytuj";
    editBtn.className   = "edit-btn";
    editBtn.onclick     = () => startEditing(li, nameSpan, item, kindTable, refreshDropdown);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Usuń";
    deleteBtn.className   = "delete-btn";
    deleteBtn.onclick     = async () => {
      const { error } = await supabaseClient.from(kindTable).delete().eq("id", item.id);
      if (error) { alert(error.message); return; }
      await loadSettings();
      await refreshDropdown();
    };

    btnGroup.appendChild(editBtn);
    btnGroup.appendChild(deleteBtn);
  };

  saveBtn.onclick  = save;
  cancelBtn.onclick = cancel;
  input.addEventListener("keydown", e => {
    if (e.key === "Enter")  save();
    if (e.key === "Escape") cancel();
  });
}

function showKindNotification(li, message) {
  const existing = li.querySelector(".kind-notification");
  if (existing) return;

  const note = document.createElement("span");
  note.className   = "kind-notification";
  note.textContent = message;
  li.appendChild(note);
  setTimeout(() => note.remove(), 4000);
}

// --- Add new kind ---
export async function addKindCost() {
  const name = kindCostInput.value.trim();
  if (!name || !state.currentUser) return;

  const { error } = await supabaseClient.from("kind_cost").insert([{
    user_id: state.currentUser.id,
    name
  }]);

  if (error) { alert(error.message); return; }

  kindCostInput.value = "";
  await loadSettings();
  await loadKindCost();
}

export async function addKindIncome() {
  const name = kindIncomeInput.value.trim();
  if (!name || !state.currentUser) return;

  const { error } = await supabaseClient.from("kind_income").insert([{
    user_id: state.currentUser.id,
    name
  }]);

  if (error) { alert(error.message); return; }

  kindIncomeInput.value = "";
  await loadSettings();
  await loadKindIncome();
}
