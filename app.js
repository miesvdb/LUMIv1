
const COLORS = {home:"#A5BCD6",budget:"#4A2E27",meals:"#F5EFC6",shopping:"#F5EFC6",agenda:"#4D0E12",cleaning:"#A5BCD6",children:"#AAB8A0",profile:"#231815"};

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
  budgetCorrections: {},
  categoryCorrections: {},
  children: [],
  mealIngredients: {},
  meals: {
    Maandag:{Ontbijt:"Overnight oats",Lunch:"Salade",Diner:"Pasta pesto"},
    Dinsdag:{Ontbijt:"Yoghurt & fruit",Lunch:"Wrap met hummus",Diner:"Roerbakgroenten"},
    Woensdag:{Ontbijt:"Smoothie",Lunch:"Tosti",Diner:"Zoete-aardappelcurry"},
    Donderdag:{Ontbijt:"Pannenkoekjes",Lunch:"Quinoabowl",Diner:"Zalm met rijst"},
    Vrijdag:{Ontbijt:"Avocadotoast",Lunch:"Tomatensoep",Diner:"Zelfgemaakte pizza"},
    Zaterdag:{Ontbijt:"Vrij",Lunch:"Vrij",Diner:"Vrij"},
    Zondag:{Ontbijt:"Vrij",Lunch:"Vrij",Diner:"Vrij"}
  },
  shopping:[
    {id:11,text:"havermout",done:false},
    {id:12,text:"tomaten",done:false},
    {id:13,text:"pasta",done:false},
    {id:14,text:"pesto",done:false},
    {id:15,text:"yoghurt",done:false}
  ],
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
  cleaningLevel:"Normaal",
  childrenEnabled:false
};
if(profile.birthdate===undefined) profile.birthdate="";
if(profile.childrenEnabled===undefined) profile.childrenEnabled=false;
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

function shoppingItemText(item){ return typeof item==="string" ? item : (item?.text||""); }
function mealKey(day,slot){ return `${day}|${slot}`; }
function getMealIngredients(day,slot){ return (state.mealIngredients||{})[mealKey(day,slot)]||[]; }
function setMealIngredients(day,slot,items){
  state.mealIngredients=state.mealIngredients||{};
  state.mealIngredients[mealKey(day,slot)]=items.map(x=>x.trim()).filter(Boolean);
}
function profileMealHint(){
  const people=Math.max(1,Number(profile.people||1));
  const diet=profile.diet&&profile.diet!=="Geen voorkeur" ? ` · ${profile.diet.toLowerCase()}` : "";
  return `Voor ${people} ${people===1?"persoon":"personen"}${diet}`;
}
function preferredCleaningDay(){
  const all=["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"];
  return all.find(d=>!(profile.workDays||[]).includes(d)) || "Zaterdag";
}
function syncProfileCleaningSuggestions(){
  const level=profile.cleaningLevel||"Normaal";
  const roomTemplates={
    "Keuken":["Keuken oppervlakken","Keukenvloer"],
    "Woonkamer":["Woonkamer stofzuigen","Woonkamer afstoffen"],
    "Badkamer":["Badkamer schoonmaken"],
    "Slaapkamer":["Slaapkamer stofzuigen","Bed verschonen"],
    "Toilet":["Toilet schoonmaken"],
    "Hal":["Hal stofzuigen"],
    "Werkkamer":["Werkkamer afstoffen"],
    "Balkon/tuin":["Balkon/tuin bijhouden"]
  };
  const limit=level==="Licht"?1:level==="Uitgebreid"?2:1;
  const wanted=[];
  (profile.rooms||[]).forEach(room=>{
    (roomTemplates[room]||[]).slice(0,limit).forEach(task=>wanted.push({room,task}));
  });
  state.cleaning=(state.cleaning||[]).filter(x=>!x.profileGenerated || wanted.some(w=>w.task===x.task));
  wanted.forEach((w,i)=>{
    if(!state.cleaning.some(x=>x.profileGenerated && x.task===w.task)){
      state.cleaning.push({
        id:Date.now()+1000+i,
        task:w.task,
        room:w.room,
        profileGenerated:true,
        repeatType:"weekly",
        days:[preferredCleaningDay()],
        monthDays:[],
        freq:"Aangepast",
        done:false
      });
    }
  });
}


function normalizeChild(child,index=0){
  return {
    id:Number(child?.id)||Date.now()+index,
    name:child?.name||`Kind ${index+1}`,
    birthdate:child?.birthdate||"",
    plans:Array.isArray(child?.plans)?child.plans:[],
    foodLogs:Array.isArray(child?.foodLogs)?child.foodLogs:[],
    foodFavorites:Array.isArray(child?.foodFavorites)?child.foodFavorites:[],
    carryItems:Array.isArray(child?.carryItems)?child.carryItems:[],
    routines:Array.isArray(child?.routines)?child.routines:[],
    notes:Array.isArray(child?.notes)?child.notes:[],
    mealPlan:child?.mealPlan && typeof child.mealPlan==="object" ? child.mealPlan : {}
  };
}
function childById(id){ return (state.children||[]).find(c=>Number(c.id)===Number(id)); }
function selectedChild(){
  const children=state.children||[];
  if(!children.length) return null;
  const saved=Number(localStorage.getItem("lumiSelectedChild")||0);
  return childById(saved)||children[0];
}
function selectChild(id){ localStorage.setItem("lumiSelectedChild",String(id)); }
function childAge(child){
  if(!child?.birthdate) return "";
  const b=dateObj(child.birthdate), n=new Date();
  let years=n.getFullYear()-b.getFullYear();
  let months=n.getMonth()-b.getMonth();
  if(n.getDate()<b.getDate()) months--;
  if(months<0){years--;months+=12;}
  if(years<2) return `${Math.max(0,years*12+months)} maanden`;
  return `${Math.max(0,years)} jaar`;
}
function nextDateForWeekday(dayName, from=new Date()){
  const target=DAY_NAMES.indexOf(dayName);
  const d=new Date(from.getFullYear(),from.getMonth(),from.getDate(),12);
  const diff=(target-d.getDay()+7)%7;
  d.setDate(d.getDate()+diff);
  return isoLocal(d);
}
function childItemDueOn(item, iso=todayISO()){
  if(item.date===iso) return true;
  if(!item.repeatWeekly) return false;
  return item.weekday===DAY_NAMES[dateObj(iso).getDay()];
}
function childPlansOn(child,iso){
  return (child?.plans||[]).filter(p=>childItemDueOn(p,iso));
}
function childCarryOn(child,iso){
  return (child?.carryItems||[]).filter(p=>childItemDueOn(p,iso));
}
function childRoutinesOn(child,iso){
  const day=DAY_NAMES[dateObj(iso).getDay()];
  return (child?.routines||[]).filter(r=>!(r.days||[]).length || (r.days||[]).includes(day));
}
function childFoodOn(child,iso){
  return (child?.foodLogs||[]).filter(f=>f.date===iso);
}

function childFoodMoment(child,iso,moment){
  return (child?.foodLogs||[]).find(f=>f.date===iso && f.moment===moment)||null;
}
function childFoodMoments(){
  return ["Ontbijt","Tussendoor","Lunch","Tussendoor 2","Avondeten"];
}
function childFoodProgress(child,iso=todayISO()){
  const total=childFoodMoments().length;
  const filled=childFoodMoments().filter(m=>!!childFoodMoment(child,iso,m)).length;
  return {filled,total};
}
function childFoodHistory(child,days=7){
  const rows=[];
  for(let i=0;i<days;i++){
    const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-i);
    const iso=isoLocal(d);
    rows.push({iso,date:d,logs:childFoodOn(child,iso)});
  }
  return rows;
}
function saveChildFavorite(child,text){
  const value=(text||"").trim();
  if(!value) return;
  child.foodFavorites=Array.isArray(child.foodFavorites)?child.foodFavorites:[];
  if(!child.foodFavorites.some(x=>x.toLowerCase()===value.toLowerCase())){
    child.foodFavorites.unshift(value);
    child.foodFavorites=child.foodFavorites.slice(0,12);
  }
}
function familyDinnerForDate(iso){
  const d=dateObj(iso);
  const day=DAY_NAMES[d.getDay()];
  return state.meals?.[day]?.Diner||"";
}

