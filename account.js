const sb = window.supabase.createClient(window.HDPA_SUPABASE_URL, window.HDPA_SUPABASE_KEY);
let hdpaUser = null;
let hdpaAuthMode = "signin";

const authModal = document.getElementById("authModal");
const accountModal = document.getElementById("accountModal");
const authMessage = document.getElementById("authMessage");
const profileMessage = document.getElementById("profileMessage");
const quoteMessage = document.getElementById("quoteMessage");

function setMsg(el, msg, type=""){
  if(!el) return;
  el.textContent = msg || "";
  el.className = "form-message" + (type ? " " + type : "");
}
function moneyTHB2(v){
  if(v===null || v===undefined || v==="") return "—";
  return new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB",maximumFractionDigits:0}).format(v);
}
function setAuthMode(mode){
  hdpaAuthMode = mode;
  const signup = mode === "signup";
  document.getElementById("authTitle").textContent = signup ? "Create account" : "Sign in";
  document.getElementById("authSubmit").textContent = signup ? "Create account" : "Sign in";
  document.getElementById("toggleAuthMode").textContent = signup ? "Already have an account? Sign in" : "Create an account";
  document.getElementById("signupFields").classList.toggle("hidden", !signup);
  setMsg(authMessage,"");
}
async function refreshAuthUI(){
  document.getElementById("accountButton").textContent = hdpaUser ? (hdpaUser.email?.split("@")[0] || "Account") : "Sign in";
  await refreshCounts();
}
async function getActiveCart(){
  if(!hdpaUser) return null;
  const {data,error}=await sb.from("carts").select("id").eq("user_id",hdpaUser.id).eq("status","active").maybeSingle();
  if(error) throw error;
  return data;
}
async function ensureActiveCart(){
  let cart=await getActiveCart();
  if(cart) return cart.id;
  const {data,error}=await sb.from("carts").insert({user_id:hdpaUser.id}).select("id").single();
  if(error) throw error;
  return data.id;
}
async function refreshCounts(){
  const cartCount=document.getElementById("cartCount");
  const favCountEl=document.getElementById("favoritesCount");
  if(!hdpaUser){
    if(cartCount) cartCount.textContent="0";
    if(favCountEl) favCountEl.textContent="0";
    ["dashCartCount","dashFavoriteCount","dashQuoteCount","dashOrderCount"].forEach(id=>{
      const el=document.getElementById(id); if(el) el.textContent="0";
    });
    return;
  }
  let qty=0;
  const cart=await getActiveCart();
  if(cart){
    const {data}=await sb.from("cart_items").select("quantity").eq("cart_id",cart.id);
    qty=(data||[]).reduce((n,x)=>n+(x.quantity||1),0);
  }
  const [{count:favs},{count:quotes},{count:orders}]=await Promise.all([
    sb.from("favorites").select("*",{count:"exact",head:true}).eq("user_id",hdpaUser.id),
    sb.from("quote_requests").select("*",{count:"exact",head:true}).eq("user_id",hdpaUser.id),
    sb.from("orders").select("*",{count:"exact",head:true}).eq("user_id",hdpaUser.id)
  ]);
  if(cartCount) cartCount.textContent=qty;
  if(favCountEl) favCountEl.textContent=favs||0;
  document.getElementById("dashCartCount").textContent=qty;
  document.getElementById("dashFavoriteCount").textContent=favs||0;
  document.getElementById("dashQuoteCount").textContent=quotes||0;
  document.getElementById("dashOrderCount").textContent=orders||0;
}
async function loadProfile(){
  const {data}=await sb.from("profiles").select("*").eq("id",hdpaUser.id).maybeSingle();
  if(!data) return;
  document.getElementById("profileFullName").value=data.full_name||"";
  document.getElementById("profileCompany").value=data.company_name||"";
  document.getElementById("profilePhone").value=data.phone||"";
  document.getElementById("profileLine").value=data.line_id||"";
  document.getElementById("profileWhatsapp").value=data.whatsapp||"";
  document.getElementById("profileCountry").value=data.country||"Thailand";
  document.getElementById("profileAddress").value=data.shipping_address||"";
  document.getElementById("accountGreeting").textContent=data.company_name||data.full_name||"My Account";
}
async function loadCart(){
  const box=document.getElementById("accountCartList");
  const cart=await getActiveCart();
  if(!cart){ box.innerHTML='<p class="muted">Your cart is empty.</p>'; return; }
  const {data}=await sb.from("cart_items").select("*").eq("cart_id",cart.id);
  const items=data||[];
  box.innerHTML=items.length ? items.map(x=>'<div class="mini-row"><div><b>'+((x.thai_title||x.title)||"")+'</b><br><small>'+x.sku+' × '+x.quantity+'</small></div><strong>'+moneyTHB2((Number(x.unit_price_thb)||0)*x.quantity)+'</strong></div>').join("") : '<p class="muted">Your cart is empty.</p>';
}
async function loadHistory(){
  const [q,o]=await Promise.all([
    sb.from("quote_requests").select("quote_number,status,total_thb,created_at").eq("user_id",hdpaUser.id).order("created_at",{ascending:false}).limit(5),
    sb.from("orders").select("order_number,status,total_thb,created_at").eq("user_id",hdpaUser.id).order("created_at",{ascending:false}).limit(5)
  ]);
  const rows=[
    ...(q.data||[]).map(x=>({kind:"Quote",num:x.quote_number||"Pending",...x})),
    ...(o.data||[]).map(x=>({kind:"Order",num:x.order_number||"Pending",...x}))
  ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,8);
  document.getElementById("historyList").innerHTML=rows.length ? rows.map(x=>'<div class="mini-row"><div><b>'+x.kind+' '+x.num+'</b><br><small>'+x.status+'</small></div><strong>'+moneyTHB2(x.total_thb)+'</strong></div>').join("") : '<p class="muted">No quotes or orders yet.</p>';
}
async function openAccount(){
  if(!hdpaUser){ authModal.showModal(); return; }
  document.getElementById("accountEmail").textContent=hdpaUser.email||"";
  await Promise.all([loadProfile(),loadCart(),loadHistory(),refreshCounts()]);
  accountModal.showModal();
}

