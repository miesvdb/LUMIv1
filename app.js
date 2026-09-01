
const COLORS = {home:"#A5BCD6",budget:"#4A2E27",meals:"#F5EFC6",shopping:"#F5EFC6",agenda:"#4D0E12",cleaning:"#A5BCD6",profile:"#231815"};

const defaults = {
  income: 2600,
  fixed: 1510,
  budgets: [
    {name:"Boodschappen", limit:350, spent:0},
    {name:"Vervoer", limit:80, spent:0},
    {name:"Vrije tijd", limit:120, spent:0},
    {name:"Overig", limit:60, spent:0}
  ],
  transactions: [],
  savingsGoals: [],
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
  completed:false,name:"",birthdate:"",income:2600,fixed:1510,savingsGoal:200,
  workDays:["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag"],
  diet:"Geen voorkeur",people:1,
  rooms:["Keuken","Woonkamer","Badkamer","Slaapkamer"],
  cleaningLevel:"Normaal"
};
if(profile.birthdate===undefined) profile.birthdate="";
if(!Array.isArray(profile.workDays)) profile.workDays=["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag"];
if(!Array.isArray(profile.rooms)) profile.rooms=["Keuken","Woonkamer","Badkamer","Slaapkamer"];
let onboardIndex = 0;
let agendaView = localStorage.getItem("lumiAgendaView") || "week";
let agendaCursor = new Date();
let budgetMonth = localStorage.getItem("lumiBudgetMonth") || todayISO().slice(0,7);
const DAY_NAMES=["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
function todayISO(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
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
  state.transactions=Array.isArray(state.transactions)?state.transactions:[];
  state.savingsGoals=Array.isArray(state.savingsGoals)?state.savingsGoals:[];
  state.budgets=Array.isArray(state.budgets)?state.budgets:[];
  state.agenda=state.agenda||[];
  state.agenda.forEach(a=>{
    if(a.allDay===undefined) a.allDay=false;
    if(!a.startTime && a.time) a.startTime=a.time;
    if(a.endTime===undefined) a.endTime="";
  });
  state.cleaning=state.cleaning||[];
  state.cleaning.forEach((x,i)=>{
    x.id=x.id||Date.now()+i;
    if(!x.repeatType){
      if(x.freq==="Maandelijks"){ x.repeatType="monthly"; x.monthDays=[1]; }
      else x.repeatType="weekly";
    }
    if(x.repeatType==="weekly" && !Array.isArray(x.days)){
      const defaultsByFreq={"Dagelijks":["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"],"2× per week":["Dinsdag","Vrijdag"],"Wekelijks":["Zaterdag"],"Elke 2 weken":["Zaterdag"]};
      x.days=defaultsByFreq[x.freq]||["Zaterdag"];
    }
    if(x.repeatType==="monthly" && !Array.isArray(x.monthDays)) x.monthDays=[1];
    if(x.done && cleanDueOn(x,new Date())) setDone("clean",x.id,true);
  });

  if((state.budgetSchemaVersion||0)<2){
    // Oude voorbeeldtransacties uit eerdere Lumi-versies verwijderen.
    state.transactions=state.transactions.filter(t=>![101,102,103,104].includes(Number(t.id)));
    // Bestaande echte uitgaven krijgen een categorie zodat categorie-totalen uit transacties komen.
    state.transactions.forEach(t=>{
      if(t.type==="expense"){
        t.category=t.category || t.label || "Overig";
        t.description=t.description || t.label || t.category;
      }
      if(t.type==="income"){
        t.description=t.description || t.label || "Inkomst";
      }
    });
    // 'spent' is vanaf nu alleen legacy; uitgaven worden altijd uit transacties berekend.
    state.budgets.forEach(b=>{ b.spent=0; });
    state.budgetSchemaVersion=2;
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
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active", b.dataset.page===currentPage || (currentPage==="shopping" && b.dataset.page==="meals")));
  const titleMap={home:"Lumi",budget:"Budget",meals:"Maaltijdplanner",shopping:"Boodschappenlijst",agenda:"Agenda",cleaning:"Schoonmaakschema",profile:"Profiel"};
  pageTitle.textContent = titleMap[currentPage];
  content.innerHTML = ({home:homePage,budget:budgetPage,meals:mealsPage,shopping:shoppingPage,agenda:agendaPage,cleaning:cleaningPage,profile:profilePage})[currentPage]();
  bindPageEvents();
}

function homePage(){
  const today = todayISO();
  const appts = state.agenda.filter(a=>a.date===today).sort((a,b)=>(a.startTime||"00:00").localeCompare(b.startTime||"00:00"));
  const cleaningToday = state.cleaning.filter(x=>cleanDueOn(x,new Date()));
  const currentBudget=budgetTotals(today.slice(0,7));
  const dayMap={0:"Zondag",1:"Maandag",2:"Dinsdag",3:"Woensdag",4:"Donderdag",5:"Vrijdag",6:"Zaterdag"};
  const dinner = state.meals[dayMap[new Date().getDay()]]?.Diner || "Nog niet gepland";
  const taskRow=(kind,id,title,sub,color)=>`<label class="row task-row home-task-${kind==="agenda"?"agenda":kind==="meal"?"meal":"clean"} ${isDone(kind,id)?"done":""}">
      <input class="task-check" type="checkbox" data-home-task="${kind}" data-task-id="${id}" ${isDone(kind,id)?"checked":""}>
      <div class="row-main"><strong>${title}</strong><small>${sub}</small></div>
      <span class="pill">${isDone(kind,id)?"Gedaan":"Vandaag"}</span>
    </label>`;
  return `
    <section class="hero theme-blue">
      <h2>Goedemorgen${profile.name ? ", "+profile.name : ""}</h2>
      <p>Een rustig overzicht van wat vandaag aandacht nodig heeft.</p>
      <div class="decor-letter">L</div>
    </section>
    <div class="grid2">
      <button class="click-card home-budget-widget" data-go="budget">
        <small>Nog uit te geven</small><strong style="display:block;font-size:22px;margin-top:4px">${euro(currentBudget.remaining)}</strong>
        <span class="go-label">Bekijk budget</span>
      </button>
      <button class="click-card home-shopping-widget" data-go="shopping">
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
      <button class="action-btn" data-go="profile">Profiel aanpassen</button>
      <button class="action-btn" data-add="expense">Uitgave</button>
      <button class="action-btn" data-add="agenda">Afspraak</button>
      <button class="action-btn" data-add="shopping">Boodschap</button>
      <button class="action-btn" data-add="cleaning">Schoonmaak</button>
    </div>`;
}

function profilePage(){
  const diets=["Geen voorkeur","Vegetarisch","Vegan","Halal","Glutenvrij","Lactosevrij"];
  const weekdays=["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"];
  const rooms=["Keuken","Woonkamer","Badkamer","Slaapkamer","Toilet","Hal","Werkkamer","Balkon/tuin"];
  return `
    <section class="hero profile-hero">
      <h2>Jouw <span class="brand-script">profiel</span></h2>
      <p>Pas hier je persoonlijke gegevens aan. Je wijzigingen worden direct gebruikt in Lumi.</p>
      <div class="decor-letter">P</div>
    </section>

    <form id="profileForm" class="profile-form">
      <div class="section-title"><h3>Over jou</h3></div>
      <div class="card profile-card">
        <div class="form-grid">
          <label>Naam
            <input id="profileName" value="${profile.name || ""}" placeholder="Voornaam">
          </label>
          <label>Geboortedatum
            <input id="profileBirthdate" type="date" value="${profile.birthdate || ""}">
          </label>
          <label>Aantal personen in je huishouden
            <input id="profilePeople" type="number" min="1" max="12" value="${profile.people || 1}">
          </label>
          <label>Eetvoorkeur
            <select id="profileDiet">${diets.map(x=>`<option ${profile.diet===x?"selected":""}>${x}</option>`).join("")}</select>
          </label>
        </div>
      </div>

      <div class="section-title"><h3>Geld</h3></div>
      <div class="card profile-card profile-money">
        <div class="form-grid">
          <label>Netto inkomen per maand (€)
            <input id="profileIncome" type="number" min="0" step="1" value="${profile.income ?? 0}">
          </label>
          <label>Vaste lasten per maand (€)
            <input id="profileFixed" type="number" min="0" step="1" value="${profile.fixed ?? 0}">
          </label>
          <label>Gewenst sparen per maand (€)
            <input id="profileSavings" type="number" min="0" step="1" value="${profile.savingsGoal ?? 0}">
          </label>
        </div>
      </div>

      <div class="section-title"><h3>Weekritme</h3></div>
      <div class="card profile-card profile-week">
        <p class="subtle">Selecteer je gebruikelijke werk- of studiedagen.</p>
        <div class="choice-grid">
          ${weekdays.map(d=>`<label class="choice"><input type="checkbox" name="profileWorkday" value="${d}" ${(profile.workDays||[]).includes(d)?"checked":""}>${d}</label>`).join("")}
        </div>
      </div>

      <div class="section-title"><h3>Huis & schoonmaak</h3></div>
      <div class="card profile-card profile-home">
        <p class="subtle">Welke ruimtes wil je meenemen in je huishouden?</p>
        <div class="choice-grid">
          ${rooms.map(r=>`<label class="choice"><input type="checkbox" name="profileRoom" value="${r}" ${(profile.rooms||[]).includes(r)?"checked":""}>${r}</label>`).join("")}
        </div>
        <div class="form-grid">
          <label>Schoonmaakniveau
            <select id="profileCleaning">
              ${["Licht","Normaal","Uitgebreid"].map(x=>`<option ${profile.cleaningLevel===x?"selected":""}>${x}</option>`).join("")}
            </select>
          </label>
        </div>
      </div>

      <div class="profile-savebar">
        <button class="primary profile-save" type="submit">Profiel opslaan</button>
        <span id="profileSaved" class="profile-saved" aria-live="polite"></span>
      </div>
    </form>`;
}


function monthLabel(key){
  const [y,m]=key.split("-").map(Number);
  return new Date(y,m-1,1,12).toLocaleDateString("nl-NL",{month:"long",year:"numeric"});
}
function monthShift(key,delta){
  const [y,m]=key.split("-").map(Number);
  const d=new Date(y,m-1+delta,1,12);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function budgetTransactions(monthKey=budgetMonth){
  return (state.transactions||[]).filter(t=>(t.date||"").startsWith(monthKey));
}
function budgetTotals(monthKey=budgetMonth){
  const tx=budgetTransactions(monthKey);
  const extraIncome=tx.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount||0),0);
  const budgetAdjustment=tx.filter(t=>t.type==="budget_adjustment").reduce((s,t)=>s+Number(t.amount||0),0);
  const expenseAdjustment=tx.filter(t=>t.type==="expense_adjustment").reduce((s,t)=>s+Number(t.amount||0),0);
  const variableExpenses=tx.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount||0),0)+expenseAdjustment;
  const savedThisMonth=tx.filter(t=>t.type==="saving").reduce((s,t)=>s+Number(t.amount||0),0);
  const baseIncome=Math.max(0,Number(profile.income||0));
  const fixedExpenses=Math.max(0,Number(profile.fixed||0));
  const monthlySavingsGoal=Math.max(0,Number(profile.savingsGoal||0));
  const totalIncome=baseIncome+extraIncome+budgetAdjustment;
  const totalExpenses=fixedExpenses+variableExpenses;
  // Werkelijke spaarinleg telt mee; zolang die lager is dan het maanddoel blijft
  // het resterende deel van het maanddoel gereserveerd. Zo wordt sparen nooit dubbel afgetrokken.
  const savingsReserved=Math.max(monthlySavingsGoal,savedThisMonth);
  const remaining=totalIncome-totalExpenses-savingsReserved;
  return {baseIncome,extraIncome,budgetAdjustment,expenseAdjustment,totalIncome,fixedExpenses,variableExpenses,totalExpenses,monthlySavingsGoal,savedThisMonth,savingsReserved,remaining};
}
function categorySpent(name,monthKey=budgetMonth){
  return budgetTransactions(monthKey)
    .filter(t=>t.type==="expense" && (t.category||t.label)===name)
    .reduce((s,t)=>s+Number(t.amount||0),0);
}
function goalSaved(goalId){
  return (state.transactions||[])
    .filter(t=>t.type==="saving" && String(t.goalId)===String(goalId))
    .reduce((s,t)=>s+Number(t.amount||0),0);
}
function daysUntil(iso){
  const end=dateObj(iso), now=dateObj(todayISO());
  return Math.ceil((end-now)/86400000);
}
function goalTermText(goal){
  const days=daysUntil(goal.targetDate);
  if(days<0) return "Doeldatum verstreken";
  if(days===0) return "Doeldatum vandaag";
  const months=Math.max(1,Math.ceil(days/30.44));
  return `${months} ${months===1?"maand":"maanden"} resterend`;
}
function transactionLabel(t){
  if(t.type==="income") return t.description||t.label||"Inkomst";
  if(t.type==="expense") return t.description||t.label||t.category||"Uitgave";
  if(t.type==="saving"){
    const g=(state.savingsGoals||[]).find(x=>String(x.id)===String(t.goalId));
    return `Sparen${g?" · "+g.name:""}`;
  }
  if(t.type==="budget_adjustment") return "Handmatige correctie budgetruimte";
  if(t.type==="expense_adjustment") return "Handmatige correctie uitgaven";
  return t.label||"Transactie";
}
function budgetPage(){
  const totals=budgetTotals(budgetMonth);
  const tx=budgetTransactions(budgetMonth).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"") || Number(b.id)-Number(a.id));
  const isCurrent=budgetMonth===todayISO().slice(0,7);
  return `
    <section class="hero theme-green">
      <h2>Budget <span class="brand-script">overzicht</span></h2>
      <p>Een helder beeld van wat er binnenkomt, uitgaat en overblijft.</p>
      <div class="decor-letter">B</div>
    </section>

    <div class="budget-month-nav card">
      <button class="secondary" type="button" data-budget-month="-1" aria-label="Vorige maand">‹</button>
      <div><small>Maand</small><strong>${monthLabel(budgetMonth)}</strong></div>
      <button class="secondary" type="button" data-budget-month="1" aria-label="Volgende maand">›</button>
      ${!isCurrent?`<button class="link-btn budget-current-month" type="button" data-budget-current>Deze maand</button>`:""}
    </div>

    <div class="grid2 budget-main-stats">
      <button class="stat budget-remaining editable-budget-stat" type="button" data-adjust-budget="remaining">
        <small>Nog uit te geven</small>
        <strong>${euro(totals.remaining)}</strong>
        <span>na uitgaven en gereserveerd sparen · aanpassen</span>
      </button>
      <button class="stat budget-expenses editable-budget-stat" type="button" data-adjust-budget="expenses">
        <small>Uitgaven</small>
        <strong>${euro(totals.totalExpenses)}</strong>
        <span>vast + variabel · aanpassen</span>
      </button>
    </div>

    <div class="budget-mini-summary budget-four-summary">
      <div><small>Totaal inkomen</small><strong>${euro(totals.totalIncome)}</strong><span>${totals.budgetAdjustment?`incl. handmatige correctie ${euro(totals.budgetAdjustment)}`:(totals.extraIncome?`incl. ${euro(totals.extraIncome)} extra`:"basisinkomen")}</span></div>
      <div><small>Vaste lasten</small><strong>${euro(totals.fixedExpenses)}</strong><span>uit je profiel</span></div>
      <div><small>Variabele uitgaven</small><strong>${euro(totals.variableExpenses)}</strong><span>${totals.expenseAdjustment?"incl. handmatige correctie":"uit transacties"}</span></div>
      <div><small>Sparen deze maand</small><strong>${euro(totals.savedThisMonth)}</strong><span>doel ${euro(totals.monthlySavingsGoal)}</span></div>
    </div>

    <div class="card savings-goal-card">
      <div class="section-title"><h3>Maandelijks spaardoel</h3><span class="pill">${euro(totals.monthlySavingsGoal)}</span></div>
      <p class="subtle">Dit bedrag reserveert Lumi iedere maand in je berekening. Werkelijke inleg in lange-termijndoelen telt hier automatisch in mee.</p>
      <div class="savings-progress"><span style="width:${totals.monthlySavingsGoal>0?Math.min(100,(totals.savedThisMonth/totals.monthlySavingsGoal)*100):0}%"></span></div>
      <div class="goal-progress-copy">${euro(totals.savedThisMonth)} daadwerkelijk ingelegd van ${euro(totals.monthlySavingsGoal)} maanddoel</div>
      <form id="savingsGoalForm" class="inline-budget-form">
        <label>Bedrag per maand
          <input id="budgetSavingsGoal" type="number" min="0" step="0.01" value="${totals.monthlySavingsGoal}">
        </label>
        <button class="secondary" type="submit">Opslaan</button>
      </form>
    </div>

    <div class="section-title"><h3>Toevoegen</h3></div>
    <div class="fab-row budget-add-row">
      <button class="action-btn" data-add="income">Inkomst</button>
      <button class="action-btn" data-add="expense">Uitgave</button>
      <button class="action-btn" data-add="longGoal">Spaardoel voor later</button>
    </div>

    <div class="section-title"><h3>Categorieën</h3><button class="link-btn" data-add="budgetcat">Categorie toevoegen</button></div>
    <div class="list budget-category-list">
      ${state.budgets.map((b,i)=>{
        const spent=categorySpent(b.name,budgetMonth);
        const pct=b.limit>0 ? Math.min(100,Math.round((spent/Number(b.limit||0))*100)) : 0;
        return `<div class="card budget-category-card">
          <div class="row-main"><strong>${b.name}</strong><small>${euro(spent)} van ${euro(Number(b.limit||0))}</small></div>
          <div class="progress"><span style="width:${pct}%"></span></div>
          <div class="budget-category-footer"><span>${pct}% gebruikt</span><button class="link-btn" data-expense-cat="${i}">Uitgave toevoegen</button></div>
        </div>`;
      }).join("")}
    </div>

    <div class="section-title"><h3>Spaardoelen voor later</h3><button class="link-btn" data-add="longGoal">Nieuw doel</button></div>
    <div class="list long-goal-list">
      ${(state.savingsGoals||[]).length ? state.savingsGoals.map(g=>{
        const saved=goalSaved(g.id);
        const target=Math.max(0,Number(g.targetAmount||0));
        const pct=target?Math.min(100,(saved/target)*100):0;
        const remaining=Math.max(0,target-saved);
        return `<div class="card long-goal-card">
          <div class="long-goal-head">
            <div><strong>${g.name}</strong><small>${goalTermText(g)} · doel ${new Date(g.targetDate+"T12:00:00").toLocaleDateString("nl-NL",{day:"numeric",month:"short",year:"numeric"})}</small></div>
            <span class="pill">${Math.round(pct)}%</span>
          </div>
          <div class="long-goal-amount"><strong>${euro(saved)}</strong><span>van ${euro(target)}</span></div>
          <div class="savings-progress"><span style="width:${pct}%"></span></div>
          <div class="goal-progress-copy">Nog ${euro(remaining)} te sparen</div>
          <div class="fab-row compact-actions">
            <button class="action-btn" data-goal-save="${g.id}">Inleg toevoegen</button>
            <button class="secondary" data-edit-goal="${g.id}">Bewerken</button>
            <button class="link-btn danger-link" data-delete-goal="${g.id}">Verwijderen</button>
          </div>
        </div>`;
      }).join("") : `<div class="empty">Nog geen lange-termijn spaardoel. Maak bijvoorbeeld een doel voor vakantie, een buffer of een grote aankoop.</div>`}
    </div>

    ${budgetChart()}

    <div class="section-title"><h3>Transacties</h3></div>
    <div class="card transaction-card">
      <div class="transaction-base-note">
        <span>Basisinkomen <strong>+ ${euro(totals.baseIncome)}</strong></span>
        <span>Vaste lasten <strong>− ${euro(totals.fixedExpenses)}</strong></span>
      </div>
      <div class="transaction-list">
        ${tx.length ? tx.map(t=>`
          <div class="transaction-row">
            <div class="transaction-sign ${t.type}">
              ${t.type==="income"?"+":t.type==="expense"?"−":t.type==="saving"?"S":"C"}
            </div>
            <div class="row-main">
              <strong>${transactionLabel(t)}</strong>
              <small>${new Date((t.date||todayISO())+"T12:00:00").toLocaleDateString("nl-NL",{day:"numeric",month:"short"})}${t.type==="expense" && t.category?` · ${t.category}`:""}</small>
            </div>
            <div class="transaction-amount ${t.type}">${Number(t.amount||0)>=0?"+":"−"} ${euro(Math.abs(Number(t.amount||0)))}</div>
            ${["budget_adjustment","expense_adjustment"].includes(t.type)?"":`<button class="transaction-edit" type="button" data-edit-tx="${t.id}" aria-label="Transactie bewerken">Wijzig</button>`}
          </div>`).join("") : `<div class="empty">Nog geen losse transacties in ${monthLabel(budgetMonth)}.</div>`}
      </div>
    </div>`;
}

