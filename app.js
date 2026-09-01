
const COLORS = {home:"#3154c7",budget:"#55a83d",meals:"#e77b12",agenda:"#7d48d6",cleaning:"#A5BCD6"};

const defaults = {
  income: 2600,
  fixed: 1510,
  budgets: [
    {name:"Boodschappen", limit:350, spent:214.50},
    {name:"Vervoer", limit:80, spent:48},
    {name:"Vrije tijd", limit:120, spent:75},
    {name:"Overig", limit:60, spent:30}
  ],
  meals: {
    Maandag:{Ontbijt:"Overnight oats",Lunch:"Salade",Diner:"Pasta pesto"},
    Dinsdag:{Ontbijt:"Yoghurt & fruit",Lunch:"Wrap met hummus",Diner:"Roerbakgroenten"},
    Woensdag:{Ontbijt:"Smoothie",Lunch:"Tosti",Diner:"Zoete-aardappelcurry"},
    Donderdag:{Ontbijt:"Pannenkoekjes",Lunch:"Quinoabowl",Diner:"Zalm met rijst"},
    Vrijdag:{Ontbijt:"Avocadotoast",Lunch:"Tomatensoep",Diner:"Zelfgemaakte pizza"},
    Zaterdag:{Ontbijt:"Vrij",Lunch:"Vrij",Diner:"Vrij"},
    Zondag:{Ontbijt:"Vrij",Lunch:"Vrij",Diner:"Vrij"}
  },
  shopping:["havermout","tomaten","pasta","pesto","yoghurt"],
  agenda:[
    {id:1,date:new Date().toISOString().slice(0,10),time:"09:00",title:"Sporten"},
    {id:2,date:new Date().toISOString().slice(0,10),time:"15:30",title:"Tandarts"},
    {id:3,date:new Date(Date.now()+86400000).toISOString().slice(0,10),time:"10:30",title:"Werkafspraak"}
  ],
  cleaning:[
    {id:1,task:"Keuken bijhouden",freq:"Dagelijks",done:true},
    {id:2,task:"Stofzuigen",freq:"2× per week",done:false},
    {id:3,task:"Badkamer",freq:"Wekelijks",done:false},
    {id:4,task:"Bed verschonen",freq:"Elke 2 weken",done:false},
    {id:5,task:"Vloeren dweilen",freq:"Wekelijks",done:false},
    {id:6,task:"Ramen",freq:"Maandelijks",done:false}
  ]
};

let state = JSON.parse(localStorage.getItem("mijnLevenState") || "null") || defaults;
let currentPage = "home";
let profile = JSON.parse(localStorage.getItem("mijnLevenProfile") || "null") || {
  completed:false,name:"",income:2600,fixed:1510,savingsGoal:200,
  workDays:["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag"],
  diet:"Geen voorkeur",people:1,
  rooms:["Keuken","Woonkamer","Badkamer","Slaapkamer"],
  cleaningLevel:"Normaal"
};
let onboardIndex = 0;
let agendaView = localStorage.getItem("lumiAgendaView") || "week";
let agendaCursor = new Date();
const DAY_NAMES=["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
function todayISO(){ return new Date().toISOString().slice(0,10); }
function todayName(){ return DAY_NAMES[new Date().getDay()]; }
function dateParts(iso){ const [y,m,d]=iso.split("-").map(Number); return {y,m,d}; }
function dateObj(iso){ const p=dateParts(iso); return new Date(p.y,p.m-1,p.d,12,0,0); }
function isoLocal(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function startOfWeek(d){
  const x=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);
  const mondayOffset=(x.getDay()+6)%7;
  x.setDate(x.getDate()-mondayOffset);
  return x;
}
function daysInMonth(y,m){ return new Date(y,m,0).getDate(); }
function cleanDueOn(task, d=new Date()){
  const iso=isoLocal(d);
  const weekday=DAY_NAMES[d.getDay()];
  if(task.repeatType==="monthly"){
    const days=(task.monthDays||[]).map(Number);
    return days.includes(d.getDate());
  }
  if(task.repeatType==="monthlyNth"){
    const targetWeekday=task.weekday || "Zaterdag";
    const nths=(task.nths||[]).map(Number);
    if(weekday!==targetWeekday) return false;
    const nth=Math.floor((d.getDate()-1)/7)+1;
    return nths.includes(nth);
  }
  return (task.days||[]).includes(weekday);
}
function cleaningScheduleLabel(task){
  if(task.repeatType==="monthly"){
    const ds=(task.monthDays||[]).join(" en ");
    return ds ? `${ds} van de maand` : "Maandelijks";
  }
  if(task.repeatType==="monthlyNth"){
    const labels={1:"1e",2:"2e",3:"3e",4:"4e",5:"5e"};
    return (task.nths||[]).map(n=>labels[n]).join(" en ")+" "+(task.weekday||"Zaterdag")+" van de maand";
  }
  return (task.days||[]).join(" · ");
}

function taskKey(kind,id,date=todayISO()){ return `${kind}:${id}:${date}`; }
function isDone(kind,id,date=todayISO()){ return !!(state.completedTasks||{})[taskKey(kind,id,date)]; }
function setDone(kind,id,done,date=todayISO()){
  state.completedTasks=state.completedTasks||{};
  state.completedTasks[taskKey(kind,id,date)]=done;
  save();
}
function migrateState(){
  state.completedTasks=state.completedTasks||{};
  state.transactions=state.transactions||[];
  state.agenda=state.agenda||[];
  state.agenda.forEach(a=>{
    if(a.allDay===undefined) a.allDay=false;
    if(!a.startTime && a.time) a.startTime=a.time;
    if(a.endTime===undefined) a.endTime="";
  });
  state.cleaning=state.cleaning||[];
  state.cleaning.forEach((x,i)=>{
    x.id=x.id||Date.now()+i;
    if(!x.repeatType) x.repeatType="weekly";
    if(!Array.isArray(x.days)){
      const defaultsByFreq={"Dagelijks":["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"],"2× per week":["Dinsdag","Vrijdag"],"Wekelijks":["Zaterdag"],"Elke 2 weken":["Zaterdag"],"Maandelijks":["Zaterdag"]};
      x.days=defaultsByFreq[x.freq]||["Zaterdag"];
    }
    if(x.done && x.days.includes(todayName())) setDone("clean",x.id,true);
  });
  if(!state.transactions.length){
    const now=new Date(), y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,"0");
    state.transactions=[
      {id:101,type:"income",amount:Number(state.income||2600),date:`${y}-${m}-01`,label:"Inkomen"},
      {id:102,type:"expense",amount:214.5,date:`${y}-${m}-05`,label:"Boodschappen"},
      {id:103,type:"expense",amount:48,date:`${y}-${m}-10`,label:"Vervoer"},
      {id:104,type:"expense",amount:75,date:`${y}-${m}-16`,label:"Vrije tijd"}
    ];
  }
  save();
}
migrateState();


