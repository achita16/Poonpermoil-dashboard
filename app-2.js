// ============================================================
// POONPERM OIL LTD.
// Calculate Oil Order
// ============================================================

// ============================================================
// GOOGLE SHEETS
// ============================================================

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1USobfqcmWLx3rlCr0ld-bSvAxjtQtjMn2yg2zFzhqsbv-Vz04v5I0dBT8ipsIA/pub?output=csv";


// ============================================================
// PRODUCTS
// ============================================================

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


// ============================================================
// DEMO SALES
// ============================================================

const demoSales = {
  g95: 1140,
  g91: 820,
  e20: 610,
  diesel: 1870
};

let salesRows = [];


// ============================================================
// SHARED DATE RANGE
// ============================================================

// เปิด/ปิดการใช้ช่วงวันที่เดียวกันทั้ง 4 ถัง
let useSharedRange = false;

// วันที่เริ่มต้น/สิ้นสุดของช่วงรวม
let sharedRangeStart = null;
let sharedRangeEnd = null;


// ============================================================
// TRUCK
// ============================================================

const TRUCKS = {

  // รถ 20,000 ลิตร
  // 5 ช่อง
  // แต่ละช่อง 3,000 หรือ 4,000 ลิตร

  20000: {
    name: "รถเล็ก",
    slots: 5
  },

  // เก็บไว้สำหรับอนาคต
  30000: {
    name: "รถใหญ่",
    slots: 10
  }
};


// ============================================================
// DEFAULT TRUCK = 20,000 L
// ============================================================

let loadConfig = Array.from(
  { length: 5 },
  (_, index) => ({
    product:
      PRODUCTS[
        index % PRODUCTS.length
      ].id,

    litres: 0
  })
);


// ============================================================
// HELPERS
// ============================================================

const fmt = value =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(
    Number(value) || 0
  );


const num = value =>
  Number(value) || 0;


// ============================================================
// DATE
// ============================================================

function latestDataDate() {

  if (!salesRows.length) {
    return new Date();
  }

  return salesRows.reduce(
    (max, row) => {

      const d =
        new Date(row.date);

      return d > max
        ? d
        : max;

    },
    new Date(
      salesRows[0].date
    )
  );
}


function toDateInputValue(date) {

  return date
    .toISOString()
    .slice(0, 10);
}


// ============================================================
// DEFAULT DATE RANGE
// ============================================================

function applyDefaultRanges() {

  if (!salesRows.length) {
    return;
  }

  const maxDate =
    latestDataDate();

  const defaultStart =
    new Date(maxDate);

  defaultStart.setDate(
    defaultStart.getDate() - 6
  );

  PRODUCTS.forEach(
    product => {

      if (!product.rangeStart) {

        product.rangeStart =
          toDateInputValue(
            defaultStart
          );
      }

      if (!product.rangeEnd) {

        product.rangeEnd =
          toDateInputValue(
            maxDate
          );
      }
    }
  );


  // ----------------------------------------------------------
  // DEFAULT SHARED RANGE
  // ----------------------------------------------------------

  if (!sharedRangeStart) {

    sharedRangeStart =
      PRODUCTS[0].rangeStart;
  }

  if (!sharedRangeEnd) {

    sharedRangeEnd =
      PRODUCTS[0].rangeEnd;
  }
}


// ============================================================
// AVERAGE SALES
// ============================================================

