// ============================================================
// POONPERM OIL LTD. - Calculate Oil Order
// ============================================================

const SHEET_CSV_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1USobfqcmWLx3rlCr0ld-bSvAxjtQtjMn2yg2zFzhqsbv-Vz04v5I0dBT8ipsIA/pub?output=csv";

// ============================================================
// PRODUCTS
// ============================================================

const PRODUCTS = [
  {
    id:"g95",
    code:"T01 GASOHOL 95",
    color:"#f5b874",
    newColor:"#f6d58f",
    remaining:8200,
    capacity:20000,
    rangeStart:null,
    rangeEnd:null
  },
  {
    id:"g91",
    code:"T02 GASOHOL 91",
    color:"#86d4a6",
    newColor:"#f6d58f",
    remaining:6400,
    capacity:10000,
    rangeStart:null,
    rangeEnd:null
  },
  {
    id:"e20",
    code:"T03 E20",
    color:"#b5dc8e",
    newColor:"#f6d58f",
    remaining:5100,
    capacity:10000,
    rangeStart:null,
    rangeEnd:null
  },
  {
    id:"diesel",
    code:"T04 DIESEL",
    color:"#83c9eb",
    newColor:"#f6d58f",
    remaining:12400,
    capacity:30000,
    rangeStart:null,
    rangeEnd:null
  }
];

// ============================================================
// DEMO SALES
// ============================================================

const demoSales = {
  g95:1140,
  g91:820,
  e20:610,
  diesel:1870
};

let salesRows = [];

// ============================================================
// SHARED DATE RANGE
// ============================================================

let useSharedRange = false;
let sharedRangeStart = null;
let sharedRangeEnd = null;

// ============================================================
// TRUCK
// ============================================================

const TRUCKS = {
  20000:{
    name:"รถเล็ก",
    slots:5
  },
  30000:{
    name:"รถใหญ่",
    slots:10
  }
};

let loadConfig = Array.from(
  {length:5},
  (_,index)=>({
    product:PRODUCTS[index % PRODUCTS.length].id,
    litres:0
  })
);

// ============================================================
// HELPERS
// ============================================================

const fmt = value =>
  new Intl.NumberFormat("en-US",{
    maximumFractionDigits:0
  }).format(Number(value)||0);

const num = value => Number(value)||0;

// ============================================================
// DATE
// ============================================================

function latestDataDate(){
  if(!salesRows.length) return new Date();

  return salesRows.reduce(
    (max,row)=>{
      const d=new Date(row.date);
      return d>max?d:max;
    },
    new Date(salesRows[0].date)
  );
}

function toDateInputValue(date){
  return date.toISOString().slice(0,10);
}

// ============================================================
// DEFAULT DATE RANGE
// ============================================================

function applyDefaultRanges(){
  if(!salesRows.length) return;

  const maxDate=latestDataDate();
  const start=new Date(maxDate);

  start.setDate(start.getDate()-6);

  PRODUCTS.forEach(product=>{
    if(!product.rangeStart)
      product.rangeStart=toDateInputValue(start);

    if(!product.rangeEnd)
      product.rangeEnd=toDateInputValue(maxDate);
  });

  // ค่าเริ่มต้นของ Shared Range ใช้จาก T01
  if(!sharedRangeStart)
    sharedRangeStart=PRODUCTS[0].rangeStart;

  if(!sharedRangeEnd)
    sharedRangeEnd=PRODUCTS[0].rangeEnd;
}

// ============================================================
// AVERAGE SALES
// ============================================================

function averageSales(id){

  if(!salesRows.length)
    return demoSales[id]||0;

  const product=PRODUCTS.find(p=>p.id===id);

  if(!product) return 0;

  const startValue=
    useSharedRange
      ? sharedRangeStart
      : product.rangeStart;

  const endValue=
    useSharedRange
      ? sharedRangeEnd
      : product.rangeEnd;

  const start=startValue
    ? new Date(startValue)
    : null;

  const end=endValue
    ? new Date(endValue)
    : null;

  const rows=salesRows.filter(row=>{
    if(row.product!==id) return false;

    const d=new Date(row.date);

    if(start && d<start) return false;
    if(end && d>end) return false;

    return true;
  });

  if(!rows.length) return 0;

  return rows.reduce(
    (sum,row)=>sum+num(row.litres),
    0
  )/rows.length;
}

