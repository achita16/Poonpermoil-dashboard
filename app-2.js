// วาง URL CSV ของ Google Sheet ที่ Publish to web ไว้ตรงนี้
// ต้องใช้ /pub?output=csv (ไม่ใช่ /pubhtml) เพราะ fetch() ต้องการข้อมูลดิบแบบ CSV
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1USobfqcmWLx3rlCr0ld-bSvAxjtQtjMn2yg2zFzhqsbv-Vz04v5I0dBT8ipsIA/pub?output=csv";
const PRODUCTS = [
  { id: "g95", code: "T01 GASOHOL 95", color: "#f5b874", remaining: 8200, capacity: 15000, rangeStart: null, rangeEnd: null },
  { id: "g91", code: "T02 GASOHOL 91", color: "#86d4a6", remaining: 6400, capacity: 15000, rangeStart: null, rangeEnd: null },
  { id: "e20", code: "T03 E20", color: "#b5dc8e", remaining: 5100, capacity: 15000, rangeStart: null, rangeEnd: null },
  { id: "diesel", code: "T04 DIESEL", color: "#83c9eb", remaining: 12400, capacity: 20000, rangeStart: null, rangeEnd: null },
];
const demoSales = { g95: 1140, g91: 820, e20: 610, diesel: 1870 };
let salesRows = [];
// รถ 20,000 ลิตรมี 5 ช่องเสมอ แม้สินค้ามี 4 ประเภท
const TRUCKS = { 20000: { name: "รถเล็ก", slots: 5 }, 30000: { name: "รถใหญ่", slots: 10 } };
// รถใหญ่ 30,000 ลิตรเป็นค่าเริ่มต้น และมี 10 ช่อง
let loadConfig = Array.from({ length: 10 }, (_, index) => ({ product: PRODUCTS[index % PRODUCTS.length].id, litres: index === 0 ? 4000 : 0 }));
const fmt = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
const num = value => Number(value) || 0;

