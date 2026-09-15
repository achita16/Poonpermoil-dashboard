// ============================================================
// POONPERM OIL LTD.
// CALCULATE OIL ORDER - Dashboard Logic
// ============================================================

// ------------------------------------------------------------
// 1. GOOGLE SHEETS
// ------------------------------------------------------------

// วาง URL CSV ของ Google Sheet ที่ Publish to web ไว้ตรงนี้
// ต้องใช้ /pub?output=csv
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1USobfqcmWLx3rlCr0ld-bSvAxjtQtjMn2yg2zFzhqsbv-Vz04v5I0dBT8ipsIA/pub?output=csv";


// ------------------------------------------------------------
// 2. PRODUCT CONFIGURATION
// ------------------------------------------------------------

const PRODUCTS = [
  {
    id: "g95",
    code: "T01 GASOHOL 95",
    color: "#f5b874",
    newColor: "#f6d58f",
    remaining: 8200,
    capacity: 20000,
    rangeStart: null,
    rangeEnd: null
  },

  {
    id: "g91",
    code: "T02 GASOHOL 91",
    color: "#86d4a6",
    newColor: "#f6d58f",
    remaining: 6400,
    capacity: 10000,
    rangeStart: null,
    rangeEnd: null
  },

  {
    id: "e20",
    code: "T03 E20",
    color: "#b5dc8e",
    newColor: "#f6d58f",
    remaining: 5100,
    capacity: 10000,
    rangeStart: null,
    rangeEnd: null
  },

  {
    id: "diesel",
    code: "T04 DIESEL",
    color: "#83c9eb",
    newColor: "#f6d58f",
    remaining: 12400,
    capacity: 30000,
    rangeStart: null,
    rangeEnd: null
  }
];


// ------------------------------------------------------------
// 3. DEMO SALES
// ------------------------------------------------------------

const demoSales = {
  g95: 1140,
  g91: 820,
  e20: 610,
  diesel: 1870
};

let salesRows = [];


// ------------------------------------------------------------
// 4. TRUCK CONFIGURATION
// ------------------------------------------------------------

// รถ 20,000 ลิตร = 5 ช่อง
// แต่ละช่องเลือกได้ 3,000 หรือ 4,000 ลิตร
//
// รถ 30,000 ลิตรยังเก็บไว้เป็นตัวเลือก เผื่ออนาคต
// แต่ค่าเริ่มต้นจะเป็นรถ 20,000 ลิตร

const TRUCKS = {
  20000: {
    name: "รถเล็ก",
    slots: 5
  },

  30000: {
    name: "รถใหญ่",
    slots: 10
  }
};


// ------------------------------------------------------------
// 5. INITIAL LOAD
// ------------------------------------------------------------

// เริ่มต้นเป็นรถ 20,000 ลิตร / 5 ช่อง
let loadConfig = Array.from(
  { length: 5 },
  (_, index) => ({
    product: PRODUCTS[index % PRODUCTS.length].id,
    litres: 0
  })
);


// ------------------------------------------------------------
// 6. HELPER FUNCTIONS
// ------------------------------------------------------------

const fmt = value =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);

const num = value =>
  Number(value) || 0;


// ------------------------------------------------------------
// 7. DATE FUNCTIONS
// ------------------------------------------------------------

function latestDataDate() {
  if (!salesRows.length) {
    return new Date();
  }

  return salesRows.reduce((max, row) => {
    const d = new Date(row.date);
    return d > max ? d : max;
  }, new Date(salesRows[0].date));
}


function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}


// ตั้งค่าเริ่มต้นเป็น 7 วันล่าสุดจากข้อมูลใน Google Sheets

function applyDefaultRanges() {
  if (!salesRows.length) return;

  const maxDate = latestDataDate();

  const defaultStart = new Date(maxDate);

  defaultStart.setDate(
    defaultStart.getDate() - 6
  );

  PRODUCTS.forEach(product => {

    if (!product.rangeStart) {
      product.rangeStart =
        toDateInputValue(defaultStart);
    }

    if (!product.rangeEnd) {
      product.rangeEnd =
        toDateInputValue(maxDate);
    }

  });
}