document.getElementById("accountButton").addEventListener("click",openAccount);
document.getElementById("cartButton").addEventListener("click",openAccount);
document.getElementById("favoritesButton").addEventListener("click",openAccount);
document.getElementById("authClose").addEventListener("click",()=>authModal.close());
document.getElementById("accountClose").addEventListener("click",()=>accountModal.close());
document.getElementById("toggleAuthMode").addEventListener("click",()=>setAuthMode(hdpaAuthMode==="signin"?"signup":"signin"));

document.getElementById("authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=document.getElementById("emailInput").value.trim();
  const password=document.getElementById("passwordInput").value;
  try{
    if(hdpaAuthMode==="signup"){
      const fullName=document.getElementById("fullNameInput").value.trim();
      const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:fullName,preferred_language:"th"}}});
      if(error) throw error;
      if(data.user && data.session){
        await sb.from("profiles").update({
          full_name:fullName,
          account_type:document.getElementById("accountTypeInput").value,
          company_name:document.getElementById("companyInput").value.trim()||null
        }).eq("id",data.user.id);
      }
      setMsg(authMessage,data.session?"Account created.":"Account created. Check your email to confirm your account.","success");
    } else {
      const {error}=await sb.auth.signInWithPassword({email,password});
      if(error) throw error;
      authModal.close();
    }
  }catch(err){ setMsg(authMessage,err.message||String(err),"error"); }
});