function budgetChart(){
  const endParts=budgetMonth.split("-").map(Number);
  const end=new Date(endParts[0],endParts[1]-1,1,12);
  const months=[];
  for(let i=5;i>=0;i--) months.push(new Date(end.getFullYear(),end.getMonth()-i,1,12));
  const data=months.map(d=>{
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const tx=budgetTransactions(key);
    const extraIncome=tx.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount||0),0)
      + tx.filter(t=>t.type==="budget_adjustment").reduce((s,t)=>s+Number(t.amount||0),0);
    const variableExpense=tx.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount||0),0)
      + tx.filter(t=>t.type==="expense_adjustment").reduce((s,t)=>s+Number(t.amount||0),0);
    return {
      label:d.toLocaleDateString("nl-NL",{month:"short"}),
      income:Number(profile.income||0)+extraIncome,
      expense:Number(profile.fixed||0)+variableExpense
    };
  });
  const max=Math.max(1,...data.flatMap(x=>[x.income,x.expense]));
  const W=560,H=190,base=160,bar=16;
  const bars=data.map((x,i)=>{
    const x0=34+i*86, ih=(x.income/max)*125, eh=(x.expense/max)*125;
    return `<rect class="chart-income" x="${x0}" y="${base-ih}" width="${bar}" height="${ih}" rx="5"/><rect class="chart-expense" x="${x0+21}" y="${base-eh}" width="${bar}" height="${eh}" rx="5"/><text class="chart-label" x="${x0+18}" y="181" text-anchor="middle">${x.label}</text>`;
  }).join("");
  return `<div class="card chart-card"><div class="section-title"><h3>Inkomsten en uitgaven</h3><span class="pill">6 maanden</span></div><p class="subtle">De grafiek gebruikt je huidige vaste inkomen en vaste lasten als basis voor iedere maand, plus de transacties uit die maand.</p><div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafiek inkomsten en uitgaven"><line class="chart-grid" x1="24" y1="160" x2="548" y2="160"/>${bars}</svg></div><div class="chart-legend"><span><i class="legend-dot" style="background:#F5EFC6"></i>Inkomsten</span><span><i class="legend-dot" style="background:#4D0E12"></i>Uitgaven</span></div></div>`;
}

function mealsPage(){
  return `
    <section class="hero theme-orange">
      <h2>Maaltijd<span class="brand-script">planner</span></h2>
      <p>Plan je week en houd je boodschappen automatisch bij.</p>
      <div class="decor-letter">M</div>
    </section>
    <div class="section-title"><h3>Vandaag</h3></div>
    <label class="row task-row ${isDone("meal","dinner")?"done":""}">
      <input class="task-check" type="checkbox" data-meal-done="dinner" ${isDone("meal","dinner")?"checked":""}>
      <button class="row-main meal-today-link" type="button" data-meal-shopping="${todayName()}|Diner"><strong>Diner</strong><small>${state.meals[todayName()]?.Diner || "Nog niet gepland"}</small></button>
      <span class="pill">${isDone("meal","dinner")?"Gedaan":"Vandaag"}</span>
    </label>
    <div class="section-title"><h3>Deze week</h3><button class="link-btn" data-add="meal">bewerken</button></div>
    <div class="card">
      ${Object.entries(state.meals).map(([day,slots])=>`
        <div class="meal-day">
          <div class="day">${day.slice(0,2)}</div>
          <div>
            ${Object.entries(slots).map(([slot,val])=>`<button class="meal-slot meal-to-shopping" type="button" data-meal-shopping="${day}|${slot}"><small>${slot}</small><span>${val}</span><em>Naar boodschappenlijst</em></button>`).join("")}
          </div>
        </div>`).join("")}
    </div>
    <div class="section-title"><h3>Boodschappenlijst</h3><button class="link-btn" data-add="shopping">＋ item</button></div>
    <div class="list">
      ${state.shopping.length?state.shopping.map((x,i)=>`<div class="row"><div class="badge theme-orange">✓</div><div class="row-main"><strong>${x}</strong></div><div class="shopping-actions"><button class="link-btn" data-edit-shopping="${i}">bewerk</button><button class="link-btn" data-remove-shopping="${i}">verwijder</button></div></div>`).join(""):`<div class="empty">Je lijst is leeg.</div>`}
    </div>`;
}

function shoppingPage(){
  let mealContext=null;
  try{ mealContext=JSON.parse(sessionStorage.getItem("lumiMealShoppingContext")||"null"); }catch(e){}
  return `
    <section class="hero theme-orange">
      <h2>Boodschappen<span class="brand-script">lijst</span></h2>
      <p>${state.shopping.length} artikelen voor vandaag.</p>
      <div class="decor-letter">B</div>
    </section>
    ${mealContext?`<div class="card meal-shopping-context"><small>${mealContext.day} · ${mealContext.slot}</small><strong>${mealContext.meal||"Maaltijd"}</strong><p>Pas hieronder je boodschappenlijst aan voor deze maaltijd.</p><button class="link-btn" type="button" data-clear-meal-context>Sluiten</button></div>`:""}
    <div class="section-title"><h3>Vandaag</h3><button class="link-btn" data-add="shopping">Item toevoegen</button></div>
    <div class="list">
      ${state.shopping.length?state.shopping.map((x,i)=>`<div class="row"><div class="row-main"><strong>${x}</strong></div><div class="shopping-actions"><button class="link-btn" data-edit-shopping="${i}">bewerk</button><button class="link-btn" data-remove-shopping="${i}">verwijder</button></div></div>`).join(""):`<div class="empty">Je boodschappenlijst is leeg.</div>`}
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
      ${state.cleaning.map(x=>{
        const due=cleanDueOn(x,new Date());
        return `<div class="row cleaning-task task-row ${due && isDone("clean",x.id)?"done":""}">
          ${due?`<input class="task-check" type="checkbox" data-clean="${x.id}" ${isDone("clean",x.id)?"checked":""}>`:`<span class="schedule-mark" aria-hidden="true"></span>`}
          <div class="row-main"><strong>${x.task}</strong><small>${cleaningScheduleLabel(x)}${due?" · Vandaag":""}</small></div>
          <button class="link-btn" data-edit-clean="${x.id}">planning</button>
        </div>`;
      }).join("")}
    </div>`;
}
function row(color,icon,title,sub){return `<div class="row"><span style="width:5px;height:38px;border-radius:99px;background:${color}"></span><div class="row-main"><strong>${title}</strong><small>${sub}</small></div></div>`}

function bindPageEvents(){
  const savingsGoalForm=document.getElementById("savingsGoalForm");
  if(savingsGoalForm){
    savingsGoalForm.onsubmit=(e)=>{
      e.preventDefault();
      profile.savingsGoal=Math.max(0,Number(document.getElementById("budgetSavingsGoal").value||0));
      saveProfile();
      render();
    };
  }


  document.querySelectorAll("[data-budget-month]").forEach(b=>b.onclick=()=>{
    budgetMonth=monthShift(budgetMonth,Number(b.dataset.budgetMonth));
    localStorage.setItem("lumiBudgetMonth",budgetMonth);
    render();
  });
  document.querySelectorAll("[data-budget-current]").forEach(b=>b.onclick=()=>{
    budgetMonth=todayISO().slice(0,7);
    localStorage.setItem("lumiBudgetMonth",budgetMonth);
    render();
  });
  document.querySelectorAll("[data-edit-tx]").forEach(b=>b.onclick=()=>openModal("editTx",Number(b.dataset.editTx)));
  document.querySelectorAll("[data-goal-save]").forEach(b=>b.onclick=()=>openModal("goalSave",Number(b.dataset.goalSave)));
  document.querySelectorAll("[data-edit-goal]").forEach(b=>b.onclick=()=>openModal("longGoal",Number(b.dataset.editGoal)));
  document.querySelectorAll("[data-delete-goal]").forEach(b=>b.onclick=()=>{
    const id=Number(b.dataset.deleteGoal);
    const goal=(state.savingsGoals||[]).find(g=>Number(g.id)===id);
    if(goal && confirm(`Spaardoel "${goal.name}" verwijderen? De reeds geregistreerde inleg blijft in je transactiehistorie staan.`)){
      state.savingsGoals=state.savingsGoals.filter(g=>Number(g.id)!==id);
      save(); render();
    }
  });

  const profileForm=document.getElementById("profileForm");
  if(profileForm){
    profileForm.onsubmit=(e)=>{
      e.preventDefault();
      profile.name=document.getElementById("profileName").value.trim();
      profile.birthdate=document.getElementById("profileBirthdate").value;
      profile.people=Math.max(1,Number(document.getElementById("profilePeople").value||1));
      profile.diet=document.getElementById("profileDiet").value;
      profile.income=Math.max(0,Number(document.getElementById("profileIncome").value||0));
      profile.fixed=Math.max(0,Number(document.getElementById("profileFixed").value||0));
      profile.savingsGoal=Math.max(0,Number(document.getElementById("profileSavings").value||0));
      profile.workDays=[...document.querySelectorAll('input[name="profileWorkday"]:checked')].map(x=>x.value);
      profile.rooms=[...document.querySelectorAll('input[name="profileRoom"]:checked')].map(x=>x.value);
      profile.cleaningLevel=document.getElementById("profileCleaning").value;
      profile.completed=true;
      state.income=profile.income;
      state.fixed=profile.fixed;
      saveProfile();
      save();
      const saved=document.getElementById("profileSaved");
      if(saved){
        saved.textContent="Opgeslagen";
        setTimeout(()=>{ if(saved) saved.textContent=""; },1800);
      }
    };
  }

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
  document.querySelectorAll("[data-meal-done]").forEach(c=>c.onchange=()=>{setDone("meal",c.dataset.mealDone,c.checked);render();});
  document.querySelectorAll("[data-agenda-done]").forEach(c=>c.onchange=()=>{setDone("agenda",c.dataset.agendaDone,c.checked,c.dataset.agendaDate);render();});
  document.querySelectorAll("[data-edit-clean]").forEach(b=>b.onclick=()=>openModal("cleanDays",Number(b.dataset.editClean)));

  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{currentPage=b.dataset.go;render();});
  document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>openModal(b.dataset.add));
  document.querySelectorAll("[data-expense-cat]").forEach(b=>b.onclick=()=>openModal("expense",Number(b.dataset.expenseCat)));
  document.querySelectorAll("[data-adjust-budget]").forEach(b=>b.onclick=()=>openModal("budgetAdjust",b.dataset.adjustBudget));
  document.querySelectorAll("[data-meal-shopping]").forEach(b=>b.onclick=(e)=>{
    e.preventDefault();
    e.stopPropagation();
    const [day,slot]=b.dataset.mealShopping.split("|");
    sessionStorage.setItem("lumiMealShoppingContext",JSON.stringify({day,slot,meal:state.meals[day]?.[slot]||""}));
    currentPage="shopping";
    render();
  });
  document.querySelectorAll("[data-edit-shopping]").forEach(b=>b.onclick=()=>openModal("editShopping",Number(b.dataset.editShopping)));

  document.querySelectorAll("[data-remove-shopping]").forEach(b=>b.onclick=()=>{state.shopping.splice(Number(b.dataset.removeShopping),1);save();render();});
  document.querySelectorAll("[data-clear-meal-context]").forEach(b=>b.onclick=()=>{sessionStorage.removeItem("lumiMealShoppingContext");render();});
  document.querySelectorAll("[data-delete-agenda]").forEach(b=>b.onclick=()=>{state.agenda=state.agenda.filter(a=>a.id!==Number(b.dataset.deleteAgenda));save();render();});
  document.querySelectorAll("[data-clean]").forEach(c=>c.onchange=()=>{setDone("clean",c.dataset.clean,c.checked);render();});
}

function openModal(type, catIndex=null){
  const fields={
    expense:{title:"Uitgave toevoegen",html:`<div class="form-grid"><label>Omschrijving<input id="fExpenseLabel" placeholder="Bijv. supermarkt"></label><label>Categorie<select id="fCat">${state.budgets.map((b,i)=>`<option value="${i}" ${i===catIndex?"selected":""}>${b.name}</option>`).join("")}</select></label><label>Bedrag<input id="fAmount" type="number" step="0.01" min="0" placeholder="0,00"></label><label>Datum<input id="fExpenseDate" type="date" value="${budgetMonth===todayISO().slice(0,7)?todayISO():budgetMonth+"-01"}"></label></div>`},
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
    editShopping:{title:"Boodschap bewerken",html:(()=>{
      const i=Number(catIndex), item=state.shopping[i]||"";
      return `<div class="form-grid"><label>Artikel<input id="fEditShopping" value="${item}"></label></div>`;
    })()},
    budgetAdjust:{title:catIndex==="remaining"?"Nog uit te geven aanpassen":"Uitgaven aanpassen",html:(()=>{
      const totals=budgetTotals(budgetMonth);
      const current=catIndex==="remaining"?totals.remaining:totals.totalExpenses;
      return `<div class="form-grid">
        <p class="subtle">Je past het totaal voor ${monthLabel(budgetMonth)} aan. Lumi maakt hiervoor één zichtbare correctie en rekent de andere bedragen daarna automatisch opnieuw uit.</p>
        <label>${catIndex==="remaining"?"Gewenst bedrag nog uit te geven":"Gewenst totaal uitgaven"}
          <input id="fBudgetTarget" type="number" step="0.01" value="${Number(current).toFixed(2)}">
        </label>
      </div>`;
    })()},
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
    income:{title:"Extra inkomst toevoegen",html:`<div class="form-grid"><label>Omschrijving<input id="fIncomeLabel" placeholder="Bijv. bonus of verkoop"></label><label>Bedrag<input id="fIncomeAmount" type="number" step="0.01" min="0"></label><label>Datum<input id="fIncomeDate" type="date" value="${budgetMonth===todayISO().slice(0,7)?todayISO():budgetMonth+"-01"}"></label></div>`},
    longGoal:{title:catIndex!==null?"Spaardoel bewerken":"Spaardoel voor later",html:(()=>{
      const g=(state.savingsGoals||[]).find(x=>Number(x.id)===Number(catIndex))||{};
      const defaultDate=(()=>{const d=new Date();d.setFullYear(d.getFullYear()+1);return isoLocal(d);})();
      return `<div class="form-grid">
        <label>Waar spaar je voor?<input id="fGoalName" value="${g.name||""}" placeholder="Bijv. vakantie, buffer of auto"></label>
        <label>Doelbedrag<input id="fGoalAmount" type="number" min="0.01" step="0.01" value="${g.targetAmount||""}" placeholder="2500"></label>
        <label>Doeldatum<input id="fGoalDate" type="date" value="${g.targetDate||defaultDate}" min="${todayISO()}"></label>
      </div>`;
    })()},
    goalSave:{title:"Inleg toevoegen",html:(()=>{
      const g=(state.savingsGoals||[]).find(x=>Number(x.id)===Number(catIndex));
      return `<div class="form-grid"><p class="subtle">Inleg voor <strong>${g?.name||"spaardoel"}</strong>.</p><label>Bedrag<input id="fGoalSaveAmount" type="number" min="0.01" step="0.01" placeholder="100"></label><label>Datum<input id="fGoalSaveDate" type="date" value="${todayISO()}"></label></div>`;
    })()},
    editTx:{title:"Transactie bewerken",html:(()=>{
      const t=(state.transactions||[]).find(x=>Number(x.id)===Number(catIndex));
      if(!t) return `<div class="empty">Transactie niet gevonden.</div>`;
      const cat=t.category||t.label||state.budgets[0]?.name||"Overig";
      const cats=state.budgets.map(b=>`<option ${b.name===cat?"selected":""}>${b.name}</option>`).join("");
      return `<div class="form-grid">
        <label>Type<input value="${t.type==="income"?"Inkomst":t.type==="expense"?"Uitgave":"Sparen"}" disabled></label>
        ${t.type!=="saving"?`<label>Omschrijving<input id="fEditTxLabel" value="${t.description||t.label||""}"></label>`:""}
        ${t.type==="expense"?`<label>Categorie<select id="fEditTxCat">${cats}</select></label>`:""}
        <label>Bedrag<input id="fEditTxAmount" type="number" min="0.01" step="0.01" value="${Number(t.amount||0)}"></label>
        <label>Datum<input id="fEditTxDate" type="date" value="${t.date||todayISO()}"></label>
        <button type="button" class="secondary danger-action" id="deleteTxBtn">Transactie verwijderen</button>
      </div>`;
    })()},
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

  if(type==="editTx"){
    const del=document.getElementById("deleteTxBtn");
    if(del) del.onclick=()=>{
      if(confirm("Deze transactie verwijderen?")){
        state.transactions=state.transactions.filter(t=>Number(t.id)!==Number(catIndex));
        save(); modal.close(); render();
      }
    };
  }


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
  if(t==="expense"){
    const i=Number(document.getElementById("fCat").value);
    const category=state.budgets[i]?.name||"Overig";
    const a=Math.max(0,Number(document.getElementById("fAmount").value||0));
    const d=document.getElementById("fExpenseDate").value||todayISO();
    const l=document.getElementById("fExpenseLabel").value.trim()||category;
    if(a<=0){ alert("Vul een bedrag groter dan 0 in."); return; }
    state.transactions.push({id:Date.now(),type:"expense",amount:a,date:d,category,description:l,label:l});
  }
  if(t==="income"){
    const a=Math.max(0,Number(document.getElementById("fIncomeAmount").value||0));
    const d=document.getElementById("fIncomeDate").value||todayISO();
    const l=document.getElementById("fIncomeLabel").value.trim()||"Extra inkomst";
    if(a<=0){ alert("Vul een bedrag groter dan 0 in."); return; }
    state.transactions.push({id:Date.now(),type:"income",amount:a,date:d,description:l,label:l});
  }
  if(t==="longGoal"){
    const name=document.getElementById("fGoalName").value.trim();
    const targetAmount=Math.max(0,Number(document.getElementById("fGoalAmount").value||0));
    const targetDate=document.getElementById("fGoalDate").value;
    if(!name || targetAmount<=0 || !targetDate){ alert("Vul een naam, doelbedrag en doeldatum in."); return; }
    const existing=(state.savingsGoals||[]).find(g=>Number(g.id)===Number(modal.dataset.editId));
    if(existing){ existing.name=name; existing.targetAmount=targetAmount; existing.targetDate=targetDate; }
    else state.savingsGoals.push({id:Date.now(),name,targetAmount,targetDate,createdAt:todayISO()});
  }
  if(t==="goalSave"){
    const goalId=Number(modal.dataset.editId);
    const goal=(state.savingsGoals||[]).find(g=>Number(g.id)===goalId);
    const amount=Math.max(0,Number(document.getElementById("fGoalSaveAmount").value||0));
    const date=document.getElementById("fGoalSaveDate").value||todayISO();
    if(!goal || amount<=0){ alert("Vul een bedrag groter dan 0 in."); return; }
    state.transactions.push({id:Date.now(),type:"saving",amount,date,goalId,description:`Inleg ${goal.name}`,label:`Inleg ${goal.name}`});
  }
  if(t==="editTx"){
    const tx=(state.transactions||[]).find(x=>Number(x.id)===Number(modal.dataset.editId));
    if(!tx){ modal.close(); return; }
    const amount=Math.max(0,Number(document.getElementById("fEditTxAmount").value||0));
    const date=document.getElementById("fEditTxDate").value||todayISO();
    if(amount<=0){ alert("Vul een bedrag groter dan 0 in."); return; }
    tx.amount=amount; tx.date=date;
    if(tx.type!=="saving"){
      const label=document.getElementById("fEditTxLabel").value.trim()||(tx.type==="income"?"Inkomst":"Uitgave");
      tx.description=label; tx.label=label;
    }
    if(tx.type==="expense") tx.category=document.getElementById("fEditTxCat").value;
  }
  if(t==="agenda"){
    const allDay=document.getElementById("fAllDay").checked;
    const start=document.getElementById("fStartTime").value;
    const end=document.getElementById("fEndTime").value;
    if(!allDay && start && end && end<=start){ alert("De eindtijd moet na de begintijd liggen."); return; }
    state.agenda.push({id:Date.now(),title:document.getElementById("fTitle").value||"Afspraak",date:document.getElementById("fDate").value,allDay,startTime:allDay?"":start,endTime:allDay?"":end});
  }
  if(t==="shopping"){ const v=document.getElementById("fItem").value.trim(); if(v)state.shopping.push(v); }
  if(t==="editShopping"){
    const i=Number(modal.dataset.editId);
    const v=document.getElementById("fEditShopping").value.trim();
    if(v && state.shopping[i]!==undefined) state.shopping[i]=v;
  }
  if(t==="budgetAdjust"){
    const kind=modal.dataset.editId;
    const target=Number(document.getElementById("fBudgetTarget").value);
    if(!Number.isFinite(target)){ alert("Vul een geldig bedrag in."); return; }
    const totals=budgetTotals(budgetMonth);
    const current=kind==="remaining"?totals.remaining:totals.totalExpenses;
    const delta=target-current;
    const txType=kind==="remaining"?"budget_adjustment":"expense_adjustment";
    const date=budgetMonth===todayISO().slice(0,7)?todayISO():budgetMonth+"-01";
    let correction=(state.transactions||[]).find(x=>x.type===txType && (x.date||"").startsWith(budgetMonth));
    if(correction){
      correction.amount=Number(correction.amount||0)+delta;
      if(Math.abs(correction.amount)<0.005) state.transactions=state.transactions.filter(x=>x!==correction);
    }else if(Math.abs(delta)>=0.005){
      state.transactions.push({
        id:Date.now(),
        type:txType,
        amount:delta,
        date,
        description:kind==="remaining"?"Handmatige correctie budgetruimte":"Handmatige correctie uitgaven",
        label:kind==="remaining"?"Budgetcorrectie":"Uitgavencorrectie"
      });
    }
  }
  if(t==="cleaning"){
    const v=document.getElementById("fTask").value.trim();
    const mode=document.getElementById("fRepeatType").value;
    if(v){
      const task={id:Date.now(),task:v,freq:"Aangepast",done:false};
      if(mode==="weekly"){ task.repeatType="weekly"; task.days=[...document.querySelectorAll('input[name="newWeekDay"]:checked')].map(x=>x.value); }
      else { task.repeatType="monthly"; task.monthDays=[...new Set([...document.querySelectorAll('input[name="newMonthDay"]')].map(x=>Math.max(1,Math.min(31,Number(x.value||1)))))].sort((a,b)=>a-b); }
      state.cleaning.push(task);
    }
  }
  if(t==="cleanDays"){
    const id=Number(modal.dataset.editId), task=state.cleaning.find(x=>x.id===id);
    if(task){
      const mode=document.getElementById("editRepeatType").value;
      if(mode==="weekly"){ task.repeatType="weekly"; task.days=[...document.querySelectorAll('input[name="editWeekDay"]:checked')].map(x=>x.value); task.monthDays=[]; }
      else { task.repeatType="monthly"; task.monthDays=[...new Set([...document.querySelectorAll('input[name="editMonthDay"]')].map(x=>Math.max(1,Math.min(31,Number(x.value||1)))))].sort((a,b)=>a-b); task.days=[]; }
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
()=>`<h2>Over jou</h2><div class="form-grid"><label>Hoe mogen we je noemen?<input id="obName" value="${profile.name}" placeholder="Voornaam"></label><label>Geboortedatum<input id="obBirthdate" type="date" value="${profile.birthdate||""}"></label><label>Voor hoeveel personen plan je?<input id="obPeople" type="number" min="1" max="12" value="${profile.people}"></label><label>Eetvoorkeur<select id="obDiet">${["Geen voorkeur","Vegetarisch","Vegan","Halal","Glutenvrij","Lactosevrij"].map(x=>`<option ${profile.diet===x?"selected":""}>${x}</option>`).join("")}</select></label></div>`,
()=>`<h2>Je geld</h2><p class="eyebrow">Hiermee maken we je budgetoverzicht persoonlijk.</p><div class="form-grid"><label>Netto inkomen per maand (€)<input id="obIncome" type="number" value="${profile.income}"></label><label>Vaste lasten per maand (€)<input id="obFixed" type="number" value="${profile.fixed}"></label><label>Gewenst sparen per maand (€)<input id="obSavings" type="number" value="${profile.savingsGoal}"></label></div>`,
()=>`<h2>Je weekritme</h2><p class="eyebrow">Selecteer je gebruikelijke werk-/studiedagen.</p><div class="choice-grid">${Object.keys(state.meals).map(d=>`<label class="choice"><input type="checkbox" name="workday" value="${d}" ${profile.workDays.includes(d)?"checked":""}>${d}</label>`).join("")}</div>`,
()=>`<h2>Je huis</h2><p class="eyebrow">Welke ruimtes wil je in het schoonmaakschema?</p><div class="choice-grid">${["Keuken","Woonkamer","Badkamer","Slaapkamer","Toilet","Hal","Werkkamer","Balkon/tuin"].map(r=>`<label class="choice"><input type="checkbox" name="room" value="${r}" ${profile.rooms.includes(r)?"checked":""}>${r}</label>`).join("")}</div><div class="form-grid"><label>Hoe uitgebreid wil je schoonmaken?<select id="obClean"><option ${profile.cleaningLevel==="Licht"?"selected":""}>Licht</option><option ${profile.cleaningLevel==="Normaal"?"selected":""}>Normaal</option><option ${profile.cleaningLevel==="Uitgebreid"?"selected":""}>Uitgebreid</option></select></label></div>`,
()=>`<div class="onboard-hero"><h2>Je app is klaar</h2><p>Je kunt alles later aanpassen via de <strong>Profiel</strong>-tab.</p><div class="card settings-card"><span>Budget op basis van jouw inkomen</span><span>Maaltijden voor ${profile.people} persoon/personen</span><span>Jouw weekritme</span><span>Schoonmaak voor jouw ruimtes</span></div></div>`
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
    profile.birthdate=document.getElementById("obBirthdate").value;
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