const content = document.getElementById("content");
const pageTitle = document.getElementById("pageTitle");
const todayLabel = document.getElementById("todayLabel");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const modalTitle = document.getElementById("modalTitle");

function save(){ localStorage.setItem("mijnLevenState", JSON.stringify(state)); }
function saveProfile(){ localStorage.setItem("mijnLevenProfile", JSON.stringify(profile)); }
function euro(n){ return new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR"}).format(n); }
function dateNL(d=new Date()){ return d.toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"}); }

function render(){
  document.documentElement.style.setProperty("--active", COLORS[currentPage]);
  todayLabel.textContent = dateNL();
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active", b.dataset.page===currentPage));
  const titleMap={home:"Lumi",budget:"Budget",meals:"Maaltijdplanner",shopping:"Boodschappenlijst",agenda:"Agenda",cleaning:"Schoonmaakschema"};
  pageTitle.textContent = titleMap[currentPage];
  content.innerHTML = ({home:homePage,budget:budgetPage,meals:mealsPage,shopping:shoppingPage,agenda:agendaPage,cleaning:cleaningPage})[currentPage]();
  bindPageEvents();
}

function homePage(){
  const today = todayISO();
  const appts = state.agenda.filter(a=>a.date===today).sort((a,b)=>(a.startTime||"00:00").localeCompare(b.startTime||"00:00"));
  const cleaningToday = state.cleaning.filter(x=>cleanDueOn(x,new Date()));
  const budgetSpent = state.budgets.reduce((s,x)=>s+x.spent,0);
  const budgetTotal = state.budgets.reduce((s,x)=>s+x.limit,0);
  const dayMap={0:"Zondag",1:"Maandag",2:"Dinsdag",3:"Woensdag",4:"Donderdag",5:"Vrijdag",6:"Zaterdag"};
  const dinner = state.meals[dayMap[new Date().getDay()]]?.Diner || "Nog niet gepland";
  const taskRow=(kind,id,title,sub,color)=>`<label class="row task-row ${isDone(kind,id)?"done":""}">
      <input class="task-check" type="checkbox" data-home-task="${kind}" data-task-id="${id}" ${isDone(kind,id)?"checked":""}>
      <div class="row-main"><strong>${title}</strong><small>${sub}</small></div>
      <span class="pill" style="border-left:3px solid ${color}">${isDone(kind,id)?"Gedaan":"Vandaag"}</span>
    </label>`;
  return `
    <section class="hero theme-blue">
      <h2>Goedemorgen${profile.name ? ", "+profile.name : ""}</h2>
      <p>Een rustig overzicht van wat vandaag aandacht nodig heeft.</p>
      <div class="decor-letter">L</div>
    </section>
    <div class="grid2">
      <button class="click-card" data-go="budget">
        <small>Budget deze maand</small><strong style="display:block;font-size:22px;margin-top:4px">${euro(budgetTotal-budgetSpent)}</strong>
        <span class="go-label">Bekijk budget</span>
      </button>
      <button class="click-card" data-go="shopping">
        <small>Boodschappenlijst</small><strong style="display:block;font-size:22px;margin-top:4px">${state.shopping.length} artikelen</strong>
        <span class="go-label">Open lijst voor vandaag</span>
      </button>
    </div>
    <div class="section-title"><h3>Vandaag</h3><button class="link-btn" data-go="agenda">bekijk agenda</button></div>
    <div class="list">
      ${appts.map(a=>taskRow("agenda",a.id,`${a.allDay?"Hele dag":`${a.startTime||a.time||""}${a.endTime?`–${a.endTime}`:""}`} · ${a.title}`,"Agenda","#4D0E12")).join("")}
      ${taskRow("meal","dinner",`Vanavond: ${dinner}`,"Maaltijd","#CDBB80")}
      ${cleaningToday.map(x=>taskRow("clean",x.id,x.task,cleaningScheduleLabel(x),"#A5BCD6")).join("")}
      ${!appts.length && !cleaningToday.length ? `<div class="empty">Geen extra taken gepland voor vandaag.</div>`:""}
    </div>
    <div class="section-title"><h3>Snel toevoegen</h3></div>
    <div class="fab-row">
      <button class="action-btn" data-settings="1">Persoonlijke instellingen</button>
      <button class="action-btn" data-add="expense">Uitgave</button>
      <button class="action-btn" data-add="agenda">Afspraak</button>
      <button class="action-btn" data-add="shopping">Boodschap</button>
      <button class="action-btn" data-add="cleaning">Schoonmaak</button>
    </div>`;
}
function budgetPage(){
  const total = state.budgets.reduce((s,x)=>s+x.limit,0);
  const spent = state.budgets.reduce((s,x)=>s+x.spent,0);
  const free = state.income - state.fixed - spent;
  return `
    <section class="hero theme-green">
      <h2>Budget <span class="brand-script">overzicht</span></h2>
      <p>Na vaste lasten en geregistreerde uitgaven heb je ${euro(free)} over.</p>
      <div class="decor-letter">B</div>
    </section>
    <div class="grid2">
      <div class="stat"><small>Inkomen</small><strong>${euro(state.income)}</strong></div>
      <div class="stat"><small>Vaste lasten</small><strong>${euro(state.fixed)}</strong></div>
    </div>
    ${budgetChart()}
    <div class="fab-row"><button class="action-btn" data-add="income">Inkomst toevoegen</button><button class="action-btn" data-add="expense">Uitgave toevoegen</button></div>
    <div class="section-title"><h3>Categorieën</h3><button class="link-btn" data-add="budgetcat">＋ categorie</button></div>
    <div class="list">
      ${state.budgets.map((b,i)=>{
        const pct=Math.min(100,Math.round((b.spent/b.limit)*100));
        return `<div class="card">
          <div class="row-main"><strong>${b.name}</strong><small>${euro(b.spent)} van ${euro(b.limit)}</small></div>
          <div class="progress"><span style="width:${pct}%;background:var(--green)"></span></div>
          <div class="fab-row" style="margin-top:10px"><button class="action-btn" data-expense-cat="${i}">Uitgave toevoegen</button></div>
        </div>`;
      }).join("")}
    </div>`;
}

function budgetChart(){
  const now=new Date(), months=[];
  for(let i=5;i>=0;i--){ months.push(new Date(now.getFullYear(),now.getMonth()-i,1)); }
  const data=months.map(d=>{
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const tx=state.transactions.filter(t=>t.date.startsWith(key));
    return {label:d.toLocaleDateString("nl-NL",{month:"short"}),income:tx.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),expense:tx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0)};
  });
  const max=Math.max(1,...data.flatMap(x=>[x.income,x.expense]));
  const W=560,H=190,base=160,bar=16,gap=56;
  const bars=data.map((x,i)=>{
    const x0=34+i*86, ih=(x.income/max)*125, eh=(x.expense/max)*125;
    return `<rect class="chart-income" x="${x0}" y="${base-ih}" width="${bar}" height="${ih}" rx="5"/><rect class="chart-expense" x="${x0+21}" y="${base-eh}" width="${bar}" height="${eh}" rx="5"/><text class="chart-label" x="${x0+18}" y="181" text-anchor="middle">${x.label}</text>`;
  }).join("");
  return `<div class="card chart-card"><div class="section-title"><h3>Inkomsten en uitgaven</h3><span class="pill">6 maanden</span></div><div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafiek inkomsten en uitgaven"><line class="chart-grid" x1="24" y1="160" x2="548" y2="160"/>${bars}</svg></div><div class="chart-legend"><span><i class="legend-dot" style="background:#F5EFC6"></i>Inkomsten</span><span><i class="legend-dot" style="background:#4D0E12"></i>Uitgaven</span></div></div>`;
}

