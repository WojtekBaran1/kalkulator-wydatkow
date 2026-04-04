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
    loadKindTable("kind_cost",   kindCostList,   loadKindCost),
    loadKindTable("kind_income", kindIncomeList, loadKindIncome),
  ]);
}

async function loadKindTable(table, listEl, refreshDropdown) {
  if (!state.currentUser) return;

  const { data, error } = await supabaseClient
    .from(table)
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
    nameSpan.textContent = item.name;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Usuń";
    deleteBtn.className   = "delete-btn";
    deleteBtn.onclick     = async () => {
      const { error } = await supabaseClient.from(table).delete().eq("id", item.id);
      if (error) { alert(error.message); return; }
      await loadSettings();
      await refreshDropdown();
    };

    li.appendChild(nameSpan);
    li.appendChild(deleteBtn);
    listEl.appendChild(li);
  });
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
