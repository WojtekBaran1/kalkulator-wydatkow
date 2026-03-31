const SUPABASE_URL = "https://mqqxyymaovfgknpeqyuu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YtL_0LwSwcp2SK_NJzVhaA_iN4xksw_";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const authMessage = document.getElementById("authMessage");
const userInfo = document.getElementById("userInfo");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

const expenseNameInput = document.getElementById("name");
const expenseAmountInput = document.getElementById("amount");
const expenseDateInput = document.getElementById("expenseDate");
const list = document.getElementById("list");
const sumEl = document.getElementById("sum");
const monthSumEl = document.getElementById("monthSum");
const addExpenseBtn = document.getElementById("addExpenseBtn");

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getSelectedDate() {
  return expenseDateInput.value || getTodayDate();
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#ff8eb7" : "#9feaff";
}

async function signUp() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    setAuthMessage("Wpisz email i hasło.", true);
    return;
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  setAuthMessage("Konto utworzone. Teraz zaloguj się.");
}

async function signIn() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    setAuthMessage("Wpisz email i hasło.", true);
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  setAuthMessage("");
  await checkAuth();
}

async function signOut() {
  await supabaseClient.auth.signOut();
  await checkAuth();
}

async function getCurrentUser() {
  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  return user;
}

async function getExpenses() {
  const user = await getCurrentUser();
  if (!user) return [];

  const selectedDate = getSelectedDate();

  const { data, error } = await supabaseClient
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)
    .eq("expense_date", selectedDate)
    .order("created_at", { ascending: true });

  if (error) {
    alert(error.message);
    return [];
  }

  return data || [];
}

async function calculateMonthSum() {
  const user = await getCurrentUser();
  if (!user) return 0;

  const selectedDate = new Date(getSelectedDate());
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const start = new Date(year, month, 1).toISOString().split("T")[0];
  const end = new Date(year, month + 1, 1).toISOString().split("T")[0];

  const { data, error } = await supabaseClient
    .from("expenses")
    .select("amount")
    .eq("user_id", user.id)
    .gte("expense_date", start)
    .lt("expense_date", end);

  if (error) {
    alert(error.message);
    return 0;
  }

  return (data || []).reduce((sum, item) => sum + Number(item.amount), 0);
}

async function addExpense() {
  const user = await getCurrentUser();

  if (!user) {
    alert("Najpierw się zaloguj.");
    return;
  }

  const name = expenseNameInput.value.trim();
  const amount = parseFloat(expenseAmountInput.value);
  const expenseDate = getSelectedDate();

  if (!name || isNaN(amount) || amount <= 0) {
    alert("Wpisz poprawną nazwę i kwotę większą od 0.");
    return;
  }

  const { error } = await supabaseClient
    .from("expenses")
    .insert([
      {
        user_id: user.id,
        expense_date: expenseDate,
        name,
        amount
      }
    ]);

  if (error) {
    alert(error.message);
    return;
  }

  expenseNameInput.value = "";
  expenseAmountInput.value = "";

  await render();
}

async function removeExpense(id) {
  const { error } = await supabaseClient
    .from("expenses")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await render();
}

async function render() {
  const expenses = await getExpenses();

  list.innerHTML = "";
  let sum = 0;

  expenses.forEach((expense) => {
    const li = document.createElement("li");

    const textWrapper = document.createElement("div");
    textWrapper.className = "expense-text";

    const nameSpan = document.createElement("span");
    nameSpan.className = "expense-name";
    nameSpan.textContent = expense.name;

    const amountSpan = document.createElement("span");
    amountSpan.className = "expense-amount";
    amountSpan.textContent = `${Number(expense.amount).toFixed(2)} zł`;

    textWrapper.appendChild(nameSpan);
    textWrapper.appendChild(amountSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Usuń";
    deleteBtn.className = "delete-btn";
    deleteBtn.onclick = function () {
      removeExpense(expense.id);
    };

    li.appendChild(textWrapper);
    li.appendChild(deleteBtn);
    list.appendChild(li);

    sum += Number(expense.amount);
  });

  sumEl.textContent = sum.toFixed(2);

  const monthTotal = await calculateMonthSum();
  monthSumEl.textContent = monthTotal.toFixed(2);
}

async function checkAuth() {
  const user = await getCurrentUser();

  if (user) {
    authSection.style.display = "none";
    appSection.style.display = "block";
    userInfo.textContent = `Zalogowano jako: ${user.email}`;
    expenseDateInput.value = expenseDateInput.value || getTodayDate();
    await render();
  } else {
    authSection.style.display = "block";
    appSection.style.display = "none";
    userInfo.textContent = "";
  }
}

loginBtn.addEventListener("click", signIn);
registerBtn.addEventListener("click", signUp);
logoutBtn.addEventListener("click", signOut);
addExpenseBtn.addEventListener("click", addExpense);
expenseDateInput.addEventListener("change", render);

supabaseClient.auth.onAuthStateChange(async () => {
  await checkAuth();
});

expenseDateInput.value = getTodayDate();
checkAuth();