function averageSales(id) {

  // ถ้าไม่มีข้อมูล Google Sheets
  // ใช้ Demo Sales

  if (!salesRows.length) {

    return (
      demoSales[id] || 0
    );
  }


  const product =
    PRODUCTS.find(
      item =>
        item.id === id
    );


  if (!product) {
    return 0;
  }


  // ----------------------------------------------------------
  // เลือกช่วงวันที่
  // ----------------------------------------------------------

  const startValue =
    useSharedRange
      ? sharedRangeStart
      : product.rangeStart;

  const endValue =
    useSharedRange
      ? sharedRangeEnd
      : product.rangeEnd;


  const start =
    startValue
      ? new Date(startValue)
      : null;

  const end =
    endValue
      ? new Date(endValue)
      : null;


  // ----------------------------------------------------------
  // FILTER SALES
  // ----------------------------------------------------------

  const rows =
    salesRows.filter(
      row => {

        if (
          row.product !== id
        ) {
          return false;
        }


        const d =
          new Date(row.date);


        if (
          start &&
          d < start
        ) {
          return false;
        }


        if (
          end &&
          d > end
        ) {
          return false;
        }


        return true;
      }
    );


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


// ============================================================
// PRODUCT LOAD
// ============================================================

function productLoad(id) {

  return loadConfig
    .filter(
      item =>
        item.product === id
    )
    .reduce(
      (sum, item) =>
        sum + num(item.litres),
      0
    );
}


// ============================================================
// DEAD STOCK
// ============================================================

function deadStock(product) {

  return (
    product.capacity * 0.12
  );
}


// ============================================================
// STOCK DAY
// ============================================================

function stockDay(
  available,
  sales
) {

  if (!sales) {
    return 0;
  }

  return (
    Math.max(
      available,
      0
    ) / sales
  );
}


// ============================================================
// CREATE NEW TANK FILL
// ============================================================

function ensureNewTankFill(card) {

  const tank =
    card.querySelector(
      ".tank"
    );


  if (!tank) {
    return null;
  }


  let newFill =
    tank.querySelector(
      ".tank-new-fill"
    );


  if (!newFill) {

    newFill =
      document.createElement(
        "div"
      );

    newFill.className =
      "tank-new-fill";

    tank.appendChild(
      newFill
    );
  }


  return newFill;
}


// ============================================================
// UPDATE TANK
// ============================================================

function updateTank(
  card,
  product
) {

  const fill =
    card.querySelector(
      ".tank-fill"
    );


  if (!fill) {
    return;
  }


  // น้ำมันเดิม
  const current =
    Math.max(
      num(product.remaining),
      0
    );


  // Load ที่สั่งเพิ่ม
  const load =
    productLoad(
      product.id
    );


  // น้ำมันรวมหลังสั่ง
  const rawTotal =
    current + load;


  const total =
    Math.min(
      rawTotal,
      product.capacity
    );


  // % น้ำมันเดิม
  const currentPercent =
    Math.min(
      (
        current /
        product.capacity
      ) * 100,
      100
    );


  // % น้ำมันรวม
  const totalPercent =
    Math.min(
      (
        total /
        product.capacity
      ) * 100,
      100
    );


  // % ส่วนที่เพิ่ม
  const addedPercent =
    Math.max(
      totalPercent -
      currentPercent,
      0
    );


  // ----------------------------------------------------------
  // น้ำมันเดิม
  // ----------------------------------------------------------

  fill.style.height =
    `${currentPercent}%`;

  fill.style.bottom =
    "0";

  fill.style.background =
    product.color;


  // ----------------------------------------------------------
  // น้ำมันใหม่
  // ----------------------------------------------------------

  const newFill =
    ensureNewTankFill(
      card
    );


  if (newFill) {

    newFill.style.position =
      "absolute";

    newFill.style.left =
      "0";

    newFill.style.bottom =
      `${currentPercent}%`;

    newFill.style.width =
      "100%";

    newFill.style.height =
      `${addedPercent}%`;

    newFill.style.background =
      product.newColor;

    newFill.style.opacity =
      "0.95";

    newFill.style.transition =
      "height .25s ease, bottom .25s ease";

    newFill.hidden =
      load <= 0;
  }


  // ----------------------------------------------------------
  // CAPACITY
  // ----------------------------------------------------------

  const tankPercent =
    card.querySelector(
      ".tank-percent"
    );


  if (tankPercent) {

    tankPercent.textContent =
      `ความจุ ${fmt(
        product.capacity
      )} ลิตร`;
  }


  // ----------------------------------------------------------
  // AFTER ORDER
  // ----------------------------------------------------------

  let projection =
    card.querySelector(
      ".tank-projection"
    );


  if (!projection) {

    projection =
      document.createElement(
        "span"
      );

    projection.className =
      "tank-projection";

    const tankWrap =
      card.querySelector(
        ".tank-wrap"
      );

    if (tankWrap) {

      tankWrap.appendChild(
        projection
      );
    }
  }


  if (load > 0) {

    projection.textContent =
      `หลังสั่ง ${fmt(
        total
      )} ลิตร`;

    projection.hidden =
      false;

    projection.style.display =
      "block";

    projection.style.marginTop =
      "4px";

    projection.style.fontSize =
      "10px";

    projection.style.fontWeight =
      "600";

    projection.style.color =
      "#8a6a25";


    // --------------------------------------------------------
    // OVER CAPACITY
    // --------------------------------------------------------

    if (
      rawTotal >
      product.capacity
    ) {

      projection.textContent =
        `เกินความจุ · หลังสั่งสูงสุด ${fmt(
          product.capacity
        )} ลิตร`;

      projection.style.color =
        "#c62828";
    }

  } else {

    projection.hidden =
      true;

    projection.style.display =
      "none";
  }
}


// ============================================================
// SHARED DATE RANGE UI
// ============================================================

function renderSharedRange() {

  const area =
    document.querySelector(
      "#productColumns"
    );


  if (!area) {
    return;
  }


  let box =
    document.querySelector(
      "#sharedRange"
    );


  if (!box) {

    box =
      document.createElement(
        "div"
      );

    box.id =
      "sharedRange";


    area.parentNode.insertBefore(
      box,
      area
    );
  }


  // ----------------------------------------------------------
  // STYLE
  // ----------------------------------------------------------

  if (
    !document.querySelector(
      "#sharedRangeStyle"
    )
  ) {

    const style =
      document.createElement(
        "style"
      );


    style.id =
      "sharedRangeStyle";


    style.textContent = `

      #sharedRange {

        display: flex;

        align-items: center;

        gap: 16px;

        flex-wrap: wrap;

        margin:
          0 0 16px;

        padding:
          13px 16px;

        border:
          1px solid #e5e5ea;

        border-radius:
          15px;

        background:
          rgba(255,255,255,.82);

        box-shadow:
          0 8px 24px
          rgba(39,51,77,.06);
      }


      #sharedRange
      .shared-toggle {

        display: flex;

        align-items: center;

        gap: 8px;

        font-size: 12px;

        font-weight: 600;

        color: #1d1d1f;

        cursor: pointer;
      }


      #sharedRange
      .shared-toggle input {

        width: 16px;

        height: 16px;

        accent-color:
          #007aff;

        cursor: pointer;
      }


      #sharedRange
      .shared-inputs {

        display: flex;

        align-items: center;

        gap: 7px;
      }


      #sharedRange
      .shared-inputs[hidden] {

        display:
          none !important;
      }


      #sharedRange
      input[type="date"] {

        padding:
          8px 9px;

        border:
          1px solid #e5e5ea;

        border-radius:
          10px;

        background:
          #fff;

        color:
          #1d1d1f;

        font:
          inherit;

        font-size:
          12px;
      }


      #sharedRange
      .shared-sep {

        font-size:
          11px;

        color:
          #6e6e73;
      }


      @media (max-width: 700px) {

        #sharedRange {

          align-items:
            flex-start;

          flex-direction:
            column;

          gap:
            10px;
        }

      }

    `;


    document.head.appendChild(
      style
    );
  }


  // ----------------------------------------------------------
  // HTML
  // ----------------------------------------------------------

  box.innerHTML = `

    <label class="shared-toggle">

      <input
        type="checkbox"
        id="sharedRangeCheck"
        ${useSharedRange ? "checked" : ""}
      >

      ใช้ช่วงวันที่เดียวกันทั้ง 4 ถัง

    </label>


    <div
      class="shared-inputs"
      ${useSharedRange ? "" : "hidden"}
    >

      <input
        type="date"
        id="sharedStart"
        value="${sharedRangeStart || ""}"
      >

      <span class="shared-sep">
        ถึง
      </span>

      <input
        type="date"
        id="sharedEnd"
        value="${sharedRangeEnd || ""}"
      >

    </div>

  `;
}


// ============================================================
// RENDER PRODUCTS
// ============================================================

function renderProducts() {

  const area =
    document.querySelector(
      "#productColumns"
    );


  const template =
    document.querySelector(
      "#productTemplate"
    );


  if (
    !area ||
    !template
  ) {
    return;
  }


  area.innerHTML =
    "";


  PRODUCTS.forEach(
    product => {

      const fragment =
        template.content.cloneNode(
          true
        );


      const card =
        fragment.querySelector(
          ".product"
        );


      if (!card) {
        return;
      }


      card.dataset.id =
        product.id;


      // --------------------------------------------------------
      // PRODUCT CODE
      // --------------------------------------------------------

      const code =
        card.querySelector(
          ".product-code"
        );


      if (code) {

        code.textContent =
          product.code;
      }


      // --------------------------------------------------------
      // DATE INPUTS
      // --------------------------------------------------------

      const rangeStart =
        card.querySelector(
          ".range-start"
        );


      const rangeEnd =
        card.querySelector(
          ".range-end"
        );


      if (rangeStart) {

        rangeStart.value =
          (
            useSharedRange
              ? sharedRangeStart
              : product.rangeStart
          ) || "";


        rangeStart.dataset.id =
          product.id;


        rangeStart.disabled =
          useSharedRange;
      }


      if (rangeEnd) {

        rangeEnd.value =
          (
            useSharedRange
              ? sharedRangeEnd
              : product.rangeEnd
          ) || "";


        rangeEnd.dataset.id =
          product.id;


        rangeEnd.disabled =
          useSharedRange;
      }


      // --------------------------------------------------------
      // SALES
      // --------------------------------------------------------

      const sales =
        averageSales(
          product.id
        );


      const selectedSales =
        card.querySelector(
          ".selected-sales b"
        );


      if (selectedSales) {

        selectedSales.textContent =
          sales
            ? fmt(sales)
            : "—";
      }


      // --------------------------------------------------------
      // DEAD STOCK
      // --------------------------------------------------------

      const dead =
        deadStock(
          product
        );


      const deadElement =
        card.querySelector(
          ".dead-stock b"
        );


      if (deadElement) {

        deadElement.textContent =
          fmt(dead);
      }


      // --------------------------------------------------------
      // REMAINING
      // --------------------------------------------------------

      const remaining =
        card.querySelector(
          ".remaining"
        );


      if (remaining) {

        remaining.value =
          product.remaining;

        remaining.dataset.id =
          product.id;
      }


      // --------------------------------------------------------
      // CURRENT STOCK DAY
      // --------------------------------------------------------

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


      // --------------------------------------------------------
      // TANK
      // --------------------------------------------------------

      updateTank(
        card,
        product
      );


      area.appendChild(
        fragment
      );


      // หลัง append แล้ว update อีกครั้ง
      // เพื่อให้ DOM พร้อมสำหรับ tank-new-fill

      const insertedCard =
        area.lastElementChild;


      if (
        insertedCard &&
        insertedCard.classList.contains(
          "product"
        )
      ) {

        updateTank(
          insertedCard,
          product
        );
      }

    }
  );
}


// ============================================================
// RENDER TRUCK SLOTS
// ============================================================

function renderSlots() {

  const area =
    document.querySelector(
      "#loadSlots"
    );


  if (!area) {
    return;
  }


  area.innerHTML =
    "";


  const totalLoad =
    loadConfig.reduce(
      (sum, slot) =>
        sum + num(slot.litres),
      0
    );


  const truckSize =
    document.querySelector(
      "#truckSize"
    );


  if (truckSize) {

    truckSize.value =
      "20000";
  }


  loadConfig.forEach(
    (slot, index) => {

      const options =
        PRODUCTS.map(
          product => `

            <option
              value="${product.id}"
              ${
                slot.product ===
                product.id
                  ? "selected"
                  : ""
              }
            >
              ${product.code}
            </option>

          `
        ).join("");


      const litresOptions = `

        <option
          value="0"
          ${
            num(slot.litres) === 0
              ? "selected"
              : ""
          }
        >
          0 ลิตร
        </option>


        <option
          value="3000"
          ${
            num(slot.litres) === 3000
              ? "selected"
              : ""
          }
        >
          3,000 ลิตร
        </option>


        <option
          value="4000"
          ${
            num(slot.litres) === 4000
              ? "selected"
              : ""
          }
        >
          4,000 ลิตร
        </option>

      `;


      area.insertAdjacentHTML(
        "beforeend",

        `

        <div class="load-slot">

          <span class="slot-number">
            ช่อง ${index + 1}
          </span>


          <select
            data-field="product"
            data-index="${index}"
          >

            ${options}

          </select>


          <select
            data-field="litres"
            data-index="${index}"
          >

            ${litresOptions}

          </select>

        </div>

        `
      );
    }
  );


  // ----------------------------------------------------------
  // TOTAL LOAD
  // ----------------------------------------------------------

  const total =
    document.querySelector(
      "#totalLoad"
    );


  if (total) {

    total.textContent =
      `${fmt(totalLoad)} ลิตร`;
  }
}


// ============================================================
// RENDER AFTER DELIVERY
// ============================================================

function renderAfterDelivery() {

  const area =
    document.querySelector(
      "#afterDelivery"
    );


  if (!area) {
    return;
  }


  area.innerHTML =
    "";


  PRODUCTS.forEach(
    product => {

      const sales =
        averageSales(
          product.id
        );


      const load =
        productLoad(
          product.id
        );


      const afterLitres =
        product.remaining +
        load;


      const usableAfter =
        afterLitres -
        deadStock(
          product
        );


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
            Load ${fmt(
              load
            )} ลิตร
          </small>

        </article>
        `
      );
    }
  );
}


// ============================================================
// RENDER ALL
// ============================================================

function render() {

  renderSharedRange();

  renderProducts();

  renderSlots();

  renderAfterDelivery();
}


// ============================================================
// CSV PARSER - LINE
// ============================================================

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


    if (
      char === '"'
    ) {

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

      current +=
        char;
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


// ============================================================
// PARSE CSV
// ============================================================

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
        key
          .toLowerCase()
          .trim()
    );


  return lines

    .map(line => {

      const values =
        parseCsvLine(
          line
        );


      const row =
        Object.fromEntries(
          keys.map(
            (key, i) => [
              key,
              values[i]
            ]
          )
        );


      if (
        row.litres
      ) {

        row.litres =
          row.litres
            .replace(
              /,/g,
              ""
            );
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


// ============================================================
// LOAD GOOGLE SHEETS
// ============================================================

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
        .map(
          row => ({

            ...row,

            product:
              row.product
                .toLowerCase()
                .trim()

          })
        );


    applyDefaultRanges();


    if (status) {

      status.textContent =
        "เชื่อม Google Sheets แล้ว";
    }


    const dot =
      document.querySelector(
        ".data-status i"
      );


    if (dot) {

      dot.style.background =
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
  }
}


// ============================================================
// REMAINING INPUT
// ============================================================

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


      updateTank(
        card,
        product
      );


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


    renderAfterDelivery();
  }
);


// ============================================================
// CHANGE EVENTS
// ============================================================

document.addEventListener(
  "change",
  event => {


    // ========================================================
    // SHARED RANGE CHECKBOX
    // ========================================================

    if (
      event.target.matches(
        "#sharedRangeCheck"
      )
    ) {

      useSharedRange =
        event.target.checked;


      if (useSharedRange) {

        sharedRangeStart =
          sharedRangeStart ||
          PRODUCTS[0].rangeStart ||
          "";


        sharedRangeEnd =
          sharedRangeEnd ||
          PRODUCTS[0].rangeEnd ||
          "";
      }


      render();

      return;
    }


    // ========================================================
    // SHARED START DATE
    // ========================================================

    if (
      event.target.matches(
        "#sharedStart"
      )
    ) {

      sharedRangeStart =
        event.target.value;


      renderProducts();

      renderAfterDelivery();

      renderSharedRange();

      return;
    }


    // ========================================================
    // SHARED END DATE
    // ========================================================

    if (
      event.target.matches(
        "#sharedEnd"
      )
    ) {

      sharedRangeEnd =
        event.target.value;


      renderProducts();

      renderAfterDelivery();

      renderSharedRange();

      return;
    }


    // ========================================================
    // START DATE - INDIVIDUAL
    // ========================================================

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


    // ========================================================
    // END DATE - INDIVIDUAL
    // ========================================================

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


    // ========================================================
    // TRUCK SIZE
    // ========================================================

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
            loadConfig[index] ||
            {
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


    // ========================================================
    // LOAD PRODUCT / LITRES
    // ========================================================

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


      if (
        !loadConfig[index]
      ) {
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


      renderSlots();

      renderProducts();

      renderAfterDelivery();
    }
  }
);


// ============================================================
// REFRESH
// ============================================================

const refreshBtn =
  document.querySelector(
    "#refreshBtn"
  );


if (refreshBtn) {

  refreshBtn.onclick =
    loadSheet;
}


// ============================================================
// FORCE DEFAULT TRUCK = 20,000 L
// ============================================================

const truckSize =
  document.querySelector(
    "#truckSize"
  );


if (truckSize) {

  truckSize.value =
    "20000";


  loadConfig =
    Array.from(
      {
        length: 5
      },
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


// ============================================================
// INITIAL RENDER
// ============================================================

render();

loadSheet();
