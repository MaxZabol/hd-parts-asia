let catalog = [];
let language = localStorage.getItem("hdpa-language") || "th";
let currency = localStorage.getItem("hdpa-currency") || "THB";
const THB_PER_USD = 34; // indicative display conversion; checkout/quote remains THB

const $ = (sel) => document.querySelector(sel);
const grid = $("#inventoryGrid");
const emptyState = $("#emptyState");
const searchInput = $("#searchInput");
const categoryFilter = $("#categoryFilter");
const statusFilter = $("#statusFilter");
const modal = $("#productModal");

function moneyTHB(value){
  if(value === null || value === undefined || value === "") return "Contact for price";
  if(currency==="USD"){
    return "≈ " + new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(Number(value)/THB_PER_USD);
  }
  return new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB",maximumFractionDigits:0}).format(value);
}
function moneyUSD(value){
  if(value === null || value === undefined || value === "") return "";
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);
}
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
function slugStatus(v=""){return v.toLowerCase().replaceAll(" ","-");}
function titleFor(p){return language==="th" ? (p.thaiTitle || p.title) : p.title;}
function descFor(p){return language==="th" ? (p.thaiDescription || p.shortDescription || "") : (p.shortDescription || "");}

function applyLanguage(){
  document.documentElement.lang = language;
  document.querySelectorAll("[data-th][data-en]").forEach(el=>{
    el.textContent = language==="th" ? el.dataset.th : el.dataset.en;
  });
  render();
}
$("#languageToggle").addEventListener("click",()=>{
  language = language==="th" ? "en" : "th";
  localStorage.setItem("hdpa-language",language);
  applyLanguage();
});
$("#currencyToggle").addEventListener("click",()=>{
  currency = currency==="THB" ? "USD" : "THB";
  localStorage.setItem("hdpa-currency",currency);
  $("#currencyToggle").textContent = currency==="THB" ? "฿ THB" : "$ USD";
  render();
});
$("#currencyToggle").textContent = currency==="THB" ? "฿ THB" : "$ USD";