// ------------------------------------------------------------
// 8. AVERAGE SALES
// ------------------------------------------------------------

function averageSales(id) {

  // ถ้า Google Sheets ยังไม่มีข้อมูล
  // ให้ใช้ Demo Sales

  if (!salesRows.length) {
    return demoSales[id] || 0;
  }

  const product =
    PRODUCTS.find(item => item.id === id);

  if (!product) return 0;

  const start =
    product.rangeStart
      ? new Date(product.rangeStart)
      : null;

  const end =
    product.rangeEnd
      ? new Date(product.rangeEnd)
      : null;

  const rows =
    salesRows.filter(row => {

      if (row.product !== id) {
        return false;
      }

      const d =
        new Date(row.date);

      if (start && d < start) {
        return false;
      }

      if (end && d > end) {
        return false;
      }

      return true;
    });

  if (!rows.length) {
    return 0;
  }

  return (
    rows.reduce(
      (sum, row) =>
        sum + num(row.litres),
      0
    ) / rows.length
  );
}


// ------------------------------------------------------------
// 9. LOAD CALCULATION
// ------------------------------------------------------------

function productLoad(id) {

  return loadConfig
    .filter(item => item.product === id)
    .reduce(
      (sum, item) =>
        sum + num(item.litres),
      0
    );
}


// ------------------------------------------------------------
// 10. DEAD STOCK
// ------------------------------------------------------------

function deadStock(product) {

  return product.capacity * 0.12;
}


// ------------------------------------------------------------
// 11. STOCK DAY
// ------------------------------------------------------------

function stockDay(available, sales) {

  if (!sales) {
    return 0;
  }

  return Math.max(
    available,
    0
  ) / sales;
}


// ------------------------------------------------------------
// 12. CREATE TANK PROJECTION ELEMENTS
// ------------------------------------------------------------

function ensureTankProjection(card) {

  const tank =
    card.querySelector(".tank");

  if (!tank) {
    return null;
  }

  let newFill =
    tank.querySelector(".tank-new-fill");

  if (!newFill) {

    newFill =
      document.createElement("div");

    newFill.className =
      "tank-new-fill";

    newFill.hidden = true;

    tank.appendChild(newFill);
  }


  let projection =
    card.querySelector(".tank-projection");

  if (!projection) {

    projection =
      document.createElement("span");

    projection.className =
      "tank-projection";

    projection.hidden = true;

    const percent =
      card.querySelector(".tank-percent");

    if (percent) {
      percent.after(projection);
    } else {
      tank.after(projection);
    }
  }

  return {
    tank,
    newFill,
    projection
  };
}


// ------------------------------------------------------------
// 13. RENDER TANK
// ------------------------------------------------------------

function updateTank(card, product) {

  const elements =
    ensureTankProjection(card);

  if (!elements) {
    return;
  }

  const {
    tank,
    newFill,
    projection
  } = elements;


  // ----------------------------
  // น้ำมันปัจจุบัน
  // ----------------------------

  const current =
    Math.max(
      product.remaining,
      0
    );


  // ----------------------------
  // Load ที่สั่งเพิ่ม
  // ----------------------------

  const load =
    productLoad(product.id);


  // ----------------------------
  // น้ำมันรวมหลัง Load
  // ----------------------------

  const total =
    Math.min(
      current + load,
      product.capacity
    );


  // ----------------------------
  // % น้ำมันเดิม
  // ----------------------------

  const currentPercent =
    Math.min(
      (current / product.capacity) * 100,
      100
    );


  // ----------------------------
  // % น้ำมันรวม
  // ----------------------------

  const totalPercent =
    Math.min(
      (total / product.capacity) * 100,
      100
    );


  // ----------------------------
  // % ของ Load ใหม่
  // ----------------------------

  const loadPercent =
    Math.max(
      totalPercent - currentPercent,
      0
    );


  // ----------------------------
  // วาดน้ำมันเดิม
  // ----------------------------

  const fill =
    card.querySelector(".tank-fill");

  if (fill) {

    fill.style.height =
      `${currentPercent}%`;

    fill.style.bottom =
      "0";

    fill.style.background =
      product.color;
  }


  // ----------------------------
  // วาดน้ำมันที่ Order เพิ่ม
  // ----------------------------

  newFill.style.height =
    `${loadPercent}%`;

  newFill.style.bottom =
    `${currentPercent}%`;

  newFill.style.background =
    product.newColor;

  newFill.hidden =
    load <= 0;


  // ----------------------------
  // ข้อความใต้ถัง
  // ----------------------------

  const percentText =
    card.querySelector(".tank-percent");

  if (percentText) {

    percentText.textContent =
      `ความจุ ${fmt(product.capacity)} ลิตร`;
  }


  // ----------------------------
  // แสดงยอดหลังสั่ง
  // ----------------------------

  if (load > 0) {

    projection.textContent =
      `หลังสั่ง ${fmt(total)} ลิตร`;

    projection.hidden =
      false;

  } else {

    projection.hidden =
      true;
  }


  // ----------------------------
  // เตือนถ้า Load เกิน Capacity
  // ----------------------------

  if (
    current + load >
    product.capacity
  ) {

    projection.textContent =
      `⚠️ เกินความจุ · หลังสั่ง ${fmt(total)} ลิตร`;

    projection.style.color =
      "#c67b00";

  } else {

    projection.style.color =
      "#8a6a25";
  }
}


