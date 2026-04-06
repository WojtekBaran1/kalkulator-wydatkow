import { supabaseClient } from "./supabase.js";
import { state } from "./state.js";

const chartInstances = {};

// Default card order — used when user has no saved preference yet
const DEFAULT_ORDER = ["monthKind", "weekKind", "weekDays", "monthIncome", "monthCosts", "monthSavings"];

// --- Card order: save & load ---
async function saveCardOrder(order) {
  // We use "upsert" — insert a new row OR update it if the user already has one
  await supabaseClient.from("user_preferences").upsert({
    user_id:      state.currentUser.id,
    report_order: JSON.stringify(order)   // store the array as a JSON string in the DB
  }, { onConflict: "user_id" });
}

async function loadCardOrder() {
  const { data } = await supabaseClient
    .from("user_preferences")
    .select("report_order")
    .eq("user_id", state.currentUser.id)
    .single();                            // expect at most one row

  // If user has a saved order, parse it; otherwise use the default
  return data?.report_order ? JSON.parse(data.report_order) : DEFAULT_ORDER;
}

function applyCardOrder(order) {
  const tab = document.getElementById("reportsTab");

  // Re-arrange the cards in the DOM to match the saved order
  order.forEach(cardId => {
    const card = tab.querySelector(`[data-card-id="${cardId}"]`);
    if (card) tab.appendChild(card);   // appendChild moves an existing element to the end
  });

  // Update ▲▼ button visibility: hide ▲ on first card, hide ▼ on last card
  const cards = tab.querySelectorAll(".chart-card");
  cards.forEach((card, i) => {
    card.querySelector("[data-dir='up']").style.visibility   = i === 0                ? "hidden" : "visible";
    card.querySelector("[data-dir='down']").style.visibility = i === cards.length - 1 ? "hidden" : "visible";
  });
}

function initCardOrderButtons() {
  const tab = document.getElementById("reportsTab");

  tab.querySelectorAll(".order-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const card     = btn.closest(".chart-card");
      const allCards = [...tab.querySelectorAll(".chart-card")];
      const index    = allCards.indexOf(card);
      const dir      = btn.dataset.dir;

      // Swap the card with its neighbour
      if (dir === "up" && index > 0) {
        tab.insertBefore(card, allCards[index - 1]);   // move card before the one above it
      } else if (dir === "down" && index < allCards.length - 1) {
        tab.insertBefore(allCards[index + 1], card);   // move the card below above current
      }

      // Read the new order from the DOM and save it
      const newOrder = [...tab.querySelectorAll(".chart-card")]
        .map(c => c.dataset.cardId);

      applyCardOrder(newOrder);   // refresh button visibility
      await saveCardOrder(newOrder);
    });
  });
}