function mealsPage(){
  return `
    <section class="hero theme-orange">
      <h2>Maaltijd<span class="brand-script">planner</span></h2>
      <p>Plan je week en houd je boodschappen automatisch bij.</p>
      <div class="decor-letter">M</div>
    </section>
    <div class="section-title"><h3>Deze week</h3><button class="link-btn" data-add="meal">bewerken</button></div>
    <div class="card">
      ${Object.entries(state.meals).map(([day,slots])=>`
        <div class="meal-day">
          <div class="day">${day.slice(0,2)}</div>
          <div>
            ${Object.entries(slots).map(([slot,val])=>`<div class="meal-slot"><small>${slot}</small>${val}</div>`).join("")}
          </div>
        </div>`).join("")}
    </div>
    <div class="section-title"><h3>Boodschappenlijst</h3><button class="link-btn" data-add="shopping">＋ item</button></div>
    <div class="list">
      ${state.shopping.length?state.shopping.map((x,i)=>`<div class="row"><div class="badge theme-orange">✓</div><div class="row-main"><strong>${x}</strong></div><button class="link-btn" data-remove-shopping="${i}">verwijder</button></div>`).join(""):`<div class="empty">Je lijst is leeg.</div>`}
    </div>`;
}

function shoppingPage(){
  return `
    <section class="hero theme-orange">
      <h2>Boodschappen<span class="brand-script">lijst</span></h2>
      <p>${state.shopping.length} artikelen voor vandaag.</p>
      <div class="decor-letter">B</div>
    </section>
    <div class="section-title"><h3>Vandaag</h3><button class="link-btn" data-add="shopping">Item toevoegen</button></div>
    <div class="list">
      ${state.shopping.length?state.shopping.map((x,i)=>`<div class="row"><div class="row-main"><strong>${x}</strong></div><button class="link-btn" data-remove-shopping="${i}">verwijder</button></div>`).join(""):`<div class="empty">Je boodschappenlijst is leeg.</div>`}
    </div>
    <div class="fab-row"><button class="action-btn" data-go="meals">Terug naar maaltijdplanner</button></div>`;
}