document.getElementById("profileForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!hdpaUser) return;
  const {error}=await sb.from("profiles").update({
    full_name:document.getElementById("profileFullName").value.trim()||null,
    company_name:document.getElementById("profileCompany").value.trim()||null,
    phone:document.getElementById("profilePhone").value.trim()||null,
    line_id:document.getElementById("profileLine").value.trim()||null,
    whatsapp:document.getElementById("profileWhatsapp").value.trim()||null,
    country:document.getElementById("profileCountry").value.trim()||null,
    shipping_address:document.getElementById("profileAddress").value.trim()||null
  }).eq("id",hdpaUser.id);
  setMsg(profileMessage,error?error.message:"Profile saved.",error?"error":"success");
});

document.getElementById("signOutButton").addEventListener("click",async()=>{
  await sb.auth.signOut();
  accountModal.close();
});

document.getElementById("requestQuoteButton").addEventListener("click",async()=>{
  setMsg(quoteMessage,"");
  const cart=await getActiveCart();
  if(!cart){ setMsg(quoteMessage,"Cart is empty.","error"); return; }
  const {data:items}=await sb.from("cart_items").select("*").eq("cart_id",cart.id);
  if(!items?.length){ setMsg(quoteMessage,"Cart is empty.","error"); return; }
  const subtotal=items.reduce((sum,x)=>sum+(Number(x.unit_price_thb)||0)*(x.quantity||1),0);
  const quoteNumber="TH-"+Date.now().toString().slice(-8);
  const {data:q,error}=await sb.from("quote_requests").insert({
    quote_number:quoteNumber,user_id:hdpaUser.id,status:"requested",parts_subtotal_thb:subtotal
  }).select("id").single();
  if(error){ setMsg(quoteMessage,error.message,"error"); return; }
  const rows=items.map(x=>({quote_id:q.id,sku:x.sku,title:x.title,thai_title:x.thai_title,quantity:x.quantity,unit_price_thb:x.unit_price_thb,source_type:x.source_type,source_url:x.source_url,image_url:x.image_url}));
  const {error:itemError}=await sb.from("quote_items").insert(rows);
  if(itemError){ setMsg(quoteMessage,itemError.message,"error"); return; }
  await sb.from("carts").update({status:"submitted"}).eq("id",cart.id);
  setMsg(quoteMessage,"Quote "+quoteNumber+" submitted. We will calculate combined shipping.","success");
  await Promise.all([loadCart(),loadHistory(),refreshCounts()]);
});

window.hdpaAddFavorite = async function(p){
  if(!hdpaUser){authModal.showModal();return;}
  await sb.from("favorites").upsert({
    user_id:hdpaUser.id,sku:p.sku,title:p.title,thai_title:p.thaiTitle||null,image_url:(p.photos&&p.photos[0])||null,thai_price_thb:p.thaiPriceTHB||null
  },{onConflict:"user_id,sku"});
  await refreshCounts();
};
window.hdpaAddCart = async function(p){
  if(!hdpaUser){authModal.showModal();return;}
  const cartId=await ensureActiveCart();
  const {data:existing}=await sb.from("cart_items").select("id,quantity").eq("cart_id",cartId).eq("sku",p.sku).maybeSingle();
  if(existing){
    await sb.from("cart_items").update({quantity:existing.quantity+1}).eq("id",existing.id);
  }else{
    await sb.from("cart_items").insert({
      cart_id:cartId,sku:p.sku,title:p.title,thai_title:p.thaiTitle||null,quantity:1,unit_price_thb:p.thaiPriceTHB||null,source_type:p.sourceType||null,source_url:p.sourceUrl||null,image_url:(p.photos&&p.photos[0])||null,availability_status:p.status||null
    });
  }
  await refreshCounts();
};

sb.auth.onAuthStateChange(async(_event,session)=>{ hdpaUser=session?.user||null; await refreshAuthUI(); });
sb.auth.getSession().then(async({data})=>{ hdpaUser=data.session?.user||null; await refreshAuthUI(); });
setAuthMode("signin");