// --- Helpers ---
function localDateStr(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthRangeFromStr(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const start    = `${year}-${String(month).padStart(2, "0")}-01`;
  const endYear  = month === 12 ? year + 1 : year;
  const endMonth = month === 12 ? 1 : month + 1;
  const end      = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
  return { start, end };
}

// "2026-W14" → { start, end (exclusive next Monday), sundayStr (display) }
function weekRangeFromStr(weekStr) {
  const [yearStr, weekPart] = weekStr.split("-W");
  const year = Number(yearStr);
  const week = Number(weekPart);
  // Jan 4 of the year is always in ISO week 1
  const jan4   = new Date(year, 0, 4);
  const jan4Dow = jan4.getDay() || 7; // 1=Mon…7=Sun
  const monday  = new Date(year, 0, 4 - (jan4Dow - 1) + (week - 1) * 7);
  const sunday  = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const nextMon = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
  return { start: localDateStr(monday), end: localDateStr(nextMon), sundayStr: localDateStr(sunday) };
}

function currentWeekValue() {
  const now     = new Date();
  const jan4    = new Date(now.getFullYear(), 0, 4);
  const jan4Dow = jan4.getDay() || 7;
  const week1Mon = new Date(now.getFullYear(), 0, 4 - (jan4Dow - 1));
  // Use UTC to avoid DST offset skewing the day count
  const utcNow  = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const utcMon  = Date.UTC(week1Mon.getFullYear(), week1Mon.getMonth(), week1Mon.getDate());
  const week    = Math.floor((utcNow - utcMon) / (7 * 86400000)) + 1;
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

// --- Shared kind-rows renderer ---
async function fetchKindNames() {
  if (!state.currentUser) return {};
  const { data } = await supabaseClient.from("kind_cost").select("id, name")
    .eq("user_id", state.currentUser.id);
  const map = {};
  (data || []).forEach(k => { map[k.id] = k.name; });
  return map;
}

function renderKindRows(listId, totalId, expenses, kindNames, emptyMsg) {
  const grouped = {};
  let total = 0;
  expenses.forEach(e => {
    const key = e.kind_id || "__none__";
    grouped[key] = (grouped[key] || 0) + Number(e.amount);
    total += Number(e.amount);
  });

  const list = document.getElementById(listId);
  list.innerHTML = "";

  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    const li = document.createElement("li");
    li.className   = "kind-summary-empty";
    li.textContent = emptyMsg;
    list.appendChild(li);
  } else {
    entries.forEach(([kindId, amount]) => {
      const name   = kindId === "__none__" ? "Bez kategorii" : (kindNames[kindId] || "Nieznany");
      const pct    = total !== 0 ? (amount / total) * 100 : 0;
      const li     = document.createElement("li");
      li.className = "kind-summary-row";
      li.innerHTML = `
        <div class="kind-summary-info">
          <span class="kind-summary-name">${name}</span>
          <span class="kind-summary-amount">${amount.toFixed(2)} zł</span>
        </div>
        <div class="kind-summary-bar-wrap">
          <div class="kind-summary-bar" style="width:${pct.toFixed(1)}%"></div>
        </div>`;
      list.appendChild(li);
    });
  }

  document.getElementById(totalId).textContent = `${total.toFixed(2)} zł`;
}

// --- Monthly kind summary ---
async function loadKindSummary(monthStr) {
  if (!state.currentUser) return;
  const { start, end } = monthRangeFromStr(monthStr);
  const [expRes, kindNames] = await Promise.all([
    supabaseClient.from("expenses").select("amount, kind_id")
      .eq("user_id", state.currentUser.id)
      .gte("expense_date", start).lt("expense_date", end),
    fetchKindNames()
  ]);
  renderKindRows("kindSummaryList", "kindSummaryTotal", expRes.data || [], kindNames, "Brak wydatków w tym miesiącu.");
}

// --- Weekly kind summary ---
async function loadWeeklyKindSummary(weekStr) {
  if (!state.currentUser) return;
  const { start, end, sundayStr } = weekRangeFromStr(weekStr);

  const fmtDate = s => s.split("-").reverse().join(".");
  document.getElementById("weekRangeLabel").textContent =
    `${fmtDate(start)} – ${fmtDate(sundayStr)}`;

  const [expRes, kindNames] = await Promise.all([
    supabaseClient.from("expenses").select("amount, kind_id")
      .eq("user_id", state.currentUser.id)
      .gte("expense_date", start).lt("expense_date", end),
    fetchKindNames()
  ]);
  renderKindRows("weekKindSummaryList", "weekKindSummaryTotal", expRes.data || [], kindNames, "Brak wydatków w tym tygodniu.");
}

// --- Weekly day summary ---
// Polish short day names, starting from Monday (index 0)
const DAY_NAMES = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

async function loadWeeklyDaySummary(weekStr) {
  if (!state.currentUser) return;

  // 1. Calculate the date range for the selected week
  const { start, end, sundayStr } = weekRangeFromStr(weekStr);

  // 2. Update the date label next to the picker (e.g. "07.04 – 13.04")
  const fmtDate = s => s.split("-").reverse().join(".");
  document.getElementById("dayWeekRangeLabel").textContent =
    `${fmtDate(start)} – ${fmtDate(sundayStr)}`;

  // 3. Fetch ALL expenses for the whole week in a single database query
  const { data } = await supabaseClient
    .from("expenses")
    .select("expense_date, amount")
    .eq("user_id", state.currentUser.id)
    .gte("expense_date", start)
    .lt("expense_date", end);

  // 4. Group expenses by date using a plain object as a dictionary
  //    e.g. { "2026-04-07": 120.50, "2026-04-09": 45.00 }
  const byDate = {};
  (data || []).forEach(e => {
    byDate[e.expense_date] = (byDate[e.expense_date] || 0) + Number(e.amount);
  });

  // 5. Build two arrays: labels (day names) and amounts (totals)
  //    We loop 7 times, once per day starting from Monday
  const labels  = [];
  const amounts = [];
  const [y, m, d] = start.split("-").map(Number);

  for (let i = 0; i < 7; i++) {
    // Create the date for Monday + i days using local calendar (no DST issues)
    const date    = new Date(y, m - 1, d + i);
    const dateStr = localDateStr(date);           // e.g. "2026-04-07"
    const dayNum  = date.getDate().toString().padStart(2, "0");
    const monNum  = String(date.getMonth() + 1).padStart(2, "0");

    labels.push(`${DAY_NAMES[i]} ${dayNum}.${monNum}`); // e.g. "Pon 07.04"
    amounts.push(byDate[dateStr] || 0);           // 0 if no expenses that day
  }

  // 6. Draw the bar chart
  renderDayChart(labels, amounts);
}

function renderDayChart(labels, amounts) {
  // Destroy old chart instance if it exists (prevents memory leaks on re-render)
  if (chartInstances.chartWeekDays) chartInstances.chartWeekDays.destroy();

  const canvas = document.getElementById("chartWeekDays");
  const ctx    = canvas.getContext("2d");

  // Color each bar: pink if has expenses, subtle grey if zero
  const colors = amounts.map(v =>
    v > 0 ? "rgba(255, 142, 183, 0.6)" : "rgba(255,255,255,0.07)"
  );
  const borders = amounts.map(v =>
    v > 0 ? "rgba(255, 142, 183, 1)" : "rgba(255,255,255,0.15)"
  );

  chartInstances.chartWeekDays = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data:             amounts,
        backgroundColor:  colors,
        borderColor:      borders,
        borderWidth:      2,
        borderRadius:     8,
        borderSkipped:    false,
      }]
    },
    options: barOptions()
  });
}

