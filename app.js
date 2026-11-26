import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* 1) Reemplaza estos dos valores por los de tu proyecto Supabase. */
const SUPABASE_URL = "PEGA_AQUI_TU_PROJECT_URL";
const SUPABASE_ANON_KEY = "PEGA_AQUI_TU_ANON_PUBLIC_KEY";
const configured = !SUPABASE_URL.includes("PEGA_AQUI") && !SUPABASE_ANON_KEY.includes("PEGA_AQUI");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
let currentUser = null, isAdmin = false, gifts = [], settings = null;

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dayIsAvailable(gift) {
  return gift.unlock_date <= localDay();
}
function escapeHtml(s="") {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function show(id){$(id).classList.remove("hidden")}
function hide(id){$(id).classList.add("hidden")}
function message(t){$("authMessage").textContent=t}

async function init(){
  if(!configured){
    $("calendar").innerHTML='<div class="loading">Conecta Supabase para activar el calendario. Sigue las instrucciones de README.md.</div>';
    $("progressText").textContent="Falta configurar la conexión segura";
    $("loginBtn").addEventListener("click",()=>{show("authModal");message("Primero configura Supabase siguiendo README.md.")});
    return;
  }
  const {data:{session}}=await supabase.auth.getSession();
  currentUser=session?.user||null;
  supabase.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;setTimeout(loadApp,0)});
  await loadApp();
}
async function loadApp(){
  if(!currentUser){isAdmin=false;gifts=[];renderCalendar([]);$("progressText").textContent="Inicia sesión para descubrir tus sorpresas";$("progressBar").style.width="0%";$("loginBtn").textContent="Ingresar";hide("adminPanel");return}
  $("loginBtn").textContent="Mi cuenta";
  const {data:adminRow}=await supabase.from("advent_admins").select("user_id").eq("user_id",currentUser.id).maybeSingle();
  isAdmin=!!adminRow;
  const {data:setting}=await supabase.from("advent_settings").select("*").eq("id",1).maybeSingle();
  settings=setting;
  const {data:giftRows,error}=await supabase.from("advent_gifts").select("*").order("day");
  if(error){$("calendar").innerHTML='<div class="loading">No se pudo cargar el calendario. Revisa la configuración de Supabase.</div>';return}
  gifts=giftRows||[];
  const {data:opened}=await supabase.from("advent_opens").select("gift_id").eq("user_id",currentUser.id);
  const openedIds=new Set((opened||[]).map(x=>x.gift_id));
  gifts=gifts.map(g=>({...g,opened:openedIds.has(g.id)}));
  const count=gifts.filter(g=>g.opened).length;
  $("progressText").textContent=`Has descubierto ${count} de 24 sorpresas`;
  $("progressBar").style.width=`${Math.min(100,count/24*100)}%`;
  renderCalendar(gifts);
  if(isAdmin) renderAdmin();
  else hide("adminPanel");
}
function renderCalendar(rows){
  if(!rows.length){$("calendar").innerHTML=Array.from({length:24},(_,i)=>`<div class="day locked"><span class="num">${String(i+1).padStart(2,"0")}</span><span class="day-label">DICIEMBRE</span><span class="mini">🔒</span></div>`).join("");return}
  $("calendar").innerHTML=rows.map(g=>{
    const available=dayIsAvailable(g), opened=g.opened;
    const cls=`day ${opened?"opened":""} ${!available?"locked":""}`;
    const icon=opened?"✓":available?"✧":"🔒";
    return `<button class="${cls}" data-gift="${g.id}" ${available?"":"disabled"} aria-label="Día ${g.day}${available?"":" bloqueado"}"><span class="num">${String(g.day).padStart(2,"0")}</span><span class="day-label">${opened?"DESCUBIERTO":"DICIEMBRE"}</span><span class="mini">${icon}</span></button>`;
  }).join("");
  $("calendar").querySelectorAll("[data-gift]").forEach(b=>b.addEventListener("click",()=>openGift(b.dataset.gift)));
}
async function openGift(id){
  const gift=gifts.find(g=>g.id===id);if(!gift||!dayIsAvailable(gift))return;
  $("giftNumber").textContent=`DÍA ${String(gift.day).padStart(2,"0")}`;
  $("giftTitle").textContent=gift.title||"Una sorpresa para ti";
  $("giftBody").textContent=gift.message||"";
  const img=$("giftImage");
  if(gift.image_url){img.src=gift.image_url;show("giftImage")}else{img.removeAttribute("src");hide("giftImage")}
  const video=$("giftVideoWrap");
  if(gift.video_url){video.innerHTML=`<a class="gold-btn" href="${escapeHtml(gift.video_url)}" target="_blank" rel="noopener">Ver mi video ♥</a>`;show("giftVideoWrap")}else{video.innerHTML="";hide("giftVideoWrap")}
  show("giftModal");
  if(!gift.opened){
    const {error}=await supabase.from("advent_opens").insert({gift_id:id,user_id:currentUser.id});
    if(!error){gift.opened=true;setTimeout(loadApp,300)}
    else if(error.code!=="23505") console.error(error);
  }
}
function renderAdmin(){
  show("adminPanel");
  $("giftEditor").innerHTML=gifts.map(g=>`
    <article class="editor-item" data-editor="${g.id}">
      <div class="editor-top"><strong>Día ${String(g.day).padStart(2,"0")} · ${escapeHtml(g.title||"Sin título")}</strong><span class="muted">${g.opened?"Abierto por Francis":""}</span></div>
      <form class="editor-form" data-form="${g.id}">
        <label>Número del día<input name="day" type="number" min="1" max="24" value="${g.day}" required></label>
        <label>Fecha de desbloqueo<input name="unlock_date" type="date" value="${g.unlock_date}" required></label>
        <label class="wide">Nombre del regalo<input name="title" maxlength="100" value="${escapeHtml(g.title||"")}" required></label>
        <label class="wide">Mensaje o descripción<textarea name="message">${escapeHtml(g.message||"")}</textarea></label>
        <label class="wide">URL de imagen<input name="image_url" type="url" value="${escapeHtml(g.image_url||"")}" placeholder="https://..."></label>
        <label class="wide">URL de video (opcional)<input name="video_url" type="url" value="${escapeHtml(g.video_url||"")}" placeholder="https://..."></label>
        <div class="editor-buttons wide"><button type="button" class="small-btn danger" data-delete="${g.id}">Eliminar</button><button class="gold-btn" type="submit">Guardar cambios</button></div>
      </form>
    </article>`).join("");
  $("giftEditor").querySelectorAll("form").forEach(form=>form.addEventListener("submit",saveGift));
  $("giftEditor").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteGift(b.dataset.delete)));
}
async function saveGift(e){
  e.preventDefault();const id=e.currentTarget.dataset.form;const f=new FormData(e.currentTarget);
  const payload={day:Number(f.get("day")),unlock_date:f.get("unlock_date"),title:f.get("title"),message:f.get("message"),image_url:f.get("image_url")||null,video_url:f.get("video_url")||null};
  const {error}=await supabase.from("advent_gifts").update(payload).eq("id",id);
  if(error)alert("No se pudo guardar: "+error.message);else await loadApp();
}
async function deleteGift(id){
  if(!confirm("¿Eliminar este regalo? Esta acción no se puede deshacer."))return;
  const {error}=await supabase.from("advent_gifts").delete().eq("id",id);
  if(error)alert(error.message);else await loadApp();
}
async function createGift(){
  const used=new Set(gifts.map(g=>g.day));let day=Array.from({length:24},(_,i)=>i+1).find(n=>!used.has(n));
  if(!day){alert("Ya existen los 24 regalos.");return}
  const year=new Date().getFullYear();
  const {error}=await supabase.from("advent_gifts").insert({day,unlock_date:`${year}-12-${String(day).padStart(2,"0")}`,title:"Nueva sorpresa",message:""});
  if(error)alert(error.message);else await loadApp();
}
$("loginBtn").addEventListener("click",()=>currentUser? (isAdmin?show("adminPanel"):show("authModal")):show("authModal"));
$("authForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!supabase){message("Configura Supabase primero.");return}
  const {error}=await supabase.auth.signInWithPassword({email:$("email").value,password:$("password").value});
  if(error)message("No se pudo ingresar. Verifica tu correo y contraseña.");else{hide("authModal");message("")}
});
$("logoutBtn").addEventListener("click",async()=>{await supabase.auth.signOut();hide("adminPanel")});
$("newGiftBtn").addEventListener("click",createGift);
$("refreshBtn").addEventListener("click",loadApp);
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>hide(b.dataset.close)));
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)hide(m.id)}));
init();