function agendaPage(){
  const items=[...state.agenda].sort((a,b)=>(a.date+(a.startTime||a.time||"00:00")).localeCompare(b.date+(b.startTime||b.time||"00:00")));
  const fmtRange=a=>a.allDay?"Hele dag":`${a.startTime||a.time||""}${a.endTime?` – ${a.endTime}`:""}`;
  const cursorLabel=agendaView==="year"
    ? String(agendaCursor.getFullYear())
    : agendaView==="month"
      ? agendaCursor.toLocaleDateString("nl-NL",{month:"long",year:"numeric"})
      : `${startOfWeek(agendaCursor).toLocaleDateString("nl-NL",{day:"numeric",month:"short"})} – ${new Date(startOfWeek(agendaCursor).getFullYear(),startOfWeek(agendaCursor).getMonth(),startOfWeek(agendaCursor).getDate()+6).toLocaleDateString("nl-NL",{day:"numeric",month:"short"})}`;

  return `
    <section class="hero theme-purple">
      <h2>Mijn <span class="brand-script">agenda</span></h2>
      <p>Bekijk je planning per week, maand of jaar.</p>
      <div class="decor-letter">A</div>
    </section>

    <div class="segmented" aria-label="Agendaweergave">
      <button data-agenda-view="week" class="${agendaView==="week"?"active":""}">Week</button>
      <button data-agenda-view="month" class="${agendaView==="month"?"active":""}">Maand</button>
      <button data-agenda-view="year" class="${agendaView==="year"?"active":""}">Jaar</button>
    </div>

    <div class="calendar-head">
      <h3>${cursorLabel}</h3>
      <div class="cal-nav">
        <button data-cal-nav="-1" aria-label="Vorige periode">‹</button>
        <button data-cal-today="1">Vandaag</button>
        <button data-cal-nav="1" aria-label="Volgende periode">›</button>
      </div>
    </div>

    ${agendaCalendarView(items)}

    <div class="section-title"><h3>Afspraken</h3><button class="link-btn" data-add="agenda">Afspraak toevoegen</button></div>
    <div class="list">
      ${items.length?items.map(a=>`<div class="row task-row ${isDone("agenda",a.id,a.date)?"done":""}">
        <input class="task-check" type="checkbox" data-agenda-done="${a.id}" data-agenda-date="${a.date}" ${isDone("agenda",a.id,a.date)?"checked":""}>
        <div class="row-main"><strong>${a.title}</strong><small>${new Date(a.date+"T12:00").toLocaleDateString("nl-NL",{weekday:"short",day:"numeric",month:"short"})} · ${fmtRange(a)}</small></div>
        ${a.allDay?`<span class="all-day-chip">Hele dag</span>`:""}
        <button class="link-btn" data-delete-agenda="${a.id}">wis</button>
      </div>`).join(""):`<div class="empty">Nog geen afspraken.</div>`}
    </div>`;
}