// ============================================================
// LOAD
// ============================================================

function productLoad(id){
  return loadConfig
    .filter(item=>item.product===id)
    .reduce(
      (sum,item)=>sum+num(item.litres),
      0
    );
}

// ============================================================
// DEAD STOCK
// ============================================================

function deadStock(product){
  return product.capacity*0.12;
}

// ============================================================
// STOCK DAY
// ============================================================

function stockDay(available,sales){
  if(!sales) return 0;
  return Math.max(available,0)/sales;
}

// ============================================================
// SHARED DATE UI
// ============================================================

function renderSharedRange(){

  const area=document.querySelector("#productColumns");
  if(!area) return;

  let box=document.querySelector("#sharedRange");

  if(!box){

    box=document.createElement("div");
    box.id="sharedRange";

    box.innerHTML=`
      <div class="shared-range-toggle">
        <label>
          <input type="checkbox" id="sharedRangeCheck">
          ใช้ช่วงวันที่เดียวกันทุกถัง
        </label>
      </div>

      <div class="shared-range-inputs" hidden>
        <input type="date" id="sharedStart">
        <span>ถึง</span>
        <input type="date" id="sharedEnd">
      </div>
    `;

    area.parentNode.insertBefore(box,area);
  }

  const check=
    document.querySelector("#sharedRangeCheck");

  const inputs=
    box.querySelector(".shared-range-inputs");

  if(check)
    check.checked=useSharedRange;

  if(inputs)
    inputs.hidden=!useSharedRange;

  const start=
    document.querySelector("#sharedStart");

  const end=
    document.querySelector("#sharedEnd");

  if(start)
    start.value=sharedRangeStart||"";

  if(end)
    end.value=sharedRangeEnd||"";
}

// ============================================================
// TANK
// ============================================================

function ensureNewTankFill(card){

  const tank=card.querySelector(".tank");

  if(!tank) return null;

  let newFill=
    tank.querySelector(".tank-new-fill");

  if(!newFill){

    newFill=document.createElement("div");
    newFill.className="tank-new-fill";

    tank.appendChild(newFill);
  }

  return newFill;
}

function updateTank(card,product){

  const fill=
    card.querySelector(".tank-fill");

  if(!fill) return;

  const current=Math.max(
    num(product.remaining),
    0
  );

  const load=productLoad(product.id);

  const total=Math.min(
    current+load,
    product.capacity
  );

  const currentPercent=Math.min(
    current/product.capacity*100,
    100
  );

  const totalPercent=Math.min(
    total/product.capacity*100,
    100
  );

  const addedPercent=Math.max(
    totalPercent-currentPercent,
    0
  );

  // น้ำมันเดิม
  fill.style.height=`${currentPercent}%`;
  fill.style.bottom="0";
  fill.style.background=product.color;

  // น้ำมันที่ Load เพิ่ม
  const newFill=ensureNewTankFill(card);

  if(newFill){

    newFill.style.position="absolute";
    newFill.style.left="0";
    newFill.style.bottom=`${currentPercent}%`;
    newFill.style.width="100%";
    newFill.style.height=`${addedPercent}%`;
    newFill.style.background=product.newColor;
    newFill.style.opacity=".95";
    newFill.style.transition=
      "height .25s ease,bottom .25s ease";

    newFill.hidden=load<=0;
  }

  // ความจุ
  const tankPercent=
    card.querySelector(".tank-percent");

  if(tankPercent)
    tankPercent.textContent=
      `ความจุ ${fmt(product.capacity)} ลิตร`;

  // หลังสั่ง
  let projection=
    card.querySelector(".tank-projection");

  if(!projection){

    projection=document.createElement("span");
    projection.className="tank-projection";

    const wrap=
      card.querySelector(".tank-wrap");

    if(wrap)
      wrap.appendChild(projection);
  }

  if(load>0){

    projection.hidden=false;
    projection.style.display="block";

    if(current+load>product.capacity){

      projection.textContent=
        `⚠️ เกินความจุ · ${fmt(total)} ลิตร`;

      projection.style.color="#c67b00";

    }else{

      projection.textContent=
        `หลังสั่ง ${fmt(total)} ลิตร`;

      projection.style.color="#8a6a25";
    }

  }else{

    projection.hidden=true;
    projection.style.display="none";
  }
}

