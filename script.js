const expenseNameInput = document.getElementById("name");
const expenseAmountInput = document.getElementById("amount");
const expenseDateInput = document.getElementById("expenseDate");
const list = document.getElementById("list");
const sumEl = document.getElementById("sum");
const monthSumEl = document.getElementById("monthSum");

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getSelectedDate() {
  return expenseDateInput.value || getTodayDate();
}

function getStorageKey() {
  return "expenses-" + getSelectedDate();
}

function getExpenses() {
  const data = localStorage.getItem(getStorageKey());
  return data ? JSON.parse(data) : [];
}

function saveExpenses(expenses) {
  localStorage.setItem(getStorageKey(), JSON.stringify(expenses));
}

function add() {
  const name = expenseNameInput.value.trim();
  const amount = parseFloat(expenseAmountInput.value);

  if (!name || isNaN(amount) || amount <= 0) return;

  const expenses = getExpenses();

  expenses.push({ name, amount });

  saveExpenses(expenses);

  expenseNameInput.value = "";
  expenseAmountInput.value = "";

  render();
}

function removeExpense(index) {
  const expenses = getExpenses();
  expenses.splice(index, 1);
  saveExpenses(expenses);
  render();
}

function render() {
  const expenses = getExpenses();

  list.innerHTML = "";
  let sum = 0;

  expenses.forEach((expense, index) => {
    const li = document.createElement("li");

    const textWrapper = document.createElement("div");
    textWrapper.className = "expense-text";

    const nameSpan = document.createElement("span");
    nameSpan.className = "expense-name";
    nameSpan.textContent = expense.name;

    const amountSpan = document.createElement("span");
    amountSpan.className = "expense-amount";
    amountSpan.textContent = `${expense.amount.toFixed(2)} zł`;

    textWrapper.appendChild(nameSpan);
    textWrapper.appendChild(amountSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Usuń";
    deleteBtn.className = "delete-btn";
    deleteBtn.onclick = function () {
      removeExpense(index);
    };

    li.appendChild(textWrapper);
    li.appendChild(deleteBtn);
    list.appendChild(li);

    sum += expense.amount;

    const monthTotal = calculateMonthSum();
    monthSumEl.textContent = monthTotal.toFixed(2);
  });

  sumEl.textContent = sum.toFixed(2);
}

function calculateMonthSum() {
  const selectedDate = getSelectedDate(); // np. 2026-03-30
  const monthPrefix = selectedDate.slice(0, 7); // 2026-03

  let total = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key.startsWith("expenses-") && key.includes(monthPrefix)) {
      const data = JSON.parse(localStorage.getItem(key)) || [];

      data.forEach(e => {
        total += e.amount;
      });
    }
  }

  return total;
}

expenseDateInput.addEventListener("change", render);

expenseDateInput.value = getTodayDate();

render();