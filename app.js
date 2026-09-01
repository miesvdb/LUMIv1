
const COLORS = {home:"#3154c7",budget:"#55a83d",meals:"#e77b12",agenda:"#7d48d6",cleaning:"#efb400"};

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

const content = document.getElementById("content");
const pageTitle = document.getElementById("pageTitle");
const todayLabel = document.getElementById("todayLabel");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const modalTitle = document.getElementById("modalTitle");

function save(){ localStorage.setItem("mijnLevenState", JSON.stringify(state)); }
function euro(n){ return new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR"}).format(n); }
function dateNL(d=new Date()){ return d.toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"}); }

function render(){
  document.documentElement.style.setProperty("--active", COLORS[currentPage]);
  todayLabel.textContent = dateNL();
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active", b.dataset.page===currentPage));
  const titleMap={home:"Mijn Leven",budget:"Budget",meals:"Maaltijdplanner",agenda:"Agenda",cleaning:"Schoonmaakschema"};
  pageTitle.textContent = titleMap[currentPage];
  content.innerHTML = ({home:homePage,budget:budgetPage,meals:mealsPage,agenda:agendaPage,cleaning:cleaningPage})[currentPage]();
  bindPageEvents();
}

function homePage(){
  const today = new Date().toISOString().slice(0,10);
  const appts = state.agenda.filter(a=>a.date===today).sort((a,b)=>a.time.localeCompare(b.time));
  const pending = state.cleaning.filter(x=>!x.done);
  const budgetSpent = state.budgets.reduce((s,x)=>s+x.spent,0);
  const budgetTotal = state.budgets.reduce((s,x)=>s+x.limit,0);
  const dinner = state.meals[Object.keys(state.meals)[Math.min(new Date().getDay()-1,6)] || "Maandag"]?.Diner || "Nog niet gepland";
  return `
    <section class="hero theme-blue">
      <h2>Goedemorgen <span class="hand">✨</span></h2>
      <p>Alles wat vandaag aandacht nodig heeft, op één plek.</p>
      <div class="scribble">☕</div>
    </section>
    <div class="grid2">
      <div class="stat"><small>Budget deze maand</small><strong>${euro(budgetTotal-budgetSpent)}</strong><small>nog beschikbaar</small></div>
      <div class="stat"><small>Boodschappenlijst</small><strong>${state.shopping.length}</strong><small>artikelen</small></div>
    </div>
    <div class="section-title"><h3>Vandaag</h3><button class="link-btn" data-go="agenda">bekijk agenda</button></div>
    <div class="list">
      ${appts.length?appts.map(a=>row("#7d48d6","▣",`${a.time} · ${a.title}`,"Agenda")).join(""):`<div class="empty">Geen afspraken vandaag.</div>`}
      ${row("#e77b12","☕",`Vanavond: ${dinner}`,"Maaltijd")}
      ${pending[0]?row("#efb400","✦",pending[0].task,pending[0].freq):""}
    </div>
    <div class="section-title"><h3>Snel toevoegen</h3></div>
    <div class="fab-row">
      <button class="action-btn" data-add="expense">＋ Uitgave</button>
      <button class="action-btn" data-add="agenda">＋ Afspraak</button>
      <button class="action-btn" data-add="shopping">＋ Boodschap</button>
      <button class="action-btn" data-add="cleaning">＋ Schoonmaak</button>
    </div>`;
}

function budgetPage(){
  const total = state.budgets.reduce((s,x)=>s+x.limit,0);
  const spent = state.budgets.reduce((s,x)=>s+x.spent,0);
  const free = state.income - state.fixed - spent;
  return `
    <section class="hero theme-green">
      <h2>Budget <span class="hand">in control</span></h2>
      <p>Na vaste lasten en geregistreerde uitgaven heb je ${euro(free)} over.</p>
      <div class="scribble">€</div>
    </section>
    <div class="grid2">
      <div class="stat"><small>Inkomen</small><strong>${euro(state.income)}</strong></div>
      <div class="stat"><small>Vaste lasten</small><strong>${euro(state.fixed)}</strong></div>
    </div>
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

function mealsPage(){
  return `
    <section class="hero theme-orange">
      <h2>Maaltijd<span class="hand">planner</span></h2>
      <p>Plan je week en houd je boodschappen automatisch bij.</p>
      <div class="scribble">♡</div>
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

function agendaPage(){
  const d=new Date(); const days=[...Array(7)].map((_,i)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+i));
  const items=[...state.agenda].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  return `
    <section class="hero theme-purple">
      <h2>Mijn <span class="hand">agenda</span></h2>
      <p>Afspraken en taken zonder overvolle kalender.</p>
      <div class="scribble">✎</div>
    </section>
    <div class="calendar-strip">
      ${days.map((x,i)=>`<div class="date-cell ${i===0?"active":""}"><small>${x.toLocaleDateString("nl-NL",{weekday:"short"}).slice(0,2)}</small><strong>${x.getDate()}</strong></div>`).join("")}
    </div>
    <div class="section-title"><h3>Komende afspraken</h3><button class="link-btn" data-add="agenda">＋ afspraak</button></div>
    <div class="list">
      ${items.length?items.map(a=>`<div class="row"><div class="badge theme-purple">▣</div><div class="row-main"><strong>${a.title}</strong><small>${new Date(a.date+"T12:00").toLocaleDateString("nl-NL",{weekday:"short",day:"numeric",month:"short"})} · ${a.time}</small></div><button class="link-btn" data-delete-agenda="${a.id}">wis</button></div>`).join(""):`<div class="empty">Nog geen afspraken.</div>`}
    </div>`;
}

function cleaningPage(){
  const done=state.cleaning.filter(x=>x.done).length;
  return `
    <section class="hero theme-yellow">
      <h2>Schoonmaak<span class="hand">schema</span></h2>
      <p>${done} van ${state.cleaning.length} taken afgerond.</p>
      <div class="scribble">✦</div>
    </section>
    <div class="section-title"><h3>Taken</h3><button class="link-btn" data-add="cleaning">＋ taak</button></div>
    <div class="list">
      ${state.cleaning.map(x=>`<label class="row"><input class="check" type="checkbox" data-clean="${x.id}" ${x.done?"checked":""}><div class="row-main"><strong>${x.task}</strong><small>${x.freq}</small></div></label>`).join("")}
    </div>`;
}
function row(color,icon,title,sub){return `<div class="row"><div class="badge" style="background:${color}">${icon}</div><div class="row-main"><strong>${title}</strong><small>${sub}</small></div></div>`}

function bindPageEvents(){
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{currentPage=b.dataset.go;render();});
  document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>openModal(b.dataset.add));
  document.querySelectorAll("[data-expense-cat]").forEach(b=>b.onclick=()=>openModal("expense",Number(b.dataset.expenseCat)));
  document.querySelectorAll("[data-remove-shopping]").forEach(b=>b.onclick=()=>{state.shopping.splice(Number(b.dataset.removeShopping),1);save();render();});
  document.querySelectorAll("[data-delete-agenda]").forEach(b=>b.onclick=()=>{state.agenda=state.agenda.filter(a=>a.id!==Number(b.dataset.deleteAgenda));save();render();});
  document.querySelectorAll("[data-clean]").forEach(c=>c.onchange=()=>{const x=state.cleaning.find(t=>t.id===Number(c.dataset.clean)); if(x){x.done=c.checked;save();render();}});
}