function agendaCalendarView(items){
  if(agendaView==="week"){
    const start=startOfWeek(agendaCursor);
    const days=[...Array(7)].map((_,i)=>new Date(start.getFullYear(),start.getMonth(),start.getDate()+i,12));
    return `<div class="week-grid">${days.map(d=>{
      const iso=isoLocal(d), ev=items.filter(a=>a.date===iso);
      return `<div class="week-day ${iso===todayISO()?"today":""}">
        <h4>${d.toLocaleDateString("nl-NL",{weekday:"short",day:"numeric"})}</h4>
        ${ev.length?ev.map(a=>`<div class="week-event"><strong>${a.title}</strong><br><span>${a.allDay?"Hele dag":`${a.startTime||a.time||""}${a.endTime?`–${a.endTime}`:""}`}</span></div>`).join(""):`<span class="subtle">—</span>`}
      </div>`;
    }).join("")}</div>`;
  }

  if(agendaView==="month"){
    const y=agendaCursor.getFullYear(), m=agendaCursor.getMonth();
    const first=new Date(y,m,1,12), offset=(first.getDay()+6)%7;
    const cells=[...Array(42)].map((_,i)=>new Date(y,m,1-offset+i,12));
    return `<div class="month-grid">
      ${["Ma","Di","Wo","Do","Vr","Za","Zo"].map(x=>`<div class="dow">${x}</div>`).join("")}
      ${cells.map(d=>{
        const iso=isoLocal(d), ev=items.filter(a=>a.date===iso);
        return `<div class="month-cell ${d.getMonth()!==m?"outside":""} ${iso===todayISO()?"today":""}">
          <span class="num">${d.getDate()}</span>
          ${ev.slice(0,2).map(a=>`<span class="month-event">${a.allDay?"Hele dag":(a.startTime||a.time||"")} ${a.title}</span>`).join("")}
          ${ev.length>2?`<span class="month-event">+${ev.length-2} meer</span>`:""}
        </div>`;
      }).join("")}
    </div>`;
  }

  const y=agendaCursor.getFullYear();
  return `<div class="year-grid">${[...Array(12)].map((_,m)=>{
    const ev=items.filter(a=>dateObj(a.date).getFullYear()===y && dateObj(a.date).getMonth()===m);
    return `<div class="year-month"><strong>${new Date(y,m,1).toLocaleDateString("nl-NL",{month:"long"})}</strong>
      <span class="subtle">${ev.length} ${ev.length===1?"afspraak":"afspraken"}</span>
      <div class="year-dots" aria-hidden="true">${ev.slice(0,24).map(()=>`<span class="year-dot"></span>`).join("")}</div>
    </div>`;
  }).join("")}</div>`;
}

function cleaningPage(){
  const due=state.cleaning.filter(x=>cleanDueOn(x,new Date()));
  const done=due.filter(x=>isDone("clean",x.id)).length;
  return `
    <section class="hero theme-yellow">
      <h2>Schoonmaak<span class="brand-script">schema</span></h2>
      <p>${done} van ${due.length} taken voor vandaag afgerond.</p>
      <div class="decor-letter">S</div>
    </section>
    <div class="section-title"><h3>Schema</h3><button class="link-btn" data-add="cleaning">Taak toevoegen</button></div>
    <div class="list">
      ${state.cleaning.map(x=>`<div class="row cleaning-task task-row ${isDone("clean",x.id)?"done":""}">
        <input class="task-check" type="checkbox" data-clean="${x.id}" ${isDone("clean",x.id)?"checked":""}>
        <div class="row-main"><strong>${x.task}</strong><small>${cleaningScheduleLabel(x)}</small></div>
        <button class="link-btn" data-edit-clean="${x.id}">planning</button>
      </div>`).join("")}
    </div>`;
}
function row(color,icon,title,sub){return `<div class="row"><span style="width:5px;height:38px;border-radius:99px;background:${color}"></span><div class="row-main"><strong>${title}</strong><small>${sub}</small></div></div>`}

function bindPageEvents(){
  document.querySelectorAll("[data-settings]").forEach(b=>b.onclick=()=>startOnboarding(true));
  document.querySelectorAll("[data-agenda-view]").forEach(b=>b.onclick=()=>{
    agendaView=b.dataset.agendaView;
    localStorage.setItem("lumiAgendaView",agendaView);
    render();
  });
  document.querySelectorAll("[data-cal-today]").forEach(b=>b.onclick=()=>{agendaCursor=new Date();render();});
  document.querySelectorAll("[data-cal-nav]").forEach(b=>b.onclick=()=>{
    const dir=Number(b.dataset.calNav);
    if(agendaView==="week") agendaCursor=new Date(agendaCursor.getFullYear(),agendaCursor.getMonth(),agendaCursor.getDate()+7*dir,12);
    if(agendaView==="month") agendaCursor=new Date(agendaCursor.getFullYear(),agendaCursor.getMonth()+dir,1,12);
    if(agendaView==="year") agendaCursor=new Date(agendaCursor.getFullYear()+dir,0,1,12);
    render();
  });

  document.querySelectorAll("[data-home-task]").forEach(c=>c.onchange=()=>{setDone(c.dataset.homeTask,c.dataset.taskId,c.checked);render();});
  document.querySelectorAll("[data-agenda-done]").forEach(c=>c.onchange=()=>{setDone("agenda",c.dataset.agendaDone,c.checked,c.dataset.agendaDate);render();});
  document.querySelectorAll("[data-edit-clean]").forEach(b=>b.onclick=()=>openModal("cleanDays",Number(b.dataset.editClean)));

  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{currentPage=b.dataset.go;render();});
  document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>openModal(b.dataset.add));
  document.querySelectorAll("[data-expense-cat]").forEach(b=>b.onclick=()=>openModal("expense",Number(b.dataset.expenseCat)));
  document.querySelectorAll("[data-remove-shopping]").forEach(b=>b.onclick=()=>{state.shopping.splice(Number(b.dataset.removeShopping),1);save();render();});
  document.querySelectorAll("[data-delete-agenda]").forEach(b=>b.onclick=()=>{state.agenda=state.agenda.filter(a=>a.id!==Number(b.dataset.deleteAgenda));save();render();});
  document.querySelectorAll("[data-clean]").forEach(c=>c.onchange=()=>{setDone("clean",c.dataset.clean,c.checked);render();});
}

