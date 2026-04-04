import { supabaseClient } from "./supabase.js";
import { state } from "./state.js";
import { getTodayDate } from "./ui.js";
import { calculateMonthIncomeSum } from "./income.js";

// --- DOM refs ---
const expenseDateInput   = document.getElementById("expenseDate");
const expenseNameInput   = document.getElementById("name");
const expenseAmountInput = document.getElementById("amount");
const list               = document.getElementById("list");
const sumEl              = document.getElementById("sum");
const monthSumEl         = document.getElementById("monthSum");
const costsTabIncomeSumEl = document.getElementById("costsTabIncomeSum");
const budgetSumEl        = document.getElementById("budgetSum");

// --- Helpers ---
export function getSelectedDate() {
  return expenseDateInput.value || getTodayDate();
}

function monthRange(dateStr) {
  const d     = new Date(dateStr);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split("T")[0];
  return { start, end };
}

// --- Data ---
async function getExpenses() {
  if (!state.currentUser) return [];

  const { data, error } = await supabaseClient
    .from("expenses")
    .select("*")
    .eq("user_id", state.currentUser.id)
    .eq("expense_date", getSelectedDate())
    .order("created_at", { ascending: true });

  if (error) { alert(error.message); return []; }
  return data || [];
}

export async function calculateMonthSum(dateStr) {
  if (!state.currentUser) return 0;

  const { start, end } = monthRange(dateStr || getSelectedDate());

  const { data, error } = await supabaseClient
    .from("expenses")
    .select("amount")
    .eq("user_id", state.currentUser.id)
    .gte("expense_date", start)
    .lt("expense_date", end);

  if (error) { alert(error.message); return 0; }
  return (data || []).reduce((sum, x) => sum + Number(x.amount), 0);
}

export async function addExpense() {
  if (!state.currentUser) { alert("Najpierw się zaloguj."); return; }

  const name   = expenseNameInput.value.trim();
  const amount = parseFloat(expenseAmountInput.value);

  if (!name || isNaN(amount) || amount <= 0) {
    alert("Wpisz poprawną nazwę i kwotę większą od 0.");
    return;
  }

  const { error } = await supabaseClient.from("expenses").insert([{
    user_id:      state.currentUser.id,
    expense_date: getSelectedDate(),
    name,
    amount
  }]);

  if (error) { alert(error.message); return; }

  expenseNameInput.value   = "";
  expenseAmountInput.value = "";
  await render();
}

async function removeExpense(id) {
  const { error } = await supabaseClient.from("expenses").delete().eq("id", id);
  if (error) { alert(error.message); return; }
  await render();
}

// --- Render ---
export async function render() {
  const expenses = await getExpenses();
  list.innerHTML = "";
  let sum = 0;

  expenses.forEach(expense => {
    const li          = document.createElement("li");
    const textWrapper = document.createElement("div");
    textWrapper.className = "expense-text";

    const nameSpan = document.createElement("span");
    nameSpan.className   = "expense-name";
    nameSpan.textContent = expense.name;

    const amountSpan = document.createElement("span");
    amountSpan.className   = "expense-amount";
    amountSpan.textContent = `${Number(expense.amount).toFixed(2)} zł`;

    textWrapper.appendChild(nameSpan);
    textWrapper.appendChild(amountSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Usuń";
    deleteBtn.className   = "delete-btn";
    deleteBtn.onclick     = () => removeExpense(expense.id);

    li.appendChild(textWrapper);
    li.appendChild(deleteBtn);
    list.appendChild(li);

    sum += Number(expense.amount);
  });

  sumEl.textContent = sum.toFixed(2);

  const monthTotal  = await calculateMonthSum();
  monthSumEl.textContent = monthTotal.toFixed(2);

  const monthIncome = await calculateMonthIncomeSum(getSelectedDate());
  costsTabIncomeSumEl.textContent = monthIncome.toFixed(2);

  const budget = monthIncome - monthTotal;
  budgetSumEl.textContent  = budget.toFixed(2) + " zł";
  budgetSumEl.style.color  = budget >= 0 ? "#76ffb0" : "#ff8eb7";
}