// --- Data fetching ---
export async function loadReportsData() {
  if (!state.currentUser) return;

  const now    = new Date();
  const months = [];
  const labels = [];

  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = localDateStr(d);
    const end   = localDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    months.push({ start, end });
    labels.push(d.toLocaleDateString("pl-PL", { month: "short", year: "numeric" }));
  }

  const [expenseResults, incomeResults] = await Promise.all([
    Promise.all(months.map(m =>
      supabaseClient.from("expenses").select("amount")
        .eq("user_id", state.currentUser.id)
        .gte("expense_date", m.start).lt("expense_date", m.end)
    )),
    Promise.all(months.map(m =>
      supabaseClient.from("incomes").select("amount")
        .eq("user_id", state.currentUser.id)
        .gte("income_date", m.start).lt("income_date", m.end)
    ))
  ]);

  const costsData   = expenseResults.map(r => (r.data || []).reduce((s, x) => s + Number(x.amount), 0));
  const incomesData = incomeResults.map(r  => (r.data || []).reduce((s, x) => s + Number(x.amount), 0));
  const savingsData = incomesData.map((inc, i) => inc - costsData[i]);

  renderCharts(labels, costsData, incomesData, savingsData);

  // Init card order — load saved order and wire up buttons (buttons only once)
  const order = await loadCardOrder();
  applyCardOrder(order);
  if (!document.getElementById("reportsTab").dataset.orderReady) {
    initCardOrderButtons();
    document.getElementById("reportsTab").dataset.orderReady = "1";
  }

  // Init month picker
  const monthPicker = document.getElementById("kindMonthPicker");
  if (!monthPicker.value) {
    monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    monthPicker.addEventListener("change", () => loadKindSummary(monthPicker.value));
  }

  // Init week picker
  const weekPicker = document.getElementById("kindWeekPicker");
  if (!weekPicker.value) {
    weekPicker.value = currentWeekValue();
    weekPicker.addEventListener("change", () => loadWeeklyKindSummary(weekPicker.value));
  }

  // Init day-by-day week picker
  const dayWeekPicker = document.getElementById("dayWeekPicker");
  if (!dayWeekPicker.value) {
    dayWeekPicker.value = currentWeekValue();
    dayWeekPicker.addEventListener("change", () => loadWeeklyDaySummary(dayWeekPicker.value));
  }

  await Promise.all([
    loadKindSummary(monthPicker.value),
    loadWeeklyKindSummary(weekPicker.value),
    loadWeeklyDaySummary(dayWeekPicker.value)
  ]);
}