function openModal(type, catIndex=null){
  const fields={
    expense:{title:"Uitgave toevoegen",html:`<div class="form-grid"><label>Categorie<select id="fCat">${state.budgets.map((b,i)=>`<option value="${i}" ${i===catIndex?"selected":""}>${b.name}</option>`).join("")}</select></label><label>Bedrag<input id="fAmount" type="number" step="0.01" min="0" placeholder="0,00"></label></div>`},
    agenda:{title:"Afspraak toevoegen",html:`<div class="form-grid">
      <label>Titel<input id="fTitle" placeholder="Bijv. tandarts"></label>
      <label>Datum<input id="fDate" type="date" value="${todayISO()}"></label>
      <label class="switch-line"><input id="fAllDay" type="checkbox"> Hele dag</label>
      <div class="time-row" id="timeFields">
        <label>Begintijd<input id="fStartTime" type="time" value="09:00"></label>
        <label>Eindtijd<input id="fEndTime" type="time" value="10:00"></label>
      </div>
    </div>`},
    shopping:{title:"Boodschap toevoegen",html:`<div class="form-grid"><label>Artikel<input id="fItem" placeholder="Bijv. tomaten"></label></div>`},
    cleaning:{title:"Schoonmaaktaak toevoegen",html:`<div class="form-grid">
      <label>Taak<input id="fTask" placeholder="Bijv. koelkast schoonmaken"></label>
      <label>Herhaling
        <select id="fRepeatType">
          <option value="weekly">Op vaste weekdagen</option>
          <option value="monthly1">1 keer per maand</option>
          <option value="monthly2">2 keer per maand</option>
        </select>
      </label>
      <div id="cleanRepeatFields"></div>
    </div>`},
    income:{title:"Inkomst toevoegen",html:`<div class="form-grid"><label>Omschrijving<input id="fIncomeLabel" placeholder="Bijv. salaris"></label><label>Bedrag<input id="fIncomeAmount" type="number" step="0.01" min="0"></label><label>Datum<input id="fIncomeDate" type="date" value="${todayISO()}"></label></div>`},
    cleanDays:{title:"Schoonmaakplanning aanpassen",html:`<div class="form-grid"><div id="editCleanRepeatFields"></div></div>`},
    budgetcat:{title:"Budgetcategorie toevoegen",html:`<div class="form-grid"><label>Naam<input id="fName" placeholder="Bijv. Kleding"></label><label>Maandbudget<input id="fLimit" type="number" min="0" step="1" placeholder="100"></label></div>`},
    meal:{title:"Maaltijd bewerken",html:`<div class="form-grid"><label>Dag<select id="fDay">${Object.keys(state.meals).map(d=>`<option>${d}</option>`).join("")}</select></label><label>Moment<select id="fSlot"><option>Ontbijt</option><option>Lunch</option><option>Diner</option></select></label><label>Maaltijd<input id="fMeal" placeholder="Bijv. pasta pesto"></label></div>`}
  };
  modalTitle.textContent=fields[type].title;
  modalBody.innerHTML=fields[type].html;
  modal.dataset.type=type;
  function renderCleanRepeat(containerId,prefix,task=null){
    const el=document.getElementById(containerId);
    if(!el)return;
    const typeSel=document.getElementById(prefix+"RepeatType");
    const mode=typeSel?typeSel.value:(task?.repeatType==="monthly"?(task.monthDays?.length===2?"monthly2":"monthly1"):"weekly");
    if(mode==="weekly"){
      const selected=task?.days||[];
      el.innerHTML=`<label>Weekdagen</label><div class="day-picker">${["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"].map(d=>`<label class="day-pill"><input type="checkbox" name="${prefix}WeekDay" value="${d}" ${selected.includes(d)?"checked":""}><span>${d.slice(0,2)}</span></label>`).join("")}</div>`;
    } else {
      const count=mode==="monthly2"?2:1;
      const existing=task?.monthDays||[];
      el.innerHTML=`<div class="clean-month-choice">${[...Array(count)].map((_,i)=>`<label>Dag ${i+1} van de maand<input type="number" min="1" max="31" name="${prefix}MonthDay" value="${existing[i]||Math.min(28,1+i*14)}"></label>`).join("")}</div><small class="subtle">Op maanden met minder dagen wordt een datum boven het aantal dagen automatisch overgeslagen.</small>`;
    }
  }

  modal.dataset.editId=catIndex??"";
  modal.showModal();

  if(type==="agenda"){
    const allDay=document.getElementById("fAllDay");
    const timeFields=document.getElementById("timeFields");
    const toggle=()=>{timeFields.style.display=allDay.checked?"none":"grid";};
    allDay.addEventListener("change",toggle); toggle();
  }

  if(type==="cleaning"){
    const sel=document.getElementById("fRepeatType");
    const wrapper=document.getElementById("cleanRepeatFields");
    const draw=()=>{
      const mode=sel.value;
      if(mode==="weekly"){
        wrapper.innerHTML=`<label>Weekdagen</label><div class="day-picker">${["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"].map(d=>`<label class="day-pill"><input type="checkbox" name="newWeekDay" value="${d}"><span>${d.slice(0,2)}</span></label>`).join("")}</div>`;
      } else {
        const count=mode==="monthly2"?2:1;
        wrapper.innerHTML=`<div class="clean-month-choice">${[...Array(count)].map((_,i)=>`<label>Dag ${i+1} van de maand<input type="number" min="1" max="31" name="newMonthDay" value="${i===0?1:15}"></label>`).join("")}</div>`;
      }
    };
    sel.addEventListener("change",draw); draw();
  }

  if(type==="cleanDays"){
    const task=state.cleaning.find(x=>x.id===catIndex);
    const edit=document.getElementById("editCleanRepeatFields");
    const inferred=task.repeatType==="monthly"?(task.monthDays?.length===2?"monthly2":"monthly1"):"weekly";
    edit.innerHTML=`<label>Herhaling<select id="editRepeatType"><option value="weekly" ${inferred==="weekly"?"selected":""}>Op vaste weekdagen</option><option value="monthly1" ${inferred==="monthly1"?"selected":""}>1 keer per maand</option><option value="monthly2" ${inferred==="monthly2"?"selected":""}>2 keer per maand</option></select></label><div id="editRepeatInner"></div>`;
    const sel=document.getElementById("editRepeatType"), inner=document.getElementById("editRepeatInner");
    const draw=()=>{
      const mode=sel.value;
      if(mode==="weekly"){
        inner.innerHTML=`<label>Weekdagen</label><div class="day-picker">${["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"].map(d=>`<label class="day-pill"><input type="checkbox" name="editWeekDay" value="${d}" ${(task.days||[]).includes(d)?"checked":""}><span>${d.slice(0,2)}</span></label>`).join("")}</div>`;
      } else {
        const count=mode==="monthly2"?2:1, vals=task.monthDays||[1,15];
        inner.innerHTML=`<div class="clean-month-choice">${[...Array(count)].map((_,i)=>`<label>Dag ${i+1} van de maand<input type="number" min="1" max="31" name="editMonthDay" value="${vals[i]|| (i===0?1:15)}"></label>`).join("")}</div>`;
      }
    };
    sel.addEventListener("change",draw); draw();
  }
}