// ------------------------------------------------------------
// 14. RENDER PRODUCTS
// ------------------------------------------------------------

function renderProducts() {

  const area =
    document.querySelector(
      "#productColumns"
    );

  const template =
    document.querySelector(
      "#productTemplate"
    );

  if (!area || !template) {
    return;
  }

  area.innerHTML = "";


  PRODUCTS.forEach(product => {

    const node =
      template.content.cloneNode(true);

    const sales =
      averageSales(product.id);

    const dead =
      deadStock(product);


    // ----------------------------
    // Product Name
    // ----------------------------

    node.querySelector(
      ".product-code"
    ).textContent =
      product.code;


    // ----------------------------
    // Tank
    // ----------------------------

    const fill =
      Math.min(
        (product.remaining /
          product.capacity) * 100,
        100
      );

    const tankFill =
      node.querySelector(
        ".tank-fill"
      );

    if (tankFill) {

      tankFill.style.cssText =
        `
        --fill:${fill}%;
        height:${fill}%;
        bottom:0;
        background:${product.color};
        `;
    }


    // ----------------------------
    // Capacity
    // ----------------------------

    node.querySelector(
      ".tank-percent"
    ).textContent =
      `ความจุ ${fmt(product.capacity)} ลิตร`;


    // ----------------------------
    // Date Range
    // ----------------------------

    const rangeStart =
      node.querySelector(
        ".range-start"
      );

    const rangeEnd =
      node.querySelector(
        ".range-end"
      );


    if (rangeStart) {

      rangeStart.value =
        product.rangeStart || "";

      rangeStart.dataset.id =
        product.id;
    }


    if (rangeEnd) {

      rangeEnd.value =
        product.rangeEnd || "";

      rangeEnd.dataset.id =
        product.id;
    }


    // ----------------------------
    // Average Sales
    // ----------------------------

    const selectedSales =
      node.querySelector(
        ".selected-sales b"
      );

    if (selectedSales) {

      selectedSales.textContent =
        fmt(sales);
    }


    // ----------------------------
    // Dead Stock
    // ----------------------------

    const deadElement =
      node.querySelector(
        ".dead-stock b"
      );

    if (deadElement) {

      deadElement.textContent =
        fmt(dead);
    }


    // ----------------------------
    // Remaining
    // ----------------------------

    const remaining =
      node.querySelector(
        ".remaining"
      );

    if (remaining) {

      remaining.value =
        product.remaining;

      remaining.dataset.id =
        product.id;
    }


    // ----------------------------
    // Current Stock Day
    // ----------------------------

    const currentStockDay =
      node.querySelector(
        ".stock-current b"
      );

    if (currentStockDay) {

      currentStockDay.textContent =
        sales
          ? `${stockDay(
              product.remaining - dead,
              sales
            ).toFixed(1)} วัน`
          : "—";
    }


    // ----------------------------
    // Add card to page
    // ----------------------------

    area.appendChild(node);
  });


  // หลังจากสร้าง Card แล้ว
  // อัปเดต Tank อีกครั้ง
  // เพื่อรองรับ Load ที่มีอยู่

  const cards =
    area.querySelectorAll(
      ".product"
    );

  cards.forEach((card, index) => {

    updateTank(
      card,
      PRODUCTS[index]
    );
  });
}