function childMealForDay(child,dayName){
  return child?.mealPlan?.[dayName]||"";
}
function childAgendaItemsForView(){
  if(!profile.childrenEnabled) return [];
  let start,end;
  if(agendaView==="week"){
    start=startOfWeek(agendaCursor); end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+6,12);
  }else if(agendaView==="month"){
    start=new Date(agendaCursor.getFullYear(),agendaCursor.getMonth(),1,12);
    end=new Date(agendaCursor.getFullYear(),agendaCursor.getMonth()+1,0,12);
  }else{
    start=new Date(agendaCursor.getFullYear(),0,1,12); end=new Date(agendaCursor.getFullYear(),11,31,12);
  }
  const items=[];
  (state.children||[]).forEach(child=>{
    for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
      const iso=isoLocal(d);
      childPlansOn(child,iso).forEach(p=>items.push({
        id:`child-${child.id}-${p.id}-${iso}`,
        date:iso,
        title:`${child.name}: ${p.title}`,
        allDay:!!p.allDay,
        startTime:p.allDay?"":(p.startTime||""),
        endTime:p.allDay?"":(p.endTime||""),
        childVirtual:true,
        childId:child.id,
        childPlanId:p.id,
        location:p.location||""
      }));
    }
  });
  return items;
}
function ensureChildrenNav(){
  const nav=document.querySelector(".bottom-nav");
  if(!nav) return;
  let btn=nav.querySelector('[data-page="children"]');
  if(profile.childrenEnabled){
    if(!btn){
      btn=document.createElement("button");
      btn.className="nav-item";
      btn.dataset.page="children";
      btn.innerHTML='<span class="nav-mark">K</span><small>Kinderen</small>';
      const profileBtn=nav.querySelector('[data-page="profile"]');
      nav.insertBefore(btn,profileBtn);
      btn.onclick=()=>{currentPage="children";render();};
    }
  }else if(btn){
    btn.remove();
    if(currentPage==="children") currentPage="home";
  }
  const count=nav.querySelectorAll(".nav-item").length;
  nav.style.setProperty("--nav-count",String(count));
  nav.dataset.count=String(count);
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

  state.budgetCorrections=state.budgetCorrections && typeof state.budgetCorrections==="object" ? state.budgetCorrections : {};
  state.categoryCorrections=state.categoryCorrections && typeof state.categoryCorrections==="object" ? state.categoryCorrections : {};
  state.children=Array.isArray(state.children)?state.children.map(normalizeChild):[];
  state.mealIngredients=state.mealIngredients && typeof state.mealIngredients==="object" ? state.mealIngredients : {};
  state.shopping=Array.isArray(state.shopping)?state.shopping:[];
  state.shopping=state.shopping.map((x,i)=>typeof x==="string"?{id:Date.now()+i,text:x,done:false}:{id:x.id||Date.now()+i,text:x.text||"",done:!!x.done});

  if((state.qualitySchemaVersion||0)<1){
    // Oude budgetcorrecties migreren naar een aparte correctielaag, zodat ze inkomen niet vervalsen.
    (state.transactions||[]).filter(t=>["budget_adjustment","expense_adjustment"].includes(t.type)).forEach(t=>{
      const month=(t.date||todayISO()).slice(0,7);
      state.budgetCorrections[month]=state.budgetCorrections[month]||{remaining:0,expenses:0};
      if(t.type==="budget_adjustment") state.budgetCorrections[month].remaining += Number(t.amount||0);
      if(t.type==="expense_adjustment") state.budgetCorrections[month].expenses += Number(t.amount||0);
    });
    state.transactions=(state.transactions||[]).filter(t=>!["budget_adjustment","expense_adjustment"].includes(t.type));
    state.qualitySchemaVersion=1;
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
  ensureChildrenNav();
  document.documentElement.style.setProperty("--active", COLORS[currentPage]||COLORS.home);
  todayLabel.textContent = dateNL();
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active", b.dataset.page===currentPage || (currentPage==="shopping" && b.dataset.page==="meals")));
  const titleMap={home:"Lumi",budget:"Budget",meals:"Maaltijdplanner",shopping:"Boodschappenlijst",agenda:"Agenda",cleaning:"Schoonmaakschema",children:"Kinderen",profile:"Profiel"};
  pageTitle.textContent = titleMap[currentPage]||"Lumi";
  const pages={home:homePage,budget:budgetPage,meals:mealsPage,shopping:shoppingPage,agenda:agendaPage,cleaning:cleaningPage,children:childrenPage,profile:profilePage};
  content.innerHTML = (pages[currentPage]||homePage)();
  bindPageEvents();
}

function homePage(){
  const today = todayISO();
  const appts = state.agenda.filter(a=>a.date===today).sort((a,b)=>(a.startTime||"00:00").localeCompare(b.startTime||"00:00"));
  const cleaningToday = state.cleaning.filter(x=>cleanDueOn(x,new Date()));
  const currentBudget=budgetTotals(today.slice(0,7));
  const dayMap={0:"Zondag",1:"Maandag",2:"Dinsdag",3:"Woensdag",4:"Donderdag",5:"Vrijdag",6:"Zaterdag"};
  const dinner = state.meals[dayMap[new Date().getDay()]]?.Diner || "Nog niet gepland";

  const childrenToday=profile.childrenEnabled?(state.children||[]).map(child=>({
    child,
    plans:childPlansOn(child,today),
    carry:childCarryOn(child,today),
    routines:childRoutinesOn(child,today),
    food:childFoodOn(child,today),
    meal:childMealForDay(child,dayMap[new Date().getDay()])
  })):[];

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
    ${profile.childrenEnabled && childrenToday.length?`
    <button class="click-card home-child-widget" data-go="children">
      <small>Kinderen vandaag</small>
      <strong>${childrenToday.map(x=>x.child.name).join(" · ")}</strong>
      <span>${childrenToday.reduce((s,x)=>s+x.plans.length,0)} planning · ${childrenToday.reduce((s,x)=>s+x.carry.length,0)} mee · ${childrenToday.reduce((s,x)=>s+x.routines.length,0)} routines</span>
      <span class="go-label">Open kindoverzicht</span>
    </button>`:""}
    <div class="section-title"><h3>Vandaag</h3><button class="link-btn" data-go="agenda">bekijk agenda</button></div>
    <div class="list">
      ${appts.map(a=>taskRow("agenda",a.id,`${a.allDay?"Hele dag":`${a.startTime||a.time||""}${a.endTime?`–${a.endTime}`:""}`} · ${a.title}`,"Agenda","#4D0E12")).join("")}
      ${taskRow("meal","dinner",`Vanavond: ${dinner}`,"Maaltijd","#CDBB80")}
      ${cleaningToday.map(x=>taskRow("clean",x.id,x.task,cleaningScheduleLabel(x),"#A5BCD6")).join("")}
      ${childrenToday.map(({child,plans,carry,routines,food,meal})=>{
        const planRows=plans.map(p=>`<label class="row task-row home-task-child ${isDone("childplan",`${child.id}-${p.id}`,today)?"done":""}">
          <input class="task-check" type="checkbox" data-home-child-plan="${child.id}|${p.id}" ${isDone("childplan",`${child.id}-${p.id}`,today)?"checked":""}>
          <div class="row-main"><strong>${p.allDay?"Hele dag":p.startTime||""} · ${child.name}: ${p.title}</strong><small>${p.location||"Planning kind"}</small></div><span class="pill">Kind</span>
        </label>`).join("");
        const carryRows=carry.map(x=>`<label class="row task-row home-task-child ${isDone("childcarry",`${child.id}-${x.id}`,today)?"done":""}">
          <input class="task-check" type="checkbox" data-home-child-carry="${child.id}|${x.id}" ${isDone("childcarry",`${child.id}-${x.id}`,today)?"checked":""}>
          <div class="row-main"><strong>${child.name}: ${x.text}</strong><small>Meenemen</small></div><span class="pill">Kind</span>
        </label>`).join("");
        const routineRows=routines.map(r=>`<label class="row task-row home-task-child ${isDone("childroutine",`${child.id}-${r.id}`,today)?"done":""}">
          <input class="task-check" type="checkbox" data-home-child-routine="${child.id}|${r.id}" ${isDone("childroutine",`${child.id}-${r.id}`,today)?"checked":""}>
          <div class="row-main"><strong>${r.time?`${r.time} · `:""}${child.name}: ${r.title}</strong><small>Routine</small></div><span class="pill">Kind</span>
        </label>`).join("");
        const mealRow=meal?`<label class="row task-row home-task-child ${isDone("childmeal",child.id,today)?"done":""}">
          <input class="task-check" type="checkbox" data-home-child-meal="${child.id}" ${isDone("childmeal",child.id,today)?"checked":""}>
          <div class="row-main"><strong>${child.name}: avondeten ${meal}</strong><small>Eten</small></div><span class="pill">Kind</span>
        </label>`:"";
        const foodProgress=childFoodProgress(child,today);
        const foodRow=`<button class="row home-task-child home-child-quick-add" type="button" data-home-child-food-open="${child.id}">
          <div class="row-main"><strong>${child.name}: eten ${foodProgress.filled}/${foodProgress.total} ingevuld</strong><small>Tik om het eetoverzicht te openen</small></div><span class="pill">Kind</span>
        </button>`;
        return planRows+carryRows+routineRows+mealRow+foodRow;
      }).join("")}
      ${!appts.length && !cleaningToday.length && !childrenToday.some(x=>x.plans.length||x.carry.length||x.routines.length||x.food.length||x.meal) ? `<div class="empty">Geen extra taken gepland voor vandaag.</div>`:""}
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


function childrenPage(){
  const children=state.children||[];
  const child=selectedChild();
  if(!profile.childrenEnabled){
    return `<div class="empty">De kinderfunctie staat uit. Je kunt hem inschakelen via Profiel.</div>`;
  }
  if(!child){
    return `
      <section class="hero children-hero"><h2>Mijn <span class="brand-script">kinderen</span></h2><p>Houd planning, eten, spullen en routines rustig bij.</p><div class="decor-letter">K</div></section>
      <div class="card children-empty"><h3>Voeg je eerste kind toe</h3><p>Daarna maakt Lumi een persoonlijk dag- en weekoverzicht.</p><button class="primary" data-add-child-profiel>Kind toevoegen</button></div>`;
  }
  const today=todayISO(), dayName=DAY_NAMES[new Date().getDay()];
  const plans=childPlansOn(child,today);
  const carry=childCarryOn(child,today);
  const routines=childRoutinesOn(child,today);
  const foodViewDate=localStorage.getItem("lumiChildFoodDate")||today;
  const food=childFoodOn(child,foodViewDate);
  const todayFood=childFoodOn(child,today);
  const meal=childMealForDay(child,dayName);
  const next7=[...Array(7)].map((_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+i);return d;});
  const foodMoments=childFoodMoments();
  const foodProgress=childFoodProgress(child,foodViewDate);
  const foodHistory=childFoodHistory(child,7);
  return `
    <section class="hero children-hero">
      <h2>Voor <span class="brand-script">${child.name}</span></h2>
      <p>${childAge(child)?childAge(child)+" · ":""}alles wat vandaag en deze week belangrijk is.</p>
      <div class="decor-letter">K</div>
    </section>

    ${children.length>1?`<div class="child-switcher">${children.map(c=>`<button class="${c.id===child.id?"active":""}" data-select-child="${c.id}">${c.name}</button>`).join("")}</div>`:""}

    <div class="card child-today-card">
      <div class="section-title child-card-title"><h3>Vandaag voor ${child.name}</h3><span>${new Date().toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"})}</span></div>
      <div class="child-today-grid">
        <button type="button" class="child-today-action" data-child-today-action="childPlan">
          <small>Planning</small><strong>${plans.length?plans.map(p=>`${p.allDay?"Hele dag":p.startTime||""} ${p.title}`).join(" · "):"Geen afspraak"}</strong><span>Toevoegen of aanpassen</span>
        </button>
        <button type="button" class="child-today-action" data-child-today-food>
          <small>Eten</small><strong>${todayFood.length?`${todayFood.length} moment(en) bijgehouden`:meal?`Gepland: ${meal}`:"Nog niets bijgehouden"}</strong><span>Open eetoverzicht</span>
        </button>
        <button type="button" class="child-today-action" data-child-today-action="childCarry">
          <small>Meenemen</small><strong>${carry.length?carry.map(x=>x.text).join(" · "):"Niets extra"}</strong><span>Item toevoegen</span>
        </button>
        <button type="button" class="child-today-action" data-child-today-action="childRoutine">
          <small>Routine</small><strong>${routines.length?`${routines.filter(r=>isDone("childroutine",`${child.id}-${r.id}`,today)).length}/${routines.length} gedaan`:"Geen routine"}</strong><span>Routine toevoegen</span>
        </button>
      </div>
    </div>

    <div class="section-title"><h3>Weekoverzicht</h3></div>
    <div class="child-week-scroll">
      <div class="child-week-grid">
        ${next7.map(d=>{
          const iso=isoLocal(d), dn=DAY_NAMES[d.getDay()], ps=childPlansOn(child,iso), cs=childCarryOn(child,iso);
          return `<div class="child-week-day ${iso===today?"today":""}">
            <strong>${d.toLocaleDateString("nl-NL",{weekday:"short",day:"numeric"})}</strong>
            <span>${ps.length?ps.map(p=>p.title).join(", "):"—"}</span>
            <small>${cs.length?"Mee: "+cs.map(c=>c.text).join(", "):""}</small>
          </div>`;
        }).join("")}
      </div>
    </div>

    <div class="section-title"><h3>Planning</h3><button class="link-btn" data-child-add="childPlan">Toevoegen</button></div>
    <div class="list">
      ${(child.plans||[]).length?(child.plans||[]).map(p=>`<div class="row child-plan-row">
        <div class="row-main"><strong>${p.title}</strong><small>${p.repeatWeekly?p.weekday:new Date(p.date+"T12:00").toLocaleDateString("nl-NL",{weekday:"short",day:"numeric",month:"short"})} · ${p.allDay?"Hele dag":`${p.startTime||""}${p.endTime?`–${p.endTime}`:""}`}${p.location?` · ${p.location}`:""}${p.dropoffBy?` · brengen: ${p.dropoffBy}`:""}${p.pickupBy?` · ophalen: ${p.pickupBy}`:""}</small></div>
        <button class="link-btn" data-delete-child-item="plans|${p.id}">wis</button>
      </div>`).join(""):`<div class="empty">Nog geen planning voor ${child.name}.</div>`}
    </div>

    <div class="section-title"><h3>Eten & drinken</h3><span>${foodProgress.filled}/${foodProgress.total} ingevuld</span></div>
    <div class="card child-food-dashboard">
      <div class="child-food-datebar">
        <button type="button" class="secondary compact" data-child-food-date="-1">‹</button>
        <div>
          <small>Dagoverzicht</small>
          <strong>${new Date(foodViewDate+"T12:00").toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"})}</strong>
        </div>
        <button type="button" class="secondary compact" data-child-food-date="1">›</button>
      </div>
      ${foodViewDate!==today?`<button type="button" class="link-btn" data-child-food-today>Terug naar vandaag</button>`:""}
      <div class="child-food-progress"><span style="width:${Math.round(foodProgress.filled/foodProgress.total*100)}%"></span></div>

      <div class="child-food-moments">
        ${foodMoments.map(moment=>{
          const f=childFoodMoment(child,foodViewDate,moment);
          const familyDinner=moment==="Avondeten"?familyDinnerForDate(foodViewDate):"";
          return `<button type="button" class="child-food-moment ${f?"filled":""}" data-edit-child-food="${moment}">
            <span class="child-food-moment-main">
              <strong>${moment}</strong>
              <small>${f
                ? `${f.food||"Geen eten ingevuld"} · ${f.amount||"hoeveelheid niet ingevuld"}${f.drink?` · ${f.drink}`:""}`
                : moment==="Avondeten" && familyDinner
                  ? `Nog niet ingevuld · gezinsmaaltijd: ${familyDinner}`
                  : "Nog niet ingevuld"}</small>
              ${f?.note?`<em>${f.note}</em>`:""}
            </span>
            <span class="child-food-edit">${f?"Bewerk":"Vul in"}</span>
          </button>`;
        }).join("")}
      </div>

      ${(child.foodFavorites||[]).length?`
        <div class="child-food-favorites">
          <small>Favorieten</small>
          <div class="ingredient-chips">
            ${(child.foodFavorites||[]).map(x=>`<button type="button" data-child-food-favorite="${x}">${x}</button>`).join("")}
          </div>
        </div>`:""}

      <div class="child-food-history">
        <div class="category-detail-title"><strong>Afgelopen 7 dagen</strong><span>eetmomenten</span></div>
        ${foodHistory.map(day=>{
          const filled=childFoodProgress(child,day.iso).filled;
          return `<button type="button" data-child-food-open-date="${day.iso}" class="child-food-history-row">
            <span>${day.date.toLocaleDateString("nl-NL",{weekday:"short",day:"numeric",month:"short"})}</span>
            <strong>${filled}/${foodProgress.total}</strong>
          </button>`;
        }).join("")}
      </div>
    </div>
    <div class="fab-row child-food-actions">
      <button class="action-btn" type="button" data-child-add="childMealPlan">Weekmenu kind</button>
      <button class="action-btn" type="button" data-child-shopping>Voor ${child.name} aan boodschappen toevoegen</button>
    </div>

    <div class="section-title"><h3>Meenemen</h3><button class="link-btn" data-child-add="childCarry">Item toevoegen</button></div>
    <div class="list">
      ${carry.length?carry.map(x=>`<label class="row task-row child-task ${isDone("childcarry",`${child.id}-${x.id}`,today)?"done":""}">
        <input class="task-check" type="checkbox" data-child-carry-done="${x.id}" ${isDone("childcarry",`${child.id}-${x.id}`,today)?"checked":""}>
        <div class="row-main"><strong>${x.text}</strong><small>${x.repeatWeekly?`Iedere ${x.weekday}`:"Vandaag"}</small></div>
      </label>`).join(""):`<div class="empty">Voor vandaag hoef je niets extra mee te nemen.</div>`}
      ${(child.carryItems||[]).filter(x=>!childItemDueOn(x,today)).slice(0,4).map(x=>`<div class="row"><div class="row-main"><strong>${x.text}</strong><small>${x.repeatWeekly?`Iedere ${x.weekday}`:new Date(x.date+"T12:00").toLocaleDateString("nl-NL",{day:"numeric",month:"short"})}</small></div><button class="link-btn" data-delete-child-item="carryItems|${x.id}">wis</button></div>`).join("")}
    </div>

    <div class="section-title"><h3>Routine</h3><button class="link-btn" data-child-add="childRoutine">Routine toevoegen</button></div>
    <div class="list">
      ${routines.length?routines.map(r=>`<label class="row task-row child-task ${isDone("childroutine",`${child.id}-${r.id}`,today)?"done":""}">
        <input class="task-check" type="checkbox" data-child-routine-done="${r.id}" ${isDone("childroutine",`${child.id}-${r.id}`,today)?"checked":""}>
        <div class="row-main"><strong>${r.title}</strong><small>${r.time||""}${(r.days||[]).length?` · ${(r.days||[]).join(", ")}`:" · iedere dag"}</small></div>
      </label>`).join(""):`<div class="empty">Nog geen routines ingesteld.</div>`}
    </div>

    <div class="section-title"><h3>Notities</h3><button class="link-btn" data-child-add="childNote">Notitie</button></div>
    <div class="list">
      ${(child.notes||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,8).map(n=>`<div class="row child-note"><div class="row-main"><strong>${n.text}</strong><small>${new Date((n.date||today)+"T12:00").toLocaleDateString("nl-NL",{day:"numeric",month:"long"})}</small></div><button class="link-btn" data-delete-child-item="notes|${n.id}">wis</button></div>`).join("")||`<div class="empty">Nog geen notities.</div>`}
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


      <div class="section-title"><h3>Kinderen</h3></div>
      <div class="card profile-card profile-children">
        <label class="switch-line children-toggle-line">
          <span><strong>Kinderen gebruiken</strong><small>Toon het tabblad Kinderen en het kindoverzicht op Vandaag.</small></span>
          <input id="profileChildrenEnabled" type="checkbox" ${profile.childrenEnabled?"checked":""}>
        </label>
        <div id="profileChildrenPanel" class="${profile.childrenEnabled?"":"hidden"}">
          <div class="profile-child-list">
            ${(state.children||[]).map(c=>`<div class="profile-child-row"><span><strong>${c.name}</strong><small>${childAge(c)||"Geboortedatum niet ingevuld"}</small></span><div><button class="link-btn" type="button" data-edit-child-profile="${c.id}">bewerk</button><button class="link-btn" type="button" data-delete-child-profile="${c.id}">wis</button></div></div>`).join("")||`<p class="subtle">Nog geen kindprofiel toegevoegd.</p>`}
          </div>
          <button class="secondary" type="button" data-add-child-profiel>Kind toevoegen</button>
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

      <div class="section-title"><h3>Back-up & herstel</h3></div>
      <div class="card profile-card backup-card">
        <p class="subtle">Bewaar een kopie van je Lumi-gegevens op je telefoon of computer. Zo kun je agenda, budget, maaltijden, boodschappen en spaardoelen later herstellen.</p>
        <div class="fab-row">
          <button class="secondary" id="exportBackup" type="button">Back-up maken</button>
          <label class="secondary file-button">Back-up herstellen<input id="importBackup" type="file" accept="application/json,.json"></label>
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
  const transactionExpenses=tx.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount||0),0);
  const categoryCorrectionTotal=Object.values((state.categoryCorrections||{})[monthKey]||{}).reduce((s,v)=>s+Number(v||0),0);
  const savedThisMonth=tx.filter(t=>t.type==="saving").reduce((s,t)=>s+Number(t.amount||0),0);
  const baseIncome=Math.max(0,Number(profile.income||0));
  const fixedExpenses=Math.max(0,Number(profile.fixed||0));
  const monthlySavingsGoal=Math.max(0,Number(profile.savingsGoal||0));
  const totalIncome=baseIncome+extraIncome;
  const correction=(state.budgetCorrections||{})[monthKey]||{remaining:0,expenses:0};
  const expenseCorrection=Number(correction.expenses||0);
  const remainingCorrection=Number(correction.remaining||0);
  const variableExpenses=transactionExpenses+categoryCorrectionTotal+expenseCorrection;
  const totalExpenses=fixedExpenses+variableExpenses;
  const savingsReserved=Math.max(monthlySavingsGoal,savedThisMonth);
  const calculatedRemaining=totalIncome-totalExpenses-savingsReserved;
  const remaining=calculatedRemaining+remainingCorrection;
  return {
    baseIncome,extraIncome,totalIncome,fixedExpenses,transactionExpenses,categoryCorrectionTotal,expenseCorrection,
    variableExpenses,totalExpenses,monthlySavingsGoal,savedThisMonth,savingsReserved,
    calculatedRemaining,remainingCorrection,remaining
  };
}
function categoryCorrection(name,monthKey=budgetMonth){
  return Number((state.categoryCorrections||{})[monthKey]?.[name]||0);
}
function categorySpent(name,monthKey=budgetMonth){
  const transactionSpent=budgetTransactions(monthKey)
    .filter(t=>t.type==="expense" && (t.category||t.label)===name)
    .reduce((s,t)=>s+Number(t.amount||0),0);
  return transactionSpent + categoryCorrection(name,monthKey);
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
      <div><small>Totaal inkomen</small><strong>${euro(totals.totalIncome)}</strong><span>${totals.extraIncome?`incl. ${euro(totals.extraIncome)} extra`:"basisinkomen"}</span></div>
      <div><small>Vaste lasten</small><strong>${euro(totals.fixedExpenses)}</strong><span>uit je profiel</span></div>
      <div><small>Variabele uitgaven</small><strong>${euro(totals.variableExpenses)}</strong><span>${totals.expenseCorrection?`incl. correctie ${euro(totals.expenseCorrection)}`:"uit transacties"}</span></div>
      <div><small>Sparen deze maand</small><strong>${euro(totals.savedThisMonth)}</strong><span>doel ${euro(totals.monthlySavingsGoal)}</span></div>
    </div>
    ${(totals.remainingCorrection||totals.expenseCorrection)?`<div class="budget-correction-note"><strong>Handmatige correcties</strong><span>${totals.remainingCorrection?`Budgetruimte ${totals.remainingCorrection>=0?"+":""}${euro(totals.remainingCorrection)}`:""}${totals.remainingCorrection&&totals.expenseCorrection?" · ":""}${totals.expenseCorrection?`Uitgaven ${totals.expenseCorrection>=0?"+":""}${euro(totals.expenseCorrection)}`:""}</span></div>`:""}

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
        return `<div class="card budget-category-card clickable-budget-category" data-open-category="${i}" role="button" tabindex="0">
          <div class="row-main"><strong>${b.name}</strong><small>${euro(spent)} van ${euro(Number(b.limit||0))}</small></div>
          <div class="progress"><span style="width:${pct}%"></span></div>
          <div class="budget-category-footer"><span>${pct}% gebruikt · tik voor details</span><button class="link-btn" data-expense-cat="${i}">Uitgave toevoegen</button></div>
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
            <div class="transaction-amount ${t.type}">${t.type==="income"?"+":"−"} ${euro(Math.abs(Number(t.amount||0)))}</div>
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
    const totals=budgetTotals(key);
    return {
      label:d.toLocaleDateString("nl-NL",{month:"short"}),
      income:totals.totalIncome,
      expense:totals.totalExpenses
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
      <p>Plan je week en houd je boodschappen automatisch bij. ${profileMealHint()}.</p>
      <div class="decor-letter">M</div>
    </section>
    <div class="section-title"><h3>Vandaag</h3></div>
    <label class="row task-row ${isDone("meal","dinner")?"done":""}">
      <input class="task-check" type="checkbox" data-meal-done="dinner" ${isDone("meal","dinner")?"checked":""}>
      <button class="row-main meal-today-link" type="button" data-meal-shopping="${todayName()}|Diner"><strong>Diner</strong><small>${state.meals[todayName()]?.Diner || "Nog niet gepland"}</small></button>
      <span class="pill">${isDone("meal","dinner")?"Gedaan":"Vandaag"}</span>
    </label>
    <div class="card meal-profile-card"><strong>Afgestemd op jouw profiel</strong><p>${profileMealHint()}. Op ${Math.max(0,7-(profile.workDays||[]).length)} vrije dag(en) kun je eventueel iets uitgebreider koken. Je ingrediënten worden per maaltijd bewaard.</p></div>
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
    ${profile.childrenEnabled && (state.children||[]).length?`<div class="section-title"><h3>Kinderen</h3><button class="link-btn" data-go="children">open kindplanning</button></div><div class="card child-meals-summary">${(state.children||[]).map(c=>`<div><strong>${c.name}</strong><small>Vandaag: ${childMealForDay(c,todayName())||"nog niet apart gepland"}</small></div>`).join("")}</div>`:""}
    <div class="section-title"><h3>Boodschappenlijst</h3><button class="link-btn" data-add="shopping">＋ item</button></div>
    <div class="list">
      ${state.shopping.length?state.shopping.slice().sort((a,b)=>Number(a.done)-Number(b.done)).map((x)=>`<div class="row shopping-row ${x.done?"done":""}"><input class="task-check" type="checkbox" data-shopping-done="${x.id}" ${x.done?"checked":""}><div class="row-main"><strong>${shoppingItemText(x)}</strong></div><div class="shopping-actions"><button class="link-btn" data-edit-shopping="${x.id}">bewerk</button><button class="link-btn" data-remove-shopping="${x.id}">verwijder</button></div></div>`).join(""):`<div class="empty">Je lijst is leeg.</div>`}
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
    ${mealContext?`<div class="card meal-shopping-context"><small>${mealContext.day} · ${mealContext.slot}</small><strong>${mealContext.meal||"Maaltijd"}</strong><p>${profileMealHint()}</p>${getMealIngredients(mealContext.day,mealContext.slot).length?`<div class="ingredient-chips">${getMealIngredients(mealContext.day,mealContext.slot).map(x=>`<span>${x}</span>`).join("")}</div><button class="action-btn" type="button" data-add-meal-ingredients="${mealContext.day}|${mealContext.slot}">Ingrediënten toevoegen aan lijst</button>`:`<p class="subtle">Nog geen ingrediënten opgeslagen. Bewerk de maaltijd om ingrediënten toe te voegen.</p>`}<button class="link-btn" type="button" data-clear-meal-context>Sluiten</button></div>`:""}
    <div class="section-title"><h3>Vandaag</h3><button class="link-btn" data-add="shopping">Item toevoegen</button></div>
    <div class="list">
      ${state.shopping.length?state.shopping.slice().sort((a,b)=>Number(a.done)-Number(b.done)).map((x)=>`<div class="row shopping-row ${x.done?"done":""}"><input class="task-check" type="checkbox" data-shopping-done="${x.id}" ${x.done?"checked":""}><div class="row-main"><strong>${shoppingItemText(x)}</strong></div><div class="shopping-actions"><button class="link-btn" data-edit-shopping="${x.id}">bewerk</button><button class="link-btn" data-remove-shopping="${x.id}">verwijder</button></div></div>`).join(""):`<div class="empty">Je boodschappenlijst is leeg.</div>`}
    </div>
    <div class="fab-row"><button class="action-btn" data-go="meals">Terug naar maaltijdplanner</button></div>`;
}

function agendaPage(){
  const items=[...state.agenda,...childAgendaItemsForView()].sort((a,b)=>(a.date+(a.startTime||a.time||"00:00")).localeCompare(b.date+(b.startTime||b.time||"00:00")));
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
      ${items.length?items.map(a=>`<div class="row task-row ${a.childVirtual?"child-agenda-row":isDone("agenda",a.id,a.date)?"done":""}">
        ${a.childVirtual?`<span class="child-agenda-mark">K</span>`:`<input class="task-check" type="checkbox" data-agenda-done="${a.id}" data-agenda-date="${a.date}" ${isDone("agenda",a.id,a.date)?"checked":""}>`}
        <div class="row-main"><strong>${a.title}</strong><small>${new Date(a.date+"T12:00").toLocaleDateString("nl-NL",{weekday:"short",day:"numeric",month:"short"})} · ${fmtRange(a)}${a.location?` · ${a.location}`:""}</small></div>
        ${a.allDay?`<span class="all-day-chip">Hele dag</span>`:""}
        ${a.childVirtual?`<button class="link-btn" data-go-child="${a.childId}">kind</button>`:`<button class="link-btn" data-delete-agenda="${a.id}">wis</button>`}
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
          <button class="link-btn" data-edit-clean="${x.id}">bewerken</button>
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


  const exportBackup=document.getElementById("exportBackup");
  if(exportBackup) exportBackup.onclick=()=>{
    const payload={version:1,exportedAt:new Date().toISOString(),state,profile};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`lumi-backup-${todayISO()}.json`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  };
  const importBackup=document.getElementById("importBackup");
  if(importBackup) importBackup.onchange=async()=>{
    const file=importBackup.files?.[0];
    if(!file) return;
    try{
      const data=JSON.parse(await file.text());
      if(!data.state || !data.profile) throw new Error("Ongeldig bestand");
      if(!confirm("Deze back-up herstellen? Je huidige Lumi-gegevens worden vervangen.")) return;
      state=data.state; profile=data.profile;
      save(); saveProfile();
      alert("Back-up hersteld.");
      render();
    }catch(err){ alert("Deze back-up kon niet worden gelezen."); }
  };

  const profileForm=document.getElementById("profileForm");
  if(profileForm){
    profileForm.onsubmit=(e)=>{
      e.preventDefault();
      profile.name=document.getElementById("profileName").value.trim();
      profile.birthdate=document.getElementById("profileBirthdate").value;
      profile.people=Math.max(1,Number(document.getElementById("profilePeople").value||1));
      profile.diet=document.getElementById("profileDiet").value;
      profile.childrenEnabled=!!document.getElementById("profileChildrenEnabled")?.checked;
      profile.income=Math.max(0,Number(document.getElementById("profileIncome").value||0));
      profile.fixed=Math.max(0,Number(document.getElementById("profileFixed").value||0));
      profile.savingsGoal=Math.max(0,Number(document.getElementById("profileSavings").value||0));
      profile.workDays=[...document.querySelectorAll('input[name="profileWorkday"]:checked')].map(x=>x.value);
      profile.rooms=[...document.querySelectorAll('input[name="profileRoom"]:checked')].map(x=>x.value);
      profile.cleaningLevel=document.getElementById("profileCleaning").value;
      profile.completed=true;
      state.income=profile.income;
      state.fixed=profile.fixed;
      syncProfileCleaningSuggestions();
      saveProfile();
      save();
      const saved=document.getElementById("profileSaved");
      if(saved){
        saved.textContent="Opgeslagen";
        setTimeout(()=>{ if(saved) saved.textContent=""; },1800);
      }
    };
  }


  const childToggle=document.getElementById("profileChildrenEnabled");
  if(childToggle){
    const panel=document.getElementById("profileChildrenPanel");
    childToggle.onchange=()=>{
      profile.childrenEnabled=childToggle.checked;
      if(panel) panel.classList.toggle("hidden",!childToggle.checked);
      saveProfile(); ensureChildrenNav();
    };
  }
  document.querySelectorAll("[data-add-child-profiel]").forEach(b=>b.onclick=()=>openModal("childProfile"));
  document.querySelectorAll("[data-edit-child-profile]").forEach(b=>b.onclick=()=>openModal("childProfile",Number(b.dataset.editChildProfile)));
  document.querySelectorAll("[data-delete-child-profile]").forEach(b=>b.onclick=()=>{
    const id=Number(b.dataset.deleteChildProfile), c=childById(id);
    if(c && confirm(`Kindprofiel van ${c.name} verwijderen?`)){
      state.children=state.children.filter(x=>Number(x.id)!==id);
      save(); render();
    }
  });
  document.querySelectorAll("[data-select-child]").forEach(b=>b.onclick=()=>{selectChild(Number(b.dataset.selectChild));render();});
  document.querySelectorAll("[data-child-add]").forEach(b=>b.onclick=()=>openModal(b.dataset.childAdd));
  document.querySelectorAll("[data-child-today-action]").forEach(b=>b.onclick=()=>openModal(b.dataset.childTodayAction));

  document.querySelectorAll("[data-child-today-food]").forEach(b=>b.onclick=()=>{
    localStorage.setItem("lumiChildFoodDate",todayISO());
    document.querySelector(".child-food-dashboard")?.scrollIntoView({behavior:"smooth",block:"start"});
  });
  document.querySelectorAll("[data-edit-child-food]").forEach(b=>b.onclick=()=>{
    const date=localStorage.getItem("lumiChildFoodDate")||todayISO();
    openModal("childFood",`${date}|${b.dataset.editChildFood}`);
  });
  document.querySelectorAll("[data-child-food-date]").forEach(b=>b.onclick=()=>{
    const current=localStorage.getItem("lumiChildFoodDate")||todayISO();
    const d=dateObj(current); d.setDate(d.getDate()+Number(b.dataset.childFoodDate));
    localStorage.setItem("lumiChildFoodDate",isoLocal(d)); render();
  });
  document.querySelectorAll("[data-child-food-today]").forEach(b=>b.onclick=()=>{
    localStorage.setItem("lumiChildFoodDate",todayISO()); render();
  });
  document.querySelectorAll("[data-child-food-open-date]").forEach(b=>b.onclick=()=>{
    localStorage.setItem("lumiChildFoodDate",b.dataset.childFoodOpenDate); render();
  });
  document.querySelectorAll("[data-child-food-favorite]").forEach(b=>b.onclick=()=>{
    const date=localStorage.getItem("lumiChildFoodDate")||todayISO();
    openModal("childFood",`${date}|Tussendoor`);
    setTimeout(()=>{const el=document.getElementById("fChildFood");if(el)el.value=b.dataset.childFoodFavorite;},0);
  });

  document.querySelectorAll("[data-child-shopping]").forEach(b=>b.onclick=()=>openModal("shopping"));
  document.querySelectorAll("[data-go-child]").forEach(b=>b.onclick=()=>{selectChild(Number(b.dataset.goChild));currentPage="children";render();});
  document.querySelectorAll("[data-delete-child-item]").forEach(b=>b.onclick=()=>{
    const c=selectedChild(); if(!c)return;
    const [collection,idRaw]=b.dataset.deleteChildItem.split("|");
    const id=Number(idRaw);
    c[collection]=(c[collection]||[]).filter(x=>Number(x.id)!==id);
    save();render();
  });
  document.querySelectorAll("[data-child-carry-done]").forEach(cbox=>cbox.onchange=()=>{
    const c=selectedChild(); if(!c)return;
    setDone("childcarry",`${c.id}-${cbox.dataset.childCarryDone}`,cbox.checked); render();
  });
  document.querySelectorAll("[data-child-routine-done]").forEach(cbox=>cbox.onchange=()=>{
    const c=selectedChild(); if(!c)return;
    setDone("childroutine",`${c.id}-${cbox.dataset.childRoutineDone}`,cbox.checked); render();
  });
  document.querySelectorAll("[data-home-child-carry]").forEach(cbox=>cbox.onchange=()=>{
    const [childId,itemId]=cbox.dataset.homeChildCarry.split("|");
    setDone("childcarry",`${childId}-${itemId}`,cbox.checked); render();
  });
  document.querySelectorAll("[data-home-child-plan]").forEach(cbox=>cbox.onchange=()=>{
    const [childId,itemId]=cbox.dataset.homeChildPlan.split("|");
    setDone("childplan",`${childId}-${itemId}`,cbox.checked); render();
  });
  document.querySelectorAll("[data-home-child-routine]").forEach(cbox=>cbox.onchange=()=>{
    const [childId,itemId]=cbox.dataset.homeChildRoutine.split("|");
    setDone("childroutine",`${childId}-${itemId}`,cbox.checked); render();
  });
  document.querySelectorAll("[data-home-child-meal]").forEach(cbox=>cbox.onchange=()=>{
    setDone("childmeal",cbox.dataset.homeChildMeal,cbox.checked); render();
  });
  document.querySelectorAll("[data-home-child-food-open]").forEach(b=>b.onclick=()=>{
    selectChild(Number(b.dataset.homeChildFoodOpen));
    localStorage.setItem("lumiChildFoodDate",todayISO());
    currentPage="children"; render();
  });

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
  document.querySelectorAll("[data-open-category]").forEach(card=>{
    card.onclick=(e)=>{
      if(e.target.closest("[data-expense-cat]")) return;
      openModal("budgetCategory",Number(card.dataset.openCategory));
    };
    card.onkeydown=(e)=>{ if(e.key==="Enter" || e.key===" "){ e.preventDefault(); openModal("budgetCategory",Number(card.dataset.openCategory)); } };
  });
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

  document.querySelectorAll("[data-shopping-done]").forEach(c=>c.onchange=()=>{
    const item=state.shopping.find(x=>Number(x.id)===Number(c.dataset.shoppingDone));
    if(item){ item.done=c.checked; save(); render(); }
  });
  document.querySelectorAll("[data-remove-shopping]").forEach(b=>b.onclick=()=>{
    state.shopping=state.shopping.filter(x=>Number(x.id)!==Number(b.dataset.removeShopping));
    save();render();
  });
  document.querySelectorAll("[data-add-meal-ingredients]").forEach(b=>b.onclick=()=>{
    const [day,slot]=b.dataset.addMealIngredients.split("|");
    const currentTexts=state.shopping.map(shoppingItemText).map(x=>x.toLowerCase());
    getMealIngredients(day,slot).forEach(ing=>{
      if(!currentTexts.includes(ing.toLowerCase())) state.shopping.push({id:Date.now()+Math.random(),text:ing,done:false});
    });
    save();render();
  });
  document.querySelectorAll("[data-clear-meal-context]").forEach(b=>b.onclick=()=>{sessionStorage.removeItem("lumiMealShoppingContext");render();});
  document.querySelectorAll("[data-edit-agenda]").forEach(b=>b.onclick=()=>openModal("agendaEdit",Number(b.dataset.editAgenda)));
  document.querySelectorAll("[data-delete-agenda]").forEach(b=>b.onclick=()=>{state.agenda=state.agenda.filter(a=>a.id!==Number(b.dataset.deleteAgenda));save();render();});
  document.querySelectorAll("[data-clean]").forEach(c=>c.onchange=()=>{setDone("clean",c.dataset.clean,c.checked);render();});
}

function openModal(type, catIndex=null){
  const fields={
    childProfile:{title:Number(catIndex)?"Kind bewerken":"Kind toevoegen",html:(()=>{
      const c=childById(catIndex);
      return `<div class="form-grid"><label>Naam<input id="fChildName" value="${c?.name||""}" placeholder="Voornaam"></label><label>Geboortedatum<input id="fChildBirthdate" type="date" value="${c?.birthdate||""}"></label></div>`;
    })()},
    childPlan:{title:"Planning kind toevoegen",html:`<div class="form-grid"><label>Wat staat er gepland?<input id="fChildPlanTitle" placeholder="Bijv. opvang, zwemles, opa en oma"></label><label>Datum<input id="fChildPlanDate" type="date" value="${todayISO()}"></label><label class="switch-line"><input id="fChildPlanRepeat" type="checkbox"> Iedere week herhalen</label><label class="switch-line"><input id="fChildPlanAllDay" type="checkbox"> Hele dag</label><div class="time-row" id="childPlanTimes"><label>Begintijd<input id="fChildPlanStart" type="time" value="08:30"></label><label>Eindtijd<input id="fChildPlanEnd" type="time" value="17:00"></label></div><label>Locatie<input id="fChildPlanLocation" placeholder="Bijv. opvang"></label><label>Brengen door<input id="fChildDropoff" placeholder="Bijv. mama"></label><label>Ophalen door<input id="fChildPickup" placeholder="Bijv. papa"></label></div>`},
    childFood:{title:"Eetmoment",html:(()=>{
      const c=selectedChild();
      const raw=String(catIndex||"");
      const [dateArg,momentArg]=raw.includes("|")?raw.split("|"):[localStorage.getItem("lumiChildFoodDate")||todayISO(),raw||"Ontbijt"];
      const date=dateArg||todayISO();
      const moment=momentArg||"Ontbijt";
      const existing=c?childFoodMoment(c,date,moment):null;
      const familyDinner=moment==="Avondeten"?familyDinnerForDate(date):"";
      return `<div class="form-grid">
        <input id="fChildFoodOriginalMoment" type="hidden" value="${moment}">
        <label>Datum<input id="fChildFoodDate" type="date" value="${date}"></label>
        <label>Moment<select id="fChildFoodMoment">${childFoodMoments().map(m=>`<option ${m===moment?"selected":""}>${m}</option>`).join("")}</select></label>
        ${familyDinner?`<div class="child-family-dinner"><small>Gezinsmaaltijd</small><strong>${familyDinner}</strong><button type="button" class="link-btn" id="useFamilyDinner">Gebruik deze maaltijd</button></div>`:""}
        ${(c?.foodFavorites||[]).length?`<div><small>Favorieten</small><div class="ingredient-chips">${c.foodFavorites.map(x=>`<button type="button" data-fill-child-food="${x}">${x}</button>`).join("")}</div></div>`:""}
        <label>Wat gegeten?<input id="fChildFood" value="${existing?.food||""}" placeholder="Bijv. banaan en yoghurt"></label>
        <label>Hoeveel?<select id="fChildFoodAmount">${["Alles","Meeste","Helft","Beetje","Niet"].map(x=>`<option ${existing?.amount===x?"selected":""}>${x}</option>`).join("")}</select></label>
        <label>Drinken<input id="fChildDrink" value="${existing?.drink||""}" placeholder="Bijv. water, melk"></label>
        <label>Notitie<textarea id="fChildFoodNote" rows="3" placeholder="Bijv. voor het eerst geprobeerd">${existing?.note||""}</textarea></label>
        <label class="switch-line"><input id="fChildFoodFavorite" type="checkbox"> Bewaar eten als favoriet</label>
      </div>`;
    })()},
    childCarry:{title:"Meenemen toevoegen",html:`<div class="form-grid"><label>Wat moet mee?<input id="fChildCarryText" placeholder="Bijv. gymtas, drinkbeker"></label><label>Datum<input id="fChildCarryDate" type="date" value="${todayISO()}"></label><label class="switch-line"><input id="fChildCarryRepeat" type="checkbox"> Iedere week op deze dag</label></div>`},
    childRoutine:{title:"Routine toevoegen",html:`<div class="form-grid"><label>Routine<input id="fChildRoutineTitle" placeholder="Bijv. tandenpoetsen, vitamine, voorlezen"></label><label>Tijd<input id="fChildRoutineTime" type="time" value="19:00"></label><p class="subtle">Op welke dagen?</p><div class="choice-grid">${["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"].map(d=>`<label class="choice"><input type="checkbox" name="childRoutineDay" value="${d}" checked>${d}</label>`).join("")}</div></div>`},
    childNote:{title:"Notitie toevoegen",html:`<div class="form-grid"><label>Datum<input id="fChildNoteDate" type="date" value="${todayISO()}"></label><label>Notitie<textarea id="fChildNoteText" rows="4" placeholder="Bijv. vond mango heel lekker"></textarea></label></div>`},
    childMealPlan:{title:"Weekmenu kind",html:(()=>{
      const c=selectedChild();
      return `<div class="form-grid">${["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"].map(d=>`<label>${d}<input data-child-meal-day="${d}" value="${c?childMealForDay(c,d):""}" placeholder="Apart eten of zelfde als jullie"></label>`).join("")}</div>`;
    })()},
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
    agendaEdit:{title:"Afspraak bewerken",html:(()=>{
      const a=state.agenda.find(x=>Number(x.id)===Number(catIndex));
      if(!a) return `<div class="empty">Afspraak niet gevonden.</div>`;
      return `<div class="form-grid">
        <label>Titel<input id="fTitle" value="${a.title||""}"></label>
        <label>Datum<input id="fDate" type="date" value="${a.date||todayISO()}"></label>
        <label class="switch-line"><input id="fAllDay" type="checkbox" ${a.allDay?"checked":""}> Hele dag</label>
        <div class="time-row" id="timeFields">
          <label>Begintijd<input id="fStartTime" type="time" value="${a.startTime||a.time||"09:00"}"></label>
          <label>Eindtijd<input id="fEndTime" type="time" value="${a.endTime||"10:00"}"></label>
        </div>
      </div>`;
    })()},
    shopping:{title:"Boodschap toevoegen",html:`<div class="form-grid"><label>Artikel<input id="fItem" placeholder="Bijv. tomaten"></label></div>`},
    editShopping:{title:"Boodschap bewerken",html:(()=>{
      const item=state.shopping.find(x=>Number(x.id)===Number(catIndex));
      return `<div class="form-grid"><label>Artikel<input id="fEditShopping" value="${shoppingItemText(item)}"></label></div>`;
    })()},
    budgetCategory:{title:"Categorie bekijken",html:(()=>{
      const b=state.budgets[Number(catIndex)];
      if(!b) return `<div class="empty">Categorie niet gevonden.</div>`;
      const categoryTx=budgetTransactions(budgetMonth)
        .filter(t=>t.type==="expense" && (t.category||t.label)===b.name)
        .slice().sort((a,c)=>(c.date||"").localeCompare(a.date||"") || Number(c.id)-Number(a.id));
      const correction=categoryCorrection(b.name,budgetMonth);
      const total=categorySpent(b.name,budgetMonth);
      return `<div class="form-grid budget-category-detail">
        <div class="category-detail-head">
          <div><small>${monthLabel(budgetMonth)}</small><strong>${b.name}</strong></div>
          <div class="category-detail-total">${euro(total)}</div>
        </div>
        <label>Totaal uitgegeven aanpassen
          <input id="fCategoryTarget" type="number" min="0" step="0.01" value="${Number(total).toFixed(2)}">
          <small>Heb je per ongeluk een verkeerd totaal? Vul hier gewoon het juiste bedrag in.</small>
        </label>
        ${correction?`<div class="category-correction-line"><span>Handmatige correctie</span><strong>${correction>=0?"+":""}${euro(correction)}</strong></div>`:""}
        <div class="category-detail-title"><strong>Ingevoerde uitgaven</strong><span>${categoryTx.length}</span></div>
        <div class="category-transaction-list">
          ${categoryTx.length?categoryTx.map(t=>`
            <button class="category-transaction-row" type="button" data-category-edit-tx="${t.id}">
              <span><strong>${t.description||t.label||"Uitgave"}</strong><small>${new Date((t.date||todayISO())+"T12:00:00").toLocaleDateString("nl-NL",{day:"numeric",month:"short",year:"numeric"})}</small></span>
              <span class="category-transaction-amount">− ${euro(Number(t.amount||0))}<small>wijzig</small></span>
            </button>`).join(""):`<div class="empty">Nog geen losse uitgaven in deze categorie.</div>`}
        </div>
      </div>`;
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
    cleanDays:{title:"Schoonmaaktaak bewerken",html:(()=>{
      const task=state.cleaning.find(x=>Number(x.id)===Number(catIndex));
      return `<div class="form-grid"><label>Taak<input id="fEditCleanTask" value="${task?.task||""}"></label><div id="editCleanRepeatFields"></div><button type="button" class="secondary danger-action" id="deleteCleanBtn">Taak verwijderen</button></div>`;
    })()},
    budgetcat:{title:"Budgetcategorie toevoegen",html:`<div class="form-grid"><label>Naam<input id="fName" placeholder="Bijv. Kleding"></label><label>Maandbudget<input id="fLimit" type="number" min="0" step="1" placeholder="100"></label></div>`},
    meal:{title:"Maaltijd bewerken",html:`<div class="form-grid"><p class="subtle">${profileMealHint()}</p><label>Dag<select id="fDay">${Object.keys(state.meals).map(d=>`<option>${d}</option>`).join("")}</select></label><label>Moment<select id="fSlot"><option>Ontbijt</option><option>Lunch</option><option>Diner</option></select></label><label>Maaltijd<input id="fMeal" placeholder="Bijv. pasta pesto"></label><label>Ingrediënten voor boodschappen<textarea id="fIngredients" rows="4" placeholder="Eén ingrediënt per regel"></textarea></label></div>`}
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


  if(type==="cleanDays"){
    const del=document.getElementById("deleteCleanBtn");
    if(del) del.onclick=()=>{
      const task=state.cleaning.find(x=>Number(x.id)===Number(catIndex));
      if(task && confirm(`"${task.task}" verwijderen?`)){
        state.cleaning=state.cleaning.filter(x=>Number(x.id)!==Number(catIndex));
        save(); modal.close(); render();
      }
    };
  }

  if(type==="editTx"){
    const del=document.getElementById("deleteTxBtn");
    if(del) del.onclick=()=>{
      if(confirm("Deze transactie verwijderen?")){
        state.transactions=state.transactions.filter(t=>Number(t.id)!==Number(catIndex));
        save(); modal.close(); render();
      }
    };
  }



  if(type==="meal"){
    const day=document.getElementById("fDay"), slot=document.getElementById("fSlot"), meal=document.getElementById("fMeal"), ingredients=document.getElementById("fIngredients");
    const syncMealFields=()=>{
      meal.value=state.meals[day.value]?.[slot.value]||"";
      ingredients.value=getMealIngredients(day.value,slot.value).join("\n");
    };
    day.addEventListener("change",syncMealFields);
    slot.addEventListener("change",syncMealFields);
    syncMealFields();
  }

  if(type==="childFood"){
    const useFamily=document.getElementById("useFamilyDinner");
    if(useFamily) useFamily.onclick=()=>{
      const meal=familyDinnerForDate(document.getElementById("fChildFoodDate").value||todayISO());
      document.getElementById("fChildFood").value=meal;
    };
    document.querySelectorAll("[data-fill-child-food]").forEach(b=>b.onclick=()=>{
      document.getElementById("fChildFood").value=b.dataset.fillChildFood;
    });
  }

  if(type==="childPlan"){
    const allDay=document.getElementById("fChildPlanAllDay");
    const times=document.getElementById("childPlanTimes");
    const sync=()=>times.classList.toggle("hidden",allDay.checked);
    allDay.addEventListener("change",sync); sync();
  }

  if(type==="agenda" || type==="agendaEdit"){
    const allDay=document.getElementById("fAllDay");
    const timeFields=document.getElementById("timeFields");
    const toggle=()=>{timeFields.style.display=allDay.checked?"none":"grid";};
    allDay.addEventListener("change",toggle); toggle();
  }

  if(type==="budgetCategory"){
    document.querySelectorAll("[data-category-edit-tx]").forEach(b=>b.onclick=()=>{
      openModal("editTx",Number(b.dataset.categoryEditTx));
    });
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
  if(t==="childProfile"){
    const name=document.getElementById("fChildName").value.trim();
    if(!name){ alert("Vul een naam in."); return; }
    const existing=childById(modal.dataset.editId);
    if(existing){
      existing.name=name; existing.birthdate=document.getElementById("fChildBirthdate").value;
    }else{
      const c=normalizeChild({id:Date.now(),name,birthdate:document.getElementById("fChildBirthdate").value},0);
      state.children.push(c); selectChild(c.id); profile.childrenEnabled=true; saveProfile();
    }
  }
  if(t==="childPlan"){
    const c=selectedChild(); if(!c){alert("Voeg eerst een kind toe.");return;}
    const date=document.getElementById("fChildPlanDate").value||todayISO();
    const repeatWeekly=document.getElementById("fChildPlanRepeat").checked;
    const allDay=document.getElementById("fChildPlanAllDay").checked;
    const start=document.getElementById("fChildPlanStart").value;
    const end=document.getElementById("fChildPlanEnd").value;
    if(!allDay && start && end && end<=start){alert("De eindtijd moet na de begintijd liggen.");return;}
    c.plans.push({id:Date.now(),title:document.getElementById("fChildPlanTitle").value.trim()||"Planning",date,weekday:DAY_NAMES[dateObj(date).getDay()],repeatWeekly,allDay,startTime:allDay?"":start,endTime:allDay?"":end,location:document.getElementById("fChildPlanLocation").value.trim(),dropoffBy:document.getElementById("fChildDropoff").value.trim(),pickupBy:document.getElementById("fChildPickup").value.trim()});
  }
  if(t==="childFood"){
    const c=selectedChild(); if(!c)return;
    const date=document.getElementById("fChildFoodDate").value||todayISO();
    const moment=document.getElementById("fChildFoodMoment").value;
    const originalMoment=document.getElementById("fChildFoodOriginalMoment")?.value||moment;
    const foodValue=document.getElementById("fChildFood").value.trim();
    const old=(c.foodLogs||[]).find(x=>x.date===date && x.moment===originalMoment);
    c.foodLogs=(c.foodLogs||[]).filter(x=>!(x.date===date && (x.moment===moment || x.moment===originalMoment)));
    c.foodLogs.push({
      id:old?.id||Date.now(),
      date,
      moment,
      food:foodValue,
      amount:document.getElementById("fChildFoodAmount").value,
      drink:document.getElementById("fChildDrink").value.trim(),
      note:document.getElementById("fChildFoodNote").value.trim()
    });
    if(document.getElementById("fChildFoodFavorite")?.checked) saveChildFavorite(c,foodValue);
    localStorage.setItem("lumiChildFoodDate",date);
  }
  if(t==="childCarry"){
    const c=selectedChild(); if(!c)return;
    const text=document.getElementById("fChildCarryText").value.trim();
    if(!text){alert("Vul in wat er mee moet.");return;}
    const date=document.getElementById("fChildCarryDate").value||todayISO();
    c.carryItems.push({id:Date.now(),text,date,weekday:DAY_NAMES[dateObj(date).getDay()],repeatWeekly:document.getElementById("fChildCarryRepeat").checked});
  }
  if(t==="childRoutine"){
    const c=selectedChild(); if(!c)return;
    const title=document.getElementById("fChildRoutineTitle").value.trim();
    if(!title){alert("Vul een routine in.");return;}
    c.routines.push({id:Date.now(),title,time:document.getElementById("fChildRoutineTime").value,days:[...document.querySelectorAll('input[name="childRoutineDay"]:checked')].map(x=>x.value)});
  }
  if(t==="childNote"){
    const c=selectedChild(); if(!c)return;
    const text=document.getElementById("fChildNoteText").value.trim();
    if(!text){alert("Vul een notitie in.");return;}
    c.notes.push({id:Date.now(),date:document.getElementById("fChildNoteDate").value||todayISO(),text});
  }
  if(t==="childMealPlan"){
    const c=selectedChild(); if(!c)return;
    c.mealPlan=c.mealPlan||{};
    document.querySelectorAll("[data-child-meal-day]").forEach(inp=>{c.mealPlan[inp.dataset.childMealDay]=inp.value.trim();});
  }

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
  if(t==="agendaEdit"){
    const a=state.agenda.find(x=>Number(x.id)===Number(modal.dataset.editId));
    if(a){
      const allDay=document.getElementById("fAllDay").checked;
      const start=document.getElementById("fStartTime").value;
      const end=document.getElementById("fEndTime").value;
      if(!allDay && start && end && end<=start){ alert("De eindtijd moet na de begintijd liggen."); return; }
      a.title=document.getElementById("fTitle").value.trim()||"Afspraak";
      a.date=document.getElementById("fDate").value;
      a.allDay=allDay;
      a.startTime=allDay?"":start;
      a.endTime=allDay?"":end;
    }
  }
  if(t==="agenda"){
    const allDay=document.getElementById("fAllDay").checked;
    const start=document.getElementById("fStartTime").value;
    const end=document.getElementById("fEndTime").value;
    if(!allDay && start && end && end<=start){ alert("De eindtijd moet na de begintijd liggen."); return; }
    state.agenda.push({id:Date.now(),title:document.getElementById("fTitle").value||"Afspraak",date:document.getElementById("fDate").value,allDay,startTime:allDay?"":start,endTime:allDay?"":end});
  }
  if(t==="shopping"){ const v=document.getElementById("fItem").value.trim(); if(v)state.shopping.push({id:Date.now(),text:v,done:false}); }
  if(t==="editShopping"){
    const item=state.shopping.find(x=>Number(x.id)===Number(modal.dataset.editId));
    const v=document.getElementById("fEditShopping").value.trim();
    if(v && item) item.text=v;
  }
  if(t==="budgetCategory"){
    const b=state.budgets[Number(modal.dataset.editId)];
    const target=Number(document.getElementById("fCategoryTarget").value);
    if(!b || !Number.isFinite(target) || target<0){ alert("Vul een geldig bedrag in."); return; }
    const current=categorySpent(b.name,budgetMonth);
    state.categoryCorrections=state.categoryCorrections||{};
    state.categoryCorrections[budgetMonth]=state.categoryCorrections[budgetMonth]||{};
    state.categoryCorrections[budgetMonth][b.name]=Number(state.categoryCorrections[budgetMonth][b.name]||0)+(target-current);
    if(Math.abs(state.categoryCorrections[budgetMonth][b.name]||0)<0.005){
      delete state.categoryCorrections[budgetMonth][b.name];
    }
  }
  if(t==="budgetAdjust"){
    const kind=modal.dataset.editId;
    const target=Number(document.getElementById("fBudgetTarget").value);
    if(!Number.isFinite(target)){ alert("Vul een geldig bedrag in."); return; }
    const totals=budgetTotals(budgetMonth);
    state.budgetCorrections=state.budgetCorrections||{};
    state.budgetCorrections[budgetMonth]=state.budgetCorrections[budgetMonth]||{remaining:0,expenses:0};
    if(kind==="remaining"){
      state.budgetCorrections[budgetMonth].remaining += target-totals.remaining;
    }else{
      state.budgetCorrections[budgetMonth].expenses += target-totals.totalExpenses;
    }
    if(Math.abs(state.budgetCorrections[budgetMonth].remaining||0)<0.005) state.budgetCorrections[budgetMonth].remaining=0;
    if(Math.abs(state.budgetCorrections[budgetMonth].expenses||0)<0.005) state.budgetCorrections[budgetMonth].expenses=0;
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
      task.task=document.getElementById("fEditCleanTask").value.trim()||task.task;
      task.profileGenerated=false;
      const mode=document.getElementById("editRepeatType").value;
      if(mode==="weekly"){ task.repeatType="weekly"; task.days=[...document.querySelectorAll('input[name="editWeekDay"]:checked')].map(x=>x.value); task.monthDays=[]; }
      else { task.repeatType="monthly"; task.monthDays=[...new Set([...document.querySelectorAll('input[name="editMonthDay"]')].map(x=>Math.max(1,Math.min(31,Number(x.value||1)))))].sort((a,b)=>a-b); task.days=[]; }
    }
  }
  if(t==="budgetcat"){ const n=document.getElementById("fName").value.trim(); const l=Number(document.getElementById("fLimit").value||0); if(n)state.budgets.push({name:n,limit:l,spent:0}); }
  if(t==="meal"){
    const d=document.getElementById("fDay").value,s=document.getElementById("fSlot").value,m=document.getElementById("fMeal").value.trim();
    if(m) state.meals[d][s]=m;
    setMealIngredients(d,s,document.getElementById("fIngredients").value.split("\n"));
  }
  save(); modal.close(); render();
});

document.getElementById("quickAddBtn").onclick=()=>openModal(currentPage==="home"?"agenda":({budget:"expense",meals:"meal",shopping:"shopping",agenda:"agenda",cleaning:"cleaning"})[currentPage]);
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{currentPage=b.dataset.page;render();});
if("serviceWorker" in navigator){
  let refreshing=false;
  navigator.serviceWorker.register("sw.js").then(reg=>{
    reg.update().catch(()=>{});
    navigator.serviceWorker.addEventListener("controllerchange",()=>{
      if(refreshing) return;
      refreshing=true;
      location.reload();
    });
  }).catch(()=>{});
}

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