function updateStats(){
  $("#availableCount").textContent = catalog.filter(p=>p.status==="Available").length;
  $("#comingSoonCount").textContent = catalog.filter(p=>p.status==="Coming Soon").length;
  $("#sourceCount").textContent = catalog.filter(p=>p.status==="Source Available").length;
}
function buildFilters(){
  const cats=[...new Set(catalog.map(p=>p.category).filter(Boolean))].sort();
  cats.forEach(c=>{
    const o=document.createElement("option");
    o.value=c;o.textContent=c;categoryFilter.appendChild(o);
  });
}
function filtered(){
  const q=searchInput.value.trim().toLowerCase();
  const cat=categoryFilter.value;
  const st=statusFilter.value;
  return catalog.filter(p=>{
    const hay=[p.sku,p.title,p.thaiTitle,p.oem,p.fitment,p.category,p.sourceType].join(" ").toLowerCase();
    return (!q || hay.includes(q)) && (!cat || p.category===cat) && (!st || p.status===st);
  });
}
function render(){
  const rows=filtered();
  grid.innerHTML="";
  emptyState.classList.toggle("hidden",catalog.length!==0);
  if(catalog.length!==0 && rows.length===0){
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1"><h3>No matching parts</h3><p>Try another OEM number, model, SKU, category, or status.</p></div>';
    return;
  }
  rows.forEach(p=>{
    const card=document.createElement("article");
    card.className="part-card";
    const photo=(p.photos && p.photos[0]) || "assets/placeholder.svg";
    card.innerHTML=`
      <div class="part-photo"><img src="${esc(photo)}" alt="${esc(titleFor(p))}" loading="lazy"></div>
      <div class="part-body">
        <div class="part-topline">
          <div><div class="sku">${esc(p.sku || "")}</div><div class="part-title">${esc(titleFor(p))}</div></div>
          <span class="badge ${slugStatus(p.status)}">${esc(p.status)}</span>
        </div>
        <div class="meta">
          ${p.oem ? "<div><b>OEM:</b> "+esc(p.oem)+"</div>" : ""}
          ${p.fitment ? "<div><b>Fits:</b> "+esc(p.fitment)+"</div>" : ""}
          ${p.condition ? "<div><b>Condition:</b> "+esc(p.condition)+"</div>" : ""}
        </div>
        <p class="meta">${esc(descFor(p))}</p>
        <div class="price-row">
          <div><div class="source-price">${p.priceLabel || "Thailand retail"}</div><div class="thai-price">${moneyTHB(p.thaiPriceTHB)}</div></div>
          ${p.shippingEstimate ? '<small>'+esc(p.shippingEstimate)+'<br><span class="dealer-hint">Dealer pricing available after sign in</span></small>' : '<small class="dealer-hint">Dealer pricing available after sign in</small>'}
        </div>
        <div class="card-actions three-actions">
          <button class="primary-action" data-open="${esc(p.sku)}">Details</button>
          <button class="favorite-action" data-favorite="${esc(p.sku)}" title="Favorite">♡</button>
          <button class="cart-action" data-cart="${esc(p.sku)}" title="Add to cart">🛒</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}
function openProduct(sku){
  const p=catalog.find(x=>x.sku===sku); if(!p)return;
  const photos=(p.photos && p.photos.length ? p.photos : ["assets/placeholder.svg"]);
  const photo=photos[0];
  const thumbs=photos.map((src,i)=>`
    <button class="gallery-thumb ${i===0 ? "active" : ""}" type="button" data-gallery-src="${esc(src)}" aria-label="Photo ${i+1}">
      <img src="${esc(src)}" alt="${esc(titleFor(p))} photo ${i+1}" loading="lazy">
    </button>`).join("");
  $("#modalContent").innerHTML=`
   <div class="modal-grid">
    <div class="modal-gallery">
      <div class="modal-image">
        <button class="gallery-nav prev" type="button" data-gallery-prev aria-label="Previous photo">‹</button>
        <img id="galleryMainImage" src="${esc(photo)}" alt="${esc(titleFor(p))}">
        <button class="gallery-nav next" type="button" data-gallery-next aria-label="Next photo">›</button>
      </div>
      <div class="gallery-thumbs">${thumbs}</div>
      <div class="gallery-count"><span id="galleryCurrent">1</span> / ${photos.length}</div>
    </div>
    <div class="modal-details">
      <span class="badge ${slugStatus(p.status)}">${esc(p.status)}</span>
      <h2>${esc(titleFor(p))}</h2><div class="sku">${esc(p.sku)}</div>
      <p>${esc(descFor(p))}</p>
      <dl class="detail-list">
        <dt>OEM</dt><dd>${esc(p.oem || "—")}</dd>
        <dt>Fitment</dt><dd>${esc(p.fitment || "—")}</dd>
        <dt>Condition</dt><dd>${esc(p.condition || "—")}</dd>
        <dt>Location</dt><dd>USA Stock</dd>
        <dt>Shipping</dt><dd>${esc(p.shippingEstimate || "Quote required")}</dd>
      </dl>
      <div class="thai-price">${moneyTHB(p.thaiPriceTHB)}</div>
      <div class="dealer-hint">Dealer pricing available after sign in</div>
      <div class="card-actions" style="margin-top:18px">
        <button class="favorite-action" data-favorite="${esc(p.sku)}">♡ Save</button>
        <button class="primary-action cart-action" data-cart="${esc(p.sku)}">🛒 Add to cart</button>
      </div>
    </div>
   </div>`;

  let active=0;
  const main=$("#galleryMainImage");
  const current=$("#galleryCurrent");
  const thumbButtons=[...document.querySelectorAll("[data-gallery-src]")];
  const showPhoto=(index)=>{
    active=(index+photos.length)%photos.length;
    main.src=photos[active];
    current.textContent=String(active+1);
    thumbButtons.forEach((b,i)=>b.classList.toggle("active",i===active));
    thumbButtons[active]?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
  };
  thumbButtons.forEach((b,i)=>b.addEventListener("click",()=>showPhoto(i)));
  document.querySelector("[data-gallery-prev]")?.addEventListener("click",()=>showPhoto(active-1));
  document.querySelector("[data-gallery-next]")?.addEventListener("click",()=>showPhoto(active+1));
  modal.showModal();
}
document.addEventListener("click",e=>{
  const open=e.target.closest("[data-open]");
  const favorite=e.target.closest("[data-favorite]");
  const cart=e.target.closest("[data-cart]");
  if(open) openProduct(open.dataset.open);
  if(favorite){
    const p=catalog.find(x=>x.sku===favorite.dataset.favorite);
    if(p && window.hdpaAddFavorite) window.hdpaAddFavorite(p);
  }
  if(cart){
    const p=catalog.find(x=>x.sku===cart.dataset.cart);
    if(p && window.hdpaAddCart) window.hdpaAddCart(p);
  }
});
$("#modalClose").addEventListener("click",()=>modal.close());
modal.addEventListener("click",e=>{if(e.target===modal)modal.close();});
[searchInput,categoryFilter,statusFilter].forEach(el=>el.addEventListener("input",render));
$("#year").textContent=new Date().getFullYear();

fetch("data/products.json",{cache:"no-store"})
 .then(r=>{if(!r.ok)throw new Error("catalog");return r.json();})
 .then(data=>{catalog=Array.isArray(data)?data:[];buildFilters();updateStats();applyLanguage();})
 .catch(()=>{catalog=[];updateStats();applyLanguage();});