function latestDataDate() {
  return salesRows.reduce((max, row) => {
    const d = new Date(row.date);
    return d > max ? d : max;
  }, new Date(salesRows[0].date));
}
function toDateInputValue(date) { return date.toISOString().slice(0, 10); }
// ตั้งค่าเริ่มต้นของช่วงวันที่ (7 วันล่าสุดจากข้อมูลจริง) ให้ทุกสินค้าที่ยังไม่เคยเลือกช่วงเอง
function applyDefaultRanges() {
  if (!salesRows.length) return;
  const maxDate = latestDataDate();
  const defaultStart = new Date(maxDate);
  defaultStart.setDate(defaultStart.getDate() - 6);
  PRODUCTS.forEach(product => {
    if (!product.rangeStart) product.rangeStart = toDateInputValue(defaultStart);
    if (!product.rangeEnd) product.rangeEnd = toDateInputValue(maxDate);
  });
}
function averageSales(id) {
  if (!salesRows.length) return demoSales[id];
  const product = PRODUCTS.find(item => item.id === id);
  const start = product.rangeStart ? new Date(product.rangeStart) : null;
  const end = product.rangeEnd ? new Date(product.rangeEnd) : null;
  const rows = salesRows.filter(row => {
    if (row.product !== id) return false;
    const d = new Date(row.date);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
  return rows.length ? rows.reduce((sum, row) => sum + num(row.litres), 0) / rows.length : 0;
}
function productLoad(id) { return loadConfig.filter(item => item.product === id).reduce((sum, item) => sum + num(item.litres), 0); }
function deadStock(product) { return product.capacity * 0.12; }
function stockDay(available, sales) { return sales ? Math.max(available, 0) / sales : 0; }

function renderProducts() {
  const area = document.querySelector("#productColumns");
  const template = document.querySelector("#productTemplate");
  area.innerHTML = "";
  PRODUCTS.forEach(product => {
    const node = template.content.cloneNode(true);
    const sales = averageSales(product.id);
    const dead = deadStock(product);
    const fill = Math.min((product.remaining / product.capacity) * 100, 100);
    node.querySelector(".product-code").textContent = product.code;
    node.querySelector(".tank-fill").style.cssText = `--fill:${fill}%;background:${product.color}`;
    node.querySelector(".tank-percent").textContent = `คงเหลือ ${fmt(product.remaining)} ลิตร`;
    const rangeStart = node.querySelector(".range-start");
    const rangeEnd = node.querySelector(".range-end");
    rangeStart.value = product.rangeStart || "";
    rangeStart.dataset.id = product.id;
    rangeEnd.value = product.rangeEnd || "";
    rangeEnd.dataset.id = product.id;
    node.querySelector(".selected-sales b").textContent = fmt(sales);
    node.querySelector(".dead-stock b").textContent = fmt(dead);
    const remaining = node.querySelector(".remaining");
    remaining.value = product.remaining;
    remaining.dataset.id = product.id;
    node.querySelector(".stock-current b").textContent = sales ? `${stockDay(product.remaining - dead, sales).toFixed(1)} วัน` : "—";
    area.append(node);
  });
}
function renderSlots() {
  const area = document.querySelector("#loadSlots");
  area.innerHTML = "";
  area.dataset.slots = String(loadConfig.length);
  loadConfig.forEach((item, index) => {
    const shortNames = { g95: "95", g91: "91", e20: "E20", diesel: "DSL" };
    const products = PRODUCTS.map(product => `<option value="${product.id}" ${product.id === item.product ? "selected" : ""}>${shortNames[product.id]}</option>`).join("");
    area.insertAdjacentHTML("beforeend", `<div class="load-slot"><p>ช่องที่ ${index + 1}</p><select data-field="product" data-index="${index}">${products}</select><select data-field="litres" data-index="${index}"><option value="0" ${!item.litres ? "selected" : ""}>—</option><option value="3000" ${item.litres === 3000 ? "selected" : ""}>3,000 L</option><option value="4000" ${item.litres === 4000 ? "selected" : ""}>4,000 L</option></select></div>`);
  });
  const total = loadConfig.reduce((sum, item) => sum + num(item.litres), 0);
  const capacity = num(document.querySelector("#truckSize").value);
  document.querySelector("#loadTotal").textContent = `${fmt(total)} ลิตร`;
  document.querySelector("#truckCapacityLabel").textContent = `${fmt(capacity)} ลิตร`;
  document.querySelector("#truckTypeLabel").textContent = TRUCKS[capacity].name;
  document.querySelector("#truckSlotLabel").textContent = `${TRUCKS[capacity].slots} ช่อง`;
  document.querySelector("#capacityRemaining").textContent = total > capacity ? `เกินความจุ ${fmt(total - capacity)} ลิตร` : `เหลือ ${fmt(capacity - total)} ลิตร`;
}
function renderAfterDelivery() {
  const area = document.querySelector("#afterDelivery");
  area.innerHTML = "";
  PRODUCTS.forEach(product => {
    const sales = averageSales(product.id);
    const after = stockDay(product.remaining + productLoad(product.id) - deadStock(product), sales);
    area.insertAdjacentHTML("beforeend", `<article class="after-item"><p>StD<small>(ใหม่)</small> · ${product.code}</p><b>${sales ? after.toFixed(1) : "—"} วัน</b><small>Load ${fmt(productLoad(product.id))} ลิตร</small></article>`);
  });
}
function render() { renderProducts(); renderSlots(); renderAfterDelivery(); }
function parseCsvLine(line) {
  // แยกฟิลด์ด้วยคอมมา แต่ไม่แยกคอมมาที่อยู่ในเครื่องหมายคำพูด (เช่น "4,301.62")
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(value => value.trim());
}
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const keys = parseCsvLine(lines.shift()).map(key => key.toLowerCase());
  return lines
    .map(line => {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
      if (row.litres) row.litres = row.litres.replace(/,/g, ""); // ลบคอมมาคั่นหลักพันออกจากตัวเลข
      return row;
    })
    .filter(row => row.date && row.product && row.litres);
}
async function loadSheet() {
  if (!SHEET_CSV_URL) return;
  document.querySelector("#dataStatus").textContent = "กำลังโหลด…";
  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error("Sheet unavailable");
    salesRows = parseCsv(await response.text()).map(row => ({ ...row, product: row.product.toLowerCase() }));
    applyDefaultRanges();
    document.querySelector("#dataStatus").textContent = "เชื่อม Google Sheets แล้ว";
    document.querySelector(".data-status i").style.background = "#25ac58";
    render();
  } catch { document.querySelector("#dataStatus").textContent = "ใช้ข้อมูลตัวอย่าง"; }
}
document.addEventListener("input", event => {
  if (event.target.matches(".remaining")) {
    const product = PRODUCTS.find(p => p.id === event.target.dataset.id);
    product.remaining = num(event.target.value);
    // อัปเดตเฉพาะ StD และ tank fill ใน card นั้น ไม่ re-render ทั้งหน้า เพื่อไม่ให้โฟกัสหาย
    const card = event.target.closest(".product");
    if (card) {
      const sales = averageSales(product.id);
      const dead = deadStock(product);
      const fill = Math.min((product.remaining / product.capacity) * 100, 100);
      card.querySelector(".tank-fill").style.cssText = `--fill:${fill}%;background:${product.color}`;
      card.querySelector(".tank-percent").textContent = `คงเหลือ ${fmt(product.remaining)} ลิตร`;
      card.querySelector(".stock-current b").textContent = sales ? `${stockDay(product.remaining - dead, sales).toFixed(1)} วัน` : "—";
    }
    renderAfterDelivery();
  }
});
document.addEventListener("change", event => {
  if (event.target.matches(".range-start") || event.target.matches(".range-end")) {
    const product = PRODUCTS.find(product => product.id === event.target.dataset.id);
    if (event.target.matches(".range-start")) product.rangeStart = event.target.value;
    else product.rangeEnd = event.target.value;
    renderProducts(); renderAfterDelivery();
  }
  if (event.target.matches("#truckSize")) {
    const truck = TRUCKS[num(event.target.value)];
    loadConfig = Array.from({ length: truck.slots }, (_, index) => loadConfig[index] || ({ product: PRODUCTS[index % PRODUCTS.length].id, litres: 0 }));
    renderSlots(); renderAfterDelivery();
  }
  if (event.target.matches("[data-field]")) {
    const field = event.target.dataset.field;
    // ฟิลด์ litres ต้องเก็บเป็นตัวเลข ไม่ใช่ string เพราะ renderSlots() เทียบด้วย === กับตัวเลข
    loadConfig[num(event.target.dataset.index)][field] = field === "litres" ? num(event.target.value) : event.target.value;
    renderSlots(); renderAfterDelivery();
  }
});
document.querySelector("#refreshBtn").onclick = loadSheet;
render(); loadSheet();
