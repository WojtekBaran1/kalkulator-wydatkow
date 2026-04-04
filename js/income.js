import { supabaseClient } from "./supabase.js";
import { state } from "./state.js";
import { getTodayDate } from "./ui.js";

// --- DOM refs ---
const incomeDateInput  = document.getElementById("incomeDate");
const incomeNameInput  = document.getElementById("incomeName");
const incomeAmountInput = document.getElementById("incomeAmount");
const incomeList       = document.getElementById("incomeList");
const incomeSumEl      = document.getElementById("incomeSum");
const incomeMonthSumEl = document.getElementById("incomeMonthSum");

// --- Helpers ---
export function getSelectedIncomeDate() {
  return incomeDateInput.value || getTodayDate();
}

function monthRange(dateStr) {
  const d     = new Date(dateStr);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split("T")[0];
  return { start, end };
}

// --- Data ---
async function getIncomes() {
  if (!state.currentUser) return [];

  const { data, error } = await supabaseClient
    .from("incomes")
    .select("*")
    .eq("user_id", state.currentUser.id)
    .eq("income_date", getSelectedIncomeDate())
    .order("created_at", { ascending: true });

  if (error) { alert(error.message); return []; }
  return data || [];
}

export async function calculateMonthIncomeSum(dateStr) {
  if (!state.currentUser) return 0;

  const { start, end } = monthRange(dateStr || getSelectedIncomeDate());

  const { data, error } = await supabaseClient
    .from("incomes")
    .select("amount")
    .eq("user_id", state.currentUser.id)
    .gte("income_date", start)
    .lt("income_date", end);

  if (error) { alert(error.message); return 0; }
  return (data || []).reduce((sum, x) => sum + Number(x.amount), 0);
}

export async function addIncome() {
  if (!state.currentUser) { alert("Najpierw się zaloguj."); return; }

  const name   = incomeNameInput.value.trim();
  const amount = parseFloat(incomeAmountInput.value);

  if (!name || isNaN(amount) || amount <= 0) {
    alert("Wpisz poprawną nazwę i kwotę większą od 0.");
    return;
  }

  const { error } = await supabaseClient.from("incomes").insert([{
    user_id:     state.currentUser.id,
    income_date: getSelectedIncomeDate(),
    name,
    amount
  }]);

  if (error) { alert(error.message); return; }

  incomeNameInput.value   = "";
  incomeAmountInput.value = "";
  await renderIncome();
}

async function removeIncome(id) {
  const { error } = await supabaseClient.from("incomes").delete().eq("id", id);
  if (error) { alert(error.message); return; }
  await renderIncome();
}

// --- Render ---
export async function renderIncome() {
  const incomes = await getIncomes();
  incomeList.innerHTML = "";
  let sum = 0;

  incomes.forEach(income => {
    const li          = document.createElement("li");
    const textWrapper = document.createElement("div");
    textWrapper.className = "expense-text";

    const nameSpan = document.createElement("span");
    nameSpan.className   = "expense-name";
    nameSpan.textContent = income.name;

    const amountSpan = document.createElement("span");
    amountSpan.className   = "income-amount";
    amountSpan.textContent = `${Number(income.amount).toFixed(2)} zł`;

    textWrapper.appendChild(nameSpan);
    textWrapper.appendChild(amountSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Usuń";
    deleteBtn.className   = "delete-btn";
    deleteBtn.onclick     = () => removeIncome(income.id);

    li.appendChild(textWrapper);
    li.appendChild(deleteBtn);
    incomeList.appendChild(li);

    sum += Number(income.amount);
  });

  incomeSumEl.textContent = sum.toFixed(2);

  const monthTotal = await calculateMonthIncomeSum();
  incomeMonthSumEl.textContent = monthTotal.toFixed(2);
}
