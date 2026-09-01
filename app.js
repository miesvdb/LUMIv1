
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
let profile = JSON.parse(localStorage.getItem("mijnLevenProfile") || "null") || {
  completed:false,name:"",income:2600,fixed:1510,savingsGoal:200,
  workDays:["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag"],
  diet:"Geen voorkeur",people:1,
  rooms:["Keuken","Woonkamer","Badkamer","Slaapkamer"],
  cleaningLevel:"Normaal"
};
let onboardIndex = 0;
const DAY_NAMES=["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
function todayISO(){ return new Date().toISOString().slice(0,10); }
function todayName(){ return DAY_NAMES[new Date().getDay()]; }
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
  state.cleaning=state.cleaning||[];
  state.cleaning.forEach((x,i)=>{
    x.id=x.id||Date.now()+i;
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
  const titleMap={home:"Lumi",budget:"Budget",meals:"Maaltijdplanner",agenda:"Agenda",cleaning:"Schoonmaakschema"};
  pageTitle.textContent = titleMap[currentPage];
  content.innerHTML = ({home:homePage,budget:budgetPage,meals:mealsPage,agenda:agendaPage,cleaning:cleaningPage})[currentPage]();
  bindPageEvents();
}

function homePage(){
  const today = todayISO();
  const appts = state.agenda.filter(a=>a.date===today).sort((a,b)=>a.time.localeCompare(b.time));
  const cleaningToday = state.cleaning.filter(x=>(x.days||[]).includes(todayName()));
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
      <div class="stat"><small>Budget deze maand</small><strong>${euro(budgetTotal-budgetSpent)}</strong><small>nog beschikbaar</small></div>
      <div class="stat"><small>Boodschappenlijst</small><strong>${state.shopping.length}</strong><small>artikelen</small></div>
    </div>
    <div class="section-title"><h3>Vandaag</h3><button class="link-btn" data-go="agenda">bekijk agenda</button></div>
    <div class="list">
      ${appts.map(a=>taskRow("agenda",a.id,`${a.time} · ${a.title}`,"Agenda","#7d48d6")).join("")}
      ${taskRow("meal","dinner",`Vanavond: ${dinner}`,"Maaltijd","#e77b12")}
      ${cleaningToday.map(x=>taskRow("clean",x.id,x.task,(x.days||[]).join(", "),"#efb400")).join("")}
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
  return `<div class="card chart-card"><div class="section-title"><h3>Inkomsten en uitgaven</h3><span class="pill">6 maanden</span></div><div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafiek inkomsten en uitgaven"><line class="chart-grid" x1="24" y1="160" x2="548" y2="160"/>${bars}</svg></div><div class="chart-legend"><span><i class="legend-dot" style="background:#55a83d"></i>Inkomsten</span><span><i class="legend-dot" style="background:#d6a23a"></i>Uitgaven</span></div></div>`;
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

function agendaPage(){
  const d=new Date(); const days=[...Array(7)].map((_,i)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+i));
  const items=[...state.agenda].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  return `
    <section class="hero theme-purple">
      <h2>Mijn <span class="brand-script">agenda</span></h2>
      <p>Afspraken en taken zonder overvolle kalender.</p>
      <div class="decor-letter">A</div>
    </section>
    <div class="calendar-strip">
      ${days.map((x,i)=>`<div class="date-cell ${i===0?"active":""}"><small>${x.toLocaleDateString("nl-NL",{weekday:"short"}).slice(0,2)}</small><strong>${x.getDate()}</strong></div>`).join("")}
    </div>
    <div class="section-title"><h3>Komende afspraken</h3><button class="link-btn" data-add="agenda">＋ afspraak</button></div>
    <div class="list">
      ${items.length?items.map(a=>`<div class="row task-row ${isDone("agenda",a.id,a.date)?"done":""}"><input class="task-check" type="checkbox" data-agenda-done="${a.id}" data-agenda-date="${a.date}" ${isDone("agenda",a.id,a.date)?"checked":""}><div class="row-main"><strong>${a.title}</strong><small>${new Date(a.date+"T12:00").toLocaleDateString("nl-NL",{weekday:"short",day:"numeric",month:"short"})} · ${a.time}</small></div><button class="link-btn" data-delete-agenda="${a.id}">wis</button></div>`).join(""):`<div class="empty">Nog geen afspraken.</div>`}
    </div>`;
}

function cleaningPage(){
  const today=todayName();
  const due=state.cleaning.filter(x=>(x.days||[]).includes(today));
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
        <div class="row-main"><strong>${x.task}</strong><small>${(x.days||[]).join(" · ")}</small></div>
        <button class="link-btn" data-edit-clean="${x.id}">dagen</button>
      </div>`).join("")}
    </div>`;
}
function row(color,icon,title,sub){return `<div class="row"><span style="width:5px;height:38px;border-radius:99px;background:${color}"></span><div class="row-main"><strong>${title}</strong><small>${sub}</small></div></div>`}

function bindPageEvents(){
  document.querySelectorAll("[data-settings]").forEach(b=>b.onclick=()=>startOnboarding(true));
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
    agenda:{title:"Afspraak toevoegen",html:`<div class="form-grid"><label>Titel<input id="fTitle" placeholder="Bijv. tandarts"></label><label>Datum<input id="fDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Tijd<input id="fTime" type="time" value="09:00"></label></div>`},
    shopping:{title:"Boodschap toevoegen",html:`<div class="form-grid"><label>Artikel<input id="fItem" placeholder="Bijv. tomaten"></label></div>`},
    cleaning:{title:"Schoonmaaktaak toevoegen",html:`<div class="form-grid"><label>Taak<input id="fTask" placeholder="Bijv. koelkast schoonmaken"></label><label>Op welke dagen?</label><div class="day-picker">${["Ma","Di","Wo","Do","Vr","Za","Zo"].map((d,i)=>`<label class="day-pill"><input type="checkbox" name="cleanDay" value="${["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"][i]}"><span>${d}</span></label>`).join("")}</div></div>`},
    income:{title:"Inkomst toevoegen",html:`<div class="form-grid"><label>Omschrijving<input id="fIncomeLabel" placeholder="Bijv. salaris"></label><label>Bedrag<input id="fIncomeAmount" type="number" step="0.01" min="0"></label><label>Datum<input id="fIncomeDate" type="date" value="${todayISO()}"></label></div>`},
    cleanDays:{title:"Schoonmaakdagen aanpassen",html:`<div class="form-grid"><p class="subtle">Kies de dagen waarop deze taak op je Vandaag-scherm moet verschijnen.</p><div class="day-picker" id="editDays"></div></div>`},
    budgetcat:{title:"Budgetcategorie toevoegen",html:`<div class="form-grid"><label>Naam<input id="fName" placeholder="Bijv. Kleding"></label><label>Maandbudget<input id="fLimit" type="number" min="0" step="1" placeholder="100"></label></div>`},
    meal:{title:"Maaltijd bewerken",html:`<div class="form-grid"><label>Dag<select id="fDay">${Object.keys(state.meals).map(d=>`<option>${d}</option>`).join("")}</select></label><label>Moment<select id="fSlot"><option>Ontbijt</option><option>Lunch</option><option>Diner</option></select></label><label>Maaltijd<input id="fMeal" placeholder="Bijv. pasta pesto"></label></div>`}
  };
  modalTitle.textContent=fields[type].title;
  modalBody.innerHTML=fields[type].html;
  modal.dataset.type=type;
  modal.dataset.editId=catIndex??"";
  if(type==="cleanDays"){
    const task=state.cleaning.find(x=>x.id===catIndex);
    const days=["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"];
    document.getElementById("editDays").innerHTML=days.map(d=>`<label class="day-pill"><input type="checkbox" name="editCleanDay" value="${d}" ${(task.days||[]).includes(d)?"checked":""}><span>${d.slice(0,2)}</span></label>`).join("");
  }
  modal.showModal();
}

document.getElementById("modalForm").addEventListener("submit",e=>{
  e.preventDefault();
  const t=modal.dataset.type;
  if(t==="expense"){ const i=Number(document.getElementById("fCat").value); const a=Number(document.getElementById("fAmount").value||0); state.budgets[i].spent += a; state.transactions.push({id:Date.now(),type:"expense",amount:a,date:todayISO(),label:state.budgets[i].name}); }
  if(t==="income"){ const a=Number(document.getElementById("fIncomeAmount").value||0); const d=document.getElementById("fIncomeDate").value; const l=document.getElementById("fIncomeLabel").value||"Inkomst"; state.transactions.push({id:Date.now(),type:"income",amount:a,date:d,label:l}); }
  if(t==="agenda"){ state.agenda.push({id:Date.now(),title:document.getElementById("fTitle").value||"Afspraak",date:document.getElementById("fDate").value,time:document.getElementById("fTime").value}); }
  if(t==="shopping"){ const v=document.getElementById("fItem").value.trim(); if(v)state.shopping.push(v); }
  if(t==="cleaning"){ const v=document.getElementById("fTask").value.trim(); const days=[...document.querySelectorAll('input[name="cleanDay"]:checked')].map(x=>x.value); if(v)state.cleaning.push({id:Date.now(),task:v,freq:"Op gekozen dagen",days,done:false}); }
  if(t==="cleanDays"){ const id=Number(modal.dataset.editId); const task=state.cleaning.find(x=>x.id===id); if(task)task.days=[...document.querySelectorAll('input[name="editCleanDay"]:checked')].map(x=>x.value); }
  if(t==="budgetcat"){ const n=document.getElementById("fName").value.trim(); const l=Number(document.getElementById("fLimit").value||0); if(n)state.budgets.push({name:n,limit:l,spent:0}); }
  if(t==="meal"){ const d=document.getElementById("fDay").value,s=document.getElementById("fSlot").value,m=document.getElementById("fMeal").value.trim(); if(m)state.meals[d][s]=m; }
  save(); modal.close(); render();
});

document.getElementById("quickAddBtn").onclick=()=>openModal(currentPage==="home"?"agenda":({budget:"expense",meals:"meal",agenda:"agenda",cleaning:"cleaning"})[currentPage]);
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