// --- Chart helpers ---
function makeGradient(ctx, colorTop, colorBottom) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 190);
  gradient.addColorStop(0, colorTop);
  gradient.addColorStop(1, colorBottom);
  return gradient;
}

function buildBarChart(canvasId, data, colorSolid, colorTop, colorBottom) {
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

  const canvas = document.getElementById(canvasId);
  const ctx    = canvas.getContext("2d");

  chartInstances[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: canvas._labels,
      datasets: [{
        data,
        backgroundColor: makeGradient(ctx, colorTop, colorBottom),
        borderColor:      colorSolid,
        borderWidth:      2,
        borderRadius:     8,
        borderSkipped:    false,
      }]
    },
    options: barOptions()
  });

  return chartInstances[canvasId];
}

function barOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: c => `  ${c.parsed.y.toFixed(2)} zł` } }
    },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#8ea0d1" } },
      y: {
        grid:        { color: "rgba(255,255,255,0.04)" },
        ticks:       { color: "#8ea0d1", callback: v => v.toFixed(0) + " zł" },
        beginAtZero: true
      }
    }
  };
}

// --- Render all charts ---
function renderCharts(labels, costsData, incomesData, savingsData) {
  Chart.defaults.color       = "#b8c4e8";
  Chart.defaults.font.family = "Arial, sans-serif";
  Chart.defaults.font.size   = 12;

  // Attach labels to canvas elements so buildBarChart can access them
  document.getElementById("chartIncomes")._labels = labels;
  document.getElementById("chartCosts")._labels   = labels;

  buildBarChart("chartIncomes", incomesData,
    "rgba(118, 255, 176, 1)",
    "rgba(118, 255, 176, 0.55)",
    "rgba(118, 255, 176, 0.05)"
  );

  buildBarChart("chartCosts", costsData,
    "rgba(255, 142, 183, 1)",
    "rgba(255, 142, 183, 0.55)",
    "rgba(255, 142, 183, 0.05)"
  );

  // Savings — per-bar colour based on positive/negative value
  if (chartInstances.chartSavings) chartInstances.chartSavings.destroy();
  const savingsCtx = document.getElementById("chartSavings").getContext("2d");
  chartInstances.chartSavings = new Chart(savingsCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data:            savingsData,
        backgroundColor: savingsData.map(v => v >= 0 ? "rgba(118, 255, 176, 0.45)" : "rgba(255, 142, 183, 0.45)"),
        borderColor:     savingsData.map(v => v >= 0 ? "rgba(118, 255, 176, 1)"    : "rgba(255, 142, 183, 1)"),
        borderWidth:     2,
        borderRadius:    8,
        borderSkipped:   false,
      }]
    },
    options: barOptions()
  });
}