// ============================================================
// PRODUCTS
// ============================================================

function renderProducts(){

  const area=
    document.querySelector("#productColumns");

  const template=
    document.querySelector("#productTemplate");

  if(!area||!template) return;

  area.innerHTML="";

  PRODUCTS.forEach(product=>{

    const node=
      template.content.cloneNode(true);

    const sales=
      averageSales(product.id);

    const dead=
      deadStock(product);

    const fill=
      Math.min(
        product.remaining/
        product.capacity*
        100,
        100
      );

    node.querySelector(
      ".product-code"
    ).textContent=product.code;

    const tankFill=
      node.querySelector(".tank-fill");

    tankFill.style.height=`${fill}%`;
    tankFill.style.background=product.color;

    node.querySelector(
      ".tank-percent"
    ).textContent=
      `ความจุ ${fmt(product.capacity)} ลิตร`;

    const rangeStart=
      node.querySelector(".range-start");

    const rangeEnd=
      node.querySelector(".range-end");

    rangeStart.value=
      product.rangeStart||"";

    rangeEnd.value=
      product.rangeEnd||"";

    rangeStart.dataset.id=
      product.id;

    rangeEnd.dataset.id=
      product.id;

    node.querySelector(
      ".selected-sales b"
    ).textContent=fmt(sales);

    node.querySelector(
      ".dead-stock b"
    ).textContent=fmt(dead);

    const remaining=
      node.querySelector(".remaining");

    remaining.value=
      product.remaining;

    remaining.dataset.id=
      product.id;

    node.querySelector(
      ".stock-current b"
    ).textContent=
      sales
        ? `${stockDay(
            product.remaining-dead,
            sales
          ).toFixed(1)} วัน`
        : "—";

    area.append(node);
  });

  // อัปเดตถังหลัง Render
  document
    .querySelectorAll(".product")
    .forEach(card=>{

      const code=
        card.querySelector(
          ".product-code"
        )?.textContent;

      const product=
        PRODUCTS.find(
          p=>p.code===code
        );

      if(product)
        updateTank(card,product);
    });
}

// ============================================================
// TRUCK / LOAD
// ============================================================

function renderSlots(){

  const area=
    document.querySelector("#loadSlots");

  if(!area) return;

  area.innerHTML="";
  area.dataset.slots=
    String(loadConfig.length);

  const shortNames={
    g95:"95",
    g91:"91",
    e20:"E20",
    diesel:"DSL"
  };

  loadConfig.forEach((item,index)=>{

    const products=
      PRODUCTS.map(product=>`
        <option
          value="${product.id}"
          ${product.id===item.product?"selected":""}>
          ${shortNames[product.id]}
        </option>
      `).join("");

    area.insertAdjacentHTML(
      "beforeend",
      `
      <div class="load-slot">

        <p>ช่องที่ ${index+1}</p>

        <select
          data-field="product"
          data-index="${index}">
          ${products}
        </select>

        <select
          data-field="litres"
          data-index="${index}">

          <option value="0"
            ${!item.litres?"selected":""}>
            —
          </option>

          <option value="3000"
            ${item.litres===3000?"selected":""}>
            3,000 L
          </option>

          <option value="4000"
            ${item.litres===4000?"selected":""}>
            4,000 L
          </option>

        </select>

      </div>
      `
    );
  });

  const total=
    loadConfig.reduce(
      (sum,item)=>sum+num(item.litres),
      0
    );

  const truckSize=
    document.querySelector("#truckSize");

  const capacity=
    num(truckSize?.value)||20000;

  const truck=
    TRUCKS[capacity];

  const loadTotal=
    document.querySelector("#loadTotal");

  const capacityRemaining=
    document.querySelector(
      "#capacityRemaining"
    );

  const truckCapacityLabel=
    document.querySelector(
      "#truckCapacityLabel"
    );

  const truckTypeLabel=
    document.querySelector(
      "#truckTypeLabel"
    );

  const truckSlotLabel=
    document.querySelector(
      "#truckSlotLabel"
    );

  if(loadTotal)
    loadTotal.textContent=
      `${fmt(total)} ลิตร`;

  if(truckCapacityLabel)
    truckCapacityLabel.textContent=
      `${fmt(capacity)} ลิตร`;

  if(truckTypeLabel)
    truckTypeLabel.textContent=
      truck?.name||"รถ";

  if(truckSlotLabel)
    truckSlotLabel.textContent=
      `${truck?.slots||0} ช่อง`;

  if(capacityRemaining){

    if(total>capacity){

      capacityRemaining.textContent=
        `เกินความจุ ${fmt(total-capacity)} ลิตร`;

      capacityRemaining.style.color=
        "#d97706";

    }else{

      capacityRemaining.textContent=
        `เหลือ ${fmt(capacity-total)} ลิตร`;

      capacityRemaining.style.color="";
    }
  }
}