// ------------------------------------------------------------
// 15. RENDER TRUCK SLOTS
// ------------------------------------------------------------

function renderSlots() {

  const area =
    document.querySelector(
      "#loadSlots"
    );

  if (!area) {
    return;
  }

  area.innerHTML = "";

  area.dataset.slots =
    String(loadConfig.length);


  loadConfig.forEach(
    (item, index) => {

      const shortNames = {
        g95: "95",
        g91: "91",
        e20: "E20",
        diesel: "DSL"
      };


      const products =
        PRODUCTS
          .map(product => {

            return `
              <option
                value="${product.id}"
                ${
                  product.id === item.product
                    ? "selected"
                    : ""
                }
              >
                ${shortNames[product.id]}
              </option>
            `;
          })
          .join("");


      area.insertAdjacentHTML(
        "beforeend",

        `
        <div class="load-slot">

          <p>
            ช่องที่ ${index + 1}
          </p>

          <select
            data-field="product"
            data-index="${index}"
          >
            ${products}
          </select>

          <select
            data-field="litres"
            data-index="${index}"
          >

            <option
              value="0"
              ${
                !item.litres
                  ? "selected"
                  : ""
              }
            >
              —
            </option>

            <option
              value="3000"
              ${
                item.litres === 3000
                  ? "selected"
                  : ""
              }
            >
              3,000 L
            </option>

            <option
              value="4000"
              ${
                item.litres === 4000
                  ? "selected"
                  : ""
              }
            >
              4,000 L
            </option>

          </select>

        </div>
        `;
    }
  );


  // ----------------------------
  // รวม Load
  // ----------------------------

  const total =
    loadConfig.reduce(
      (sum, item) =>
        sum + num(item.litres),
      0
    );


  // ----------------------------
  // ความจุรถ
  // ----------------------------

  const truckSize =
    document.querySelector(
      "#truckSize"
    );

  const capacity =
    truckSize
      ? num(truckSize.value)
      : 20000;


  // ----------------------------
  // แสดงยอดรวม
  // ----------------------------

  const loadTotal =
    document.querySelector(
      "#loadTotal"
    );

  if (loadTotal) {

    loadTotal.textContent =
      `${fmt(total)} ลิตร`;
  }


  // ----------------------------
  // แสดง Capacity
  // ----------------------------

  const truckCapacityLabel =
    document.querySelector(
      "#truckCapacityLabel"
    );

  if (truckCapacityLabel) {

    truckCapacityLabel.textContent =
      `${fmt(capacity)} ลิตร`;
  }


  // ----------------------------
  // ประเภทรถ
  // ----------------------------

  const truckTypeLabel =
    document.querySelector(
      "#truckTypeLabel"
    );

  if (
    truckTypeLabel &&
    TRUCKS[capacity]
  ) {

    truckTypeLabel.textContent =
      TRUCKS[capacity].name;
  }


  // ----------------------------
  // จำนวนช่อง
  // ----------------------------

  const truckSlotLabel =
    document.querySelector(
      "#truckSlotLabel"
    );

  if (
    truckSlotLabel &&
    TRUCKS[capacity]
  ) {

    truckSlotLabel.textContent =
      `${TRUCKS[capacity].slots} ช่อง`;
  }


  // ----------------------------
  // Capacity Remaining
  // ----------------------------

  const capacityRemaining =
    document.querySelector(
      "#capacityRemaining"
    );

  if (capacityRemaining) {

    if (total > capacity) {

      capacityRemaining.textContent =
        `เกินความจุ ${fmt(
          total - capacity
        )} ลิตร`;

      capacityRemaining.style.color =
        "#d97706";

    } else {

      capacityRemaining.textContent =
        `เหลือ ${fmt(
          capacity - total
        )} ลิตร`;

      capacityRemaining.style.color =
        "";
    }
  }
}


// ------------------------------------------------------------
// 16. STOCK DAY AFTER DELIVERY
// ------------------------------------------------------------

function renderAfterDelivery() {

  const area =
    document.querySelector(
      "#afterDelivery"
    );

  if (!area) {
    return;
  }

  area.innerHTML = "";


  PRODUCTS.forEach(product => {

    const sales =
      averageSales(product.id);

    const load =
      productLoad(product.id);


    // น้ำมันหลังได้รับ Load
    const afterLitres =
      product.remaining + load;


    // หัก Dead Stock
    const usableAfter =
      afterLitres -
      deadStock(product);


    const afterStockDay =
      stockDay(
        usableAfter,
        sales
      );


    area.insertAdjacentHTML(
      "beforeend",

      `
      <article class="after-item">

        <p>
          StD
          <small>(ใหม่)</small>
          · ${product.code}
        </p>

        <b>
          ${
            sales
              ? afterStockDay.toFixed(1)
              : "—"
          } วัน
        </b>

        <small>
          Load ${fmt(load)} ลิตร
        </small>

      </article>
      `
    );
  });
}


// ------------------------------------------------------------
// 17. FULL RENDER
// ------------------------------------------------------------

function render() {

  renderProducts();

  renderSlots();

  renderAfterDelivery();
}


// ------------------------------------------------------------
// 18. CSV PARSER
// ------------------------------------------------------------

function parseCsvLine(line) {

  const result = [];

  let current = "";

  let inQuotes = false;


  for (
    let i = 0;
    i < line.length;
    i++
  ) {

    const char =
      line[i];


    if (char === '"') {

      if (
        inQuotes &&
        line[i + 1] === '"'
      ) {

        current += '"';

        i++;

      } else {

        inQuotes =
          !inQuotes;
      }


    } else if (
      char === "," &&
      !inQuotes
    ) {

      result.push(
        current
      );

      current = "";


    } else {

      current += char;
    }
  }


  result.push(
    current
  );


  return result.map(
    value =>
      value.trim()
  );
}


// ------------------------------------------------------------
// 19. PARSE CSV
// ------------------------------------------------------------

function parseCsv(text) {

  const lines =
    text
      .trim()
      .split(/\r?\n/);


  if (!lines.length) {
    return [];
  }


  const keys =
    parseCsvLine(
      lines.shift()
    )
    .map(
      key =>
        key.toLowerCase()
    );


  return lines

    .map(line => {

      const values =
        parseCsvLine(line);


      const row =
        Object.fromEntries(
          keys.map(
            (key, i) =>
              [
                key,
                values[i]
              ]
          )
        );


      if (row.litres) {

        row.litres =
          row.litres
            .replace(/,/g, "");
      }


      return row;
    })


    .filter(
      row =>
        row.date &&
        row.product &&
        row.litres
    );
}


// ------------------------------------------------------------
// 20. LOAD GOOGLE SHEETS
// ------------------------------------------------------------

async function loadSheet() {

  if (!SHEET_CSV_URL) {
    return;
  }


  const status =
    document.querySelector(
      "#dataStatus"
    );


  if (status) {

    status.textContent =
      "กำลังโหลด…";
  }


  try {

    const response =
      await fetch(
        SHEET_CSV_URL
      );


    if (!response.ok) {

      throw new Error(
        "Sheet unavailable"
      );
    }


    const text =
      await response.text();


    salesRows =
      parseCsv(text)
        .map(row => ({
          ...row,
          product:
            row.product.toLowerCase()
        }));


    applyDefaultRanges();


    if (status) {

      status.textContent =
        "เชื่อม Google Sheets แล้ว";
    }


    const statusDot =
      document.querySelector(
        ".data-status i"
      );


    if (statusDot) {

      statusDot.style.background =
        "#25ac58";
    }


    render();


  } catch (error) {

    console.error(
      "Google Sheets error:",
      error
    );


    if (status) {

      status.textContent =
        "ใช้ข้อมูลตัวอย่าง";
    }


    render();
  }
}


// ------------------------------------------------------------
// 21. REMAINING INPUT
// ------------------------------------------------------------

document.addEventListener(
  "input",
  event => {

    if (
      !event.target.matches(
        ".remaining"
      )
    ) {
      return;
    }


    const product =
      PRODUCTS.find(
        p =>
          p.id ===
          event.target.dataset.id
      );


    if (!product) {
      return;
    }


    product.remaining =
      num(
        event.target.value
      );


    const card =
      event.target.closest(
        ".product"
      );


    if (card) {

      const sales =
        averageSales(
          product.id
        );

      const dead =
        deadStock(
          product
        );


      // อัปเดตถัง
      updateTank(
        card,
        product
      );


      // อัปเดต StD ปัจจุบัน
      const current =
        card.querySelector(
          ".stock-current b"
        );


      if (current) {

        current.textContent =
          sales
            ? `${stockDay(
                product.remaining -
                dead,
                sales
              ).toFixed(1)} วัน`
            : "—";
      }
    }


    // อัปเดต StD ใหม่
    renderAfterDelivery();
  }
);


// ------------------------------------------------------------
// 22. DATE RANGE CHANGE
// ------------------------------------------------------------

document.addEventListener(
  "change",
  event => {


    // ----------------------------
    // วันที่เริ่ม
    // ----------------------------

    if (
      event.target.matches(
        ".range-start"
      )
    ) {

      const product =
        PRODUCTS.find(
          product =>
            product.id ===
            event.target.dataset.id
        );


      if (product) {

        product.rangeStart =
          event.target.value;

        renderProducts();

        renderAfterDelivery();
      }

      return;
    }


    // ----------------------------
    // วันที่สิ้นสุด
    // ----------------------------

    if (
      event.target.matches(
        ".range-end"
      )
    ) {

      const product =
        PRODUCTS.find(
          product =>
            product.id ===
            event.target.dataset.id
        );


      if (product) {

        product.rangeEnd =
          event.target.value;

        renderProducts();

        renderAfterDelivery();
      }

      return;
    }


    // ----------------------------
    // เปลี่ยนขนาดรถ
    // ----------------------------

    if (
      event.target.matches(
        "#truckSize"
      )
    ) {

      const capacity =
        num(
          event.target.value
        );


      const truck =
        TRUCKS[capacity];


      if (!truck) {
        return;
      }


      loadConfig =
        Array.from(
          {
            length:
              truck.slots
          },
          (_, index) =>
            loadConfig[index] || {
              product:
                PRODUCTS[
                  index %
                  PRODUCTS.length
                ].id,

              litres: 0
            }
        );


      renderSlots();

      renderAfterDelivery();

      renderProducts();

      return;
    }


    // ----------------------------
    // เปลี่ยน Product / Load
    // ----------------------------

    if (
      event.target.matches(
        "[data-field]"
      )
    ) {

      const index =
        num(
          event.target.dataset.index
        );


      const field =
        event.target.dataset.field;


      if (!loadConfig[index]) {
        return;
      }


      if (
        field ===
        "litres"
      ) {

        loadConfig[index]
          .litres =
          num(
            event.target.value
          );

      } else {

        loadConfig[index]
          .product =
          event.target.value;
      }


      // อัปเดตทั้งหมด
      renderSlots();

      renderAfterDelivery();

      renderProducts();
    }
  }
);


// ------------------------------------------------------------
// 23. REFRESH BUTTON
// ------------------------------------------------------------

const refreshBtn =
  document.querySelector(
    "#refreshBtn"
  );


if (refreshBtn) {

  refreshBtn.onclick =
    loadSheet;
}


// ------------------------------------------------------------
// 24. SET DEFAULT TRUCK = 20,000 L
// ------------------------------------------------------------

const truckSize =
  document.querySelector(
    "#truckSize"
  );


if (truckSize) {

  // ให้ 20,000 L เป็นค่าเริ่มต้น
  truckSize.value =
    "20000";


  // 5 ช่อง
  loadConfig =
    Array.from(
      { length: 5 },
      (_, index) => ({
        product:
          PRODUCTS[
            index %
            PRODUCTS.length
          ].id,

        litres: 0
      })
    );
}


// ------------------------------------------------------------
// 25. INITIAL RENDER
// ------------------------------------------------------------

render();

loadSheet();
