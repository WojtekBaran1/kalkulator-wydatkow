let expenses = [];

function add() {
  const name = document.getElementById("name").value;
  const amount = parseFloat(document.getElementById("amount").value);

  if (!name || !amount) return;

  expenses.push({ name, amount });

  render();
}

function render() {
  const list = document.getElementById("list");
  const sumEl = document.getElementById("sum");

  list.innerHTML = "";
  let sum = 0;

  expenses.forEach(e => {
    const li = document.createElement("li");
    li.textContent = e.name + " - " + e.amount + " zł";
    list.appendChild(li);
    sum += e.amount;
  });

  sumEl.textContent = sum;
}