// ============================================================
// AFTER DELIVERY
// ============================================================

function renderAfterDelivery(){

  const area=
    document.querySelector(
      "#afterDelivery"
    );

  if(!area) return;

  area.innerHTML="";

  PRODUCTS.forEach(product=>{

    const sales=
      averageSales(product.id);

    const load=
      productLoad(product.id);

    const after=
      product.remaining+
      load;

    const usable=
      after-
      deadStock(product);

    const std=
      stockDay(
        usable,
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
          ${sales?std.toFixed(1):"—"} วัน
        </b>

        <small>
          Load ${fmt(load)} ลิตร
        </small>

      </article>
      `
    );
  });
}

// ============================================================
// RENDER
// ============================================================

function render(){

  renderSharedRange();
  renderProducts();
  renderSlots();
  renderAfterDelivery();
}

// ============================================================
// CSV
// ============================================================

function parseCsvLine(line){

  const result=[];
  let current="";
  let inQuotes=false;

  for(let i=0;i<line.length;i++){

    const char=line[i];

    if(char==='"'){

      if(
        inQuotes &&
        line[i+1]==='"'
      ){

        current+='"';
        i++;

      }else{

        inQuotes=!inQuotes;
      }

    }else if(
      char==="," &&
      !inQuotes
    ){

      result.push(current);
      current="";

    }else{

      current+=char;
    }
  }

  result.push(current);

  return result.map(
    value=>value.trim()
  );
}

function parseCsv(text){

  const lines=
    text.trim().split(/\r?\n/);

  if(!lines.length) return [];

  const keys=
    parseCsvLine(lines.shift())
      .map(key=>key.toLowerCase());

  return lines
    .map(line=>{

      const values=
        parseCsvLine(line);

      const row=
        Object.fromEntries(
          keys.map(
            (key,i)=>[
              key,
              values[i]
            ]
          )
        );

      if(row.litres)
        row.litres=
          row.litres.replace(/,/g,"");

      return row;
    })
    .filter(
      row=>
        row.date&&
        row.product&&
        row.litres
    );
}

// ============================================================
// LOAD GOOGLE SHEETS
// ============================================================

async function loadSheet(){

  if(!SHEET_CSV_URL) return;

  const status=
    document.querySelector(
      "#dataStatus"
    );

  if(status)
    status.textContent=
      "กำลังโหลด…";

  try{

    const response=
      await fetch(
        SHEET_CSV_URL
      );

    if(!response.ok)
      throw new Error(
        "Sheet unavailable"
      );

    salesRows=
      parseCsv(
        await response.text()
      ).map(row=>({
        ...row,
        product:
          row.product.toLowerCase()
      }));

    applyDefaultRanges();

    if(status)
      status.textContent=
        "เชื่อม Google Sheets แล้ว";

    const dot=
      document.querySelector(
        ".data-status i"
      );

    if(dot)
      dot.style.background=
        "#25ac58";

    render();

  }catch(error){

    console.error(
      "Google Sheets error:",
      error
    );

    if(status)
      status.textContent=
        "ใช้ข้อมูลตัวอย่าง";
  }
}

// ============================================================
// REMAINING INPUT
// ============================================================

document.addEventListener(
  "input",
  event=>{

    if(
      !event.target.matches(
        ".remaining"
      )
    ) return;

    const product=
      PRODUCTS.find(
        p=>
          p.id===
          event.target.dataset.id
      );

    if(!product) return;

    product.remaining=
      num(event.target.value);

    const card=
      event.target.closest(
        ".product"
      );

    if(card){

      updateTank(
        card,
        product
      );

      const sales=
        averageSales(
          product.id
        );

      const dead=
        deadStock(product);

      const current=
        card.querySelector(
          ".stock-current b"
        );

      if(current){

        current.textContent=
          sales
            ? `${stockDay(
                product.remaining-dead,
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
  event=>{

    // --------------------------------------------------------
    // SHARED RANGE CHECKBOX
    // --------------------------------------------------------

    if(
      event.target.matches(
        "#sharedRangeCheck"
      )
    ){

      useSharedRange=
        event.target.checked;

      if(useSharedRange){

        sharedRangeStart=
          PRODUCTS[0].rangeStart;

        sharedRangeEnd=
          PRODUCTS[0].rangeEnd;
      }

      render();

      return;
    }

    // --------------------------------------------------------
    // SHARED START
    // --------------------------------------------------------

    if(
      event.target.matches(
        "#sharedStart"
      )
    ){

      sharedRangeStart=
        event.target.value;

      renderProducts();
      renderAfterDelivery();

      renderSharedRange();

      return;
    }

    // --------------------------------------------------------
    // SHARED END
    // --------------------------------------------------------

    if(
      event.target.matches(
        "#sharedEnd"
      )
    ){

      sharedRangeEnd=
        event.target.value;

      renderProducts();
      renderAfterDelivery();

      renderSharedRange();

      return;
    }

    // --------------------------------------------------------
    // INDIVIDUAL START
    // --------------------------------------------------------

    if(
      event.target.matches(
        ".range-start"
      )
    ){

      const product=
        PRODUCTS.find(
          p=>
            p.id===
            event.target.dataset.id
        );

      if(product){

        product.rangeStart=
          event.target.value;

        renderProducts();
        renderAfterDelivery();
      }

      return;
    }

    // --------------------------------------------------------
    // INDIVIDUAL END
    // --------------------------------------------------------

    if(
      event.target.matches(
        ".range-end"
      )
    ){

      const product=
        PRODUCTS.find(
          p=>
            p.id===
            event.target.dataset.id
        );

      if(product){

        product.rangeEnd=
          event.target.value;

        renderProducts();
        renderAfterDelivery();
      }

      return;
    }

    // --------------------------------------------------------
    // TRUCK SIZE
    // --------------------------------------------------------

    if(
      event.target.matches(
        "#truckSize"
      )
    ){

      const capacity=
        num(event.target.value);

      const truck=
        TRUCKS[capacity];

      if(!truck) return;

      loadConfig=
        Array.from(
          {
            length:truck.slots
          },
          (_,index)=>
            loadConfig[index]||{
              product:
                PRODUCTS[
                  index%
                  PRODUCTS.length
                ].id,
              litres:0
            }
        );

      renderSlots();
      renderProducts();
      renderAfterDelivery();

      return;
    }

    // --------------------------------------------------------
    // LOAD
    // --------------------------------------------------------

    if(
      event.target.matches(
        "[data-field]"
      )
    ){

      const index=
        num(
          event.target.dataset.index
        );

      const field=
        event.target.dataset.field;

      if(!loadConfig[index])
        return;

      if(field==="litres"){

        loadConfig[index].litres=
          num(event.target.value);

      }else{

        loadConfig[index].product=
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

const refreshBtn=
  document.querySelector(
    "#refreshBtn"
  );

if(refreshBtn)
  refreshBtn.onclick=
    loadSheet;

// ============================================================
// DEFAULT TRUCK = 20,000 L
// ============================================================

const truckSize=
  document.querySelector(
    "#truckSize"
  );

if(truckSize){

  truckSize.value="20000";

  loadConfig=
    Array.from(
      {length:5},
      (_,index)=>({
        product:
          PRODUCTS[
            index%
            PRODUCTS.length
          ].id,
        litres:0
      })
    );
}

// ============================================================
// INITIAL
// ============================================================

render();
loadSheet();
