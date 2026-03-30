const expenseNameInput = document.getElementById("name");
const expenseAmountInput = document.getElementById("amount");
const list = document.getElementById("list");
const sumEl = document.getElementById("sum");

function getTodayKey() {
  const today = new Date().toISOString().split("T")[0];
  return "expenses-" + today;
}

function getExpenses() {
  const data = localStorage.getItem(getTodayKey());
  return data ? JSON.parse(data) : [];
}

function saveExpenses(expenses) {
  localStorage.setItem(getTodayKey(), JSON.stringify(expenses));
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

    const textSpan = document.createElement("span");
    textSpan.textContent = `${expense.name} - ${expense.amount.toFixed(2)} zł`;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Usuń";
    deleteBtn.onclick = function () {
      removeExpense(index);
    };

    li.appendChild(textSpan);
    li.appendChild(deleteBtn);
    list.appendChild(li);

    sum += expense.amount;
  });

  sumEl.textContent = sum.toFixed(2);
}

render();