function openModal(type, catIndex=null){
  const fields={
    expense:{title:"Uitgave toevoegen",html:`<div class="form-grid"><label>Categorie<select id="fCat">${state.budgets.map((b,i)=>`<option value="${i}" ${i===catIndex?"selected":""}>${b.name}</option>`).join("")}</select></label><label>Bedrag<input id="fAmount" type="number" step="0.01" min="0" placeholder="0,00"></label></div>`},
    agenda:{title:"Afspraak toevoegen",html:`<div class="form-grid"><label>Titel<input id="fTitle" placeholder="Bijv. tandarts"></label><label>Datum<input id="fDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Tijd<input id="fTime" type="time" value="09:00"></label></div>`},
    shopping:{title:"Boodschap toevoegen",html:`<div class="form-grid"><label>Artikel<input id="fItem" placeholder="Bijv. tomaten"></label></div>`},
    cleaning:{title:"Schoonmaaktaak toevoegen",html:`<div class="form-grid"><label>Taak<input id="fTask" placeholder="Bijv. koelkast schoonmaken"></label><label>Frequentie<select id="fFreq"><option>Dagelijks</option><option>2× per week</option><option>Wekelijks</option><option>Elke 2 weken</option><option>Maandelijks</option></select></label></div>`},
    budgetcat:{title:"Budgetcategorie toevoegen",html:`<div class="form-grid"><label>Naam<input id="fName" placeholder="Bijv. Kleding"></label><label>Maandbudget<input id="fLimit" type="number" min="0" step="1" placeholder="100"></label></div>`},
    meal:{title:"Maaltijd bewerken",html:`<div class="form-grid"><label>Dag<select id="fDay">${Object.keys(state.meals).map(d=>`<option>${d}</option>`).join("")}</select></label><label>Moment<select id="fSlot"><option>Ontbijt</option><option>Lunch</option><option>Diner</option></select></label><label>Maaltijd<input id="fMeal" placeholder="Bijv. pasta pesto"></label></div>`}
  };
  modalTitle.textContent=fields[type].title;
  modalBody.innerHTML=fields[type].html;
  modal.dataset.type=type;
  modal.showModal();
}

document.getElementById("modalForm").addEventListener("submit",e=>{
  e.preventDefault();
  const t=modal.dataset.type;
  if(t==="expense"){ const i=Number(document.getElementById("fCat").value); const a=Number(document.getElementById("fAmount").value||0); state.budgets[i].spent += a; }
  if(t==="agenda"){ state.agenda.push({id:Date.now(),title:document.getElementById("fTitle").value||"Afspraak",date:document.getElementById("fDate").value,time:document.getElementById("fTime").value}); }
  if(t==="shopping"){ const v=document.getElementById("fItem").value.trim(); if(v)state.shopping.push(v); }
  if(t==="cleaning"){ const v=document.getElementById("fTask").value.trim(); if(v)state.cleaning.push({id:Date.now(),task:v,freq:document.getElementById("fFreq").value,done:false}); }
  if(t==="budgetcat"){ const n=document.getElementById("fName").value.trim(); const l=Number(document.getElementById("fLimit").value||0); if(n)state.budgets.push({name:n,limit:l,spent:0}); }
  if(t==="meal"){ const d=document.getElementById("fDay").value,s=document.getElementById("fSlot").value,m=document.getElementById("fMeal").value.trim(); if(m)state.meals[d][s]=m; }
  save(); modal.close(); render();
});

document.getElementById("quickAddBtn").onclick=()=>openModal(currentPage==="home"?"agenda":({budget:"expense",meals:"meal",agenda:"agenda",cleaning:"cleaning"})[currentPage]);
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{currentPage=b.dataset.page;render();});
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
render();