document.getElementById("modalForm").addEventListener("submit",e=>{
  e.preventDefault();
  const t=modal.dataset.type;
  if(t==="expense"){ const i=Number(document.getElementById("fCat").value); const a=Number(document.getElementById("fAmount").value||0); state.budgets[i].spent += a; state.transactions.push({id:Date.now(),type:"expense",amount:a,date:todayISO(),label:state.budgets[i].name}); }
  if(t==="income"){ const a=Number(document.getElementById("fIncomeAmount").value||0); const d=document.getElementById("fIncomeDate").value; const l=document.getElementById("fIncomeLabel").value||"Inkomst"; state.transactions.push({id:Date.now(),type:"income",amount:a,date:d,label:l}); }
  if(t==="agenda"){
    const allDay=document.getElementById("fAllDay").checked;
    const start=document.getElementById("fStartTime").value;
    const end=document.getElementById("fEndTime").value;
    if(!allDay && start && end && end<=start){ alert("De eindtijd moet na de begintijd liggen."); return; }
    state.agenda.push({id:Date.now(),title:document.getElementById("fTitle").value||"Afspraak",date:document.getElementById("fDate").value,allDay,startTime:allDay?"":start,endTime:allDay?"":end});
  }); }
  if(t==="shopping"){ const v=document.getElementById("fItem").value.trim(); if(v)state.shopping.push(v); }
  if(t==="cleaning"){
    const v=document.getElementById("fTask").value.trim();
    const mode=document.getElementById("fRepeatType").value;
    if(v){
      const task={id:Date.now(),task:v,freq:"Aangepast",done:false};
      if(mode==="weekly"){ task.repeatType="weekly"; task.days=[...document.querySelectorAll('input[name="newWeekDay"]:checked')].map(x=>x.value); }
      else { task.repeatType="monthly"; task.monthDays=[...document.querySelectorAll('input[name="newMonthDay"]')].map(x=>Math.max(1,Math.min(31,Number(x.value||1)))); }
      state.cleaning.push(task);
    }
  }); }
  if(t==="cleanDays"){
    const id=Number(modal.dataset.editId), task=state.cleaning.find(x=>x.id===id);
    if(task){
      const mode=document.getElementById("editRepeatType").value;
      if(mode==="weekly"){ task.repeatType="weekly"; task.days=[...document.querySelectorAll('input[name="editWeekDay"]:checked')].map(x=>x.value); task.monthDays=[]; }
      else { task.repeatType="monthly"; task.monthDays=[...document.querySelectorAll('input[name="editMonthDay"]')].map(x=>Math.max(1,Math.min(31,Number(x.value||1)))); task.days=[]; }
    }
  }
  if(t==="budgetcat"){ const n=document.getElementById("fName").value.trim(); const l=Number(document.getElementById("fLimit").value||0); if(n)state.budgets.push({name:n,limit:l,spent:0}); }
  if(t==="meal"){ const d=document.getElementById("fDay").value,s=document.getElementById("fSlot").value,m=document.getElementById("fMeal").value.trim(); if(m)state.meals[d][s]=m; }
  save(); modal.close(); render();
});

document.getElementById("quickAddBtn").onclick=()=>openModal(currentPage==="home"?"agenda":({budget:"expense",meals:"meal",shopping:"shopping",agenda:"agenda",cleaning:"cleaning"})[currentPage]);
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{currentPage=b.dataset.page;render();});
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }

const onboarding = document.getElementById("onboarding");
const onboardStep = document.getElementById("onboardStep");
const onboardProgress = document.getElementById("onboardProgress");
const onboardBack = document.getElementById("onboardBack");
const onboardNext = document.getElementById("onboardNext");

const onboardSteps = [
()=>`<div class="onboard-hero"><h2>Welkom bij <span class="brand-script">Lumi</span></h2><p>We richten de app één keer samen in. Daarna gebruikt je dashboard jouw eigen budget, ritme, maaltijden en huishouden.</p></div>`,
()=>`<h2>Over jou</h2><div class="form-grid"><label>Hoe mogen we je noemen?<input id="obName" value="${profile.name}" placeholder="Voornaam"></label><label>Voor hoeveel personen plan je?<input id="obPeople" type="number" min="1" max="12" value="${profile.people}"></label><label>Eetvoorkeur<select id="obDiet">${["Geen voorkeur","Vegetarisch","Vegan","Halal","Glutenvrij","Lactosevrij"].map(x=>`<option ${profile.diet===x?"selected":""}>${x}</option>`).join("")}</select></label></div>`,
()=>`<h2>Je geld</h2><p class="eyebrow">Hiermee maken we je budgetoverzicht persoonlijk.</p><div class="form-grid"><label>Netto inkomen per maand (€)<input id="obIncome" type="number" value="${profile.income}"></label><label>Vaste lasten per maand (€)<input id="obFixed" type="number" value="${profile.fixed}"></label><label>Gewenst sparen per maand (€)<input id="obSavings" type="number" value="${profile.savingsGoal}"></label></div>`,
()=>`<h2>Je weekritme</h2><p class="eyebrow">Selecteer je gebruikelijke werk-/studiedagen.</p><div class="choice-grid">${Object.keys(state.meals).map(d=>`<label class="choice"><input type="checkbox" name="workday" value="${d}" ${profile.workDays.includes(d)?"checked":""}>${d}</label>`).join("")}</div>`,
()=>`<h2>Je huis</h2><p class="eyebrow">Welke ruimtes wil je in het schoonmaakschema?</p><div class="choice-grid">${["Keuken","Woonkamer","Badkamer","Slaapkamer","Toilet","Hal","Werkkamer","Balkon/tuin"].map(r=>`<label class="choice"><input type="checkbox" name="room" value="${r}" ${profile.rooms.includes(r)?"checked":""}>${r}</label>`).join("")}</div><div class="form-grid"><label>Hoe uitgebreid wil je schoonmaken?<select id="obClean"><option ${profile.cleaningLevel==="Licht"?"selected":""}>Licht</option><option ${profile.cleaningLevel==="Normaal"?"selected":""}>Normaal</option><option ${profile.cleaningLevel==="Uitgebreid"?"selected":""}>Uitgebreid</option></select></label></div>`,
()=>`<div class="onboard-hero"><h2>Je app is klaar</h2><p>Je kunt alles later aanpassen via <strong>Persoonlijke instellingen</strong> op het Vandaag-scherm.</p><div class="card settings-card"><span>Budget op basis van jouw inkomen</span><span>Maaltijden voor ${profile.people} persoon/personen</span><span>Jouw weekritme</span><span>Schoonmaak voor jouw ruimtes</span></div></div>`
];

function startOnboarding(edit=false){
  onboardIndex = edit ? 1 : 0;
  onboarding.classList.remove("hidden");
  showOnboard();
}
function showOnboard(){
  onboardStep.innerHTML=onboardSteps[onboardIndex]();
  onboardProgress.style.width=((onboardIndex+1)/onboardSteps.length*100)+"%";
  onboardBack.style.visibility=onboardIndex===0?"hidden":"visible";
  onboardNext.textContent=onboardIndex===onboardSteps.length-1?"Naar mijn dashboard":"Volgende";
}
function collectOnboard(){
  if(onboardIndex===1){
    profile.name=document.getElementById("obName").value.trim();
    profile.people=Number(document.getElementById("obPeople").value||1);
    profile.diet=document.getElementById("obDiet").value;
  }
  if(onboardIndex===2){
    profile.income=Number(document.getElementById("obIncome").value||0);
    profile.fixed=Number(document.getElementById("obFixed").value||0);
    profile.savingsGoal=Number(document.getElementById("obSavings").value||0);
    state.income=profile.income; state.fixed=profile.fixed;
  }
  if(onboardIndex===3) profile.workDays=[...document.querySelectorAll('input[name="workday"]:checked')].map(x=>x.value);
  if(onboardIndex===4){
    profile.rooms=[...document.querySelectorAll('input[name="room"]:checked')].map(x=>x.value);
    profile.cleaningLevel=document.getElementById("obClean").value;
  }
  saveProfile(); save();
}
onboardNext.onclick=()=>{
  collectOnboard();
  if(onboardIndex<onboardSteps.length-1){onboardIndex++;showOnboard();}
  else {profile.completed=true;saveProfile();onboarding.classList.add("hidden");render();}
};
onboardBack.onclick=()=>{collectOnboard(); if(onboardIndex>0){onboardIndex--;showOnboard();}};
render();
if(!profile.completed) startOnboarding(false);
