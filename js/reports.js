import { supabaseClient } from "./supabase.js";
import { state } from "./state.js";

const chartInstances = {};

// --- Data fetching ---
export async function loadReportsData() {
  if (!state.currentUser) return;

  const now    = new Date();
  const months = [];
  const labels = [];

  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString().split("T")[0];
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split("T")[0];
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
