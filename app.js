// HIV PED
const N=v=>(v===null||v===undefined||v==="")?null:Number(v);
const round=(x,d=2)=> (typeof x==="number"&&isFinite(x))?Math.round(x*10**d)/10**d:"";
const BSA=(kg,cm)=> (kg&&cm)?Math.sqrt((kg*cm)/3600):null;
const dosesPerDay=f=>f==="q12h"?2:f==="q8h"?3:1;
const freqText=f=>f==="q24h"?"วันละครั้ง":f==="q12h"?"วันละ 2 ครั้ง":f==="q8h"?"วันละ 3 ครั้ง":"";

const LIQ10=10, BTL60=60, LPV_MGPL=80;
const TAB_3TC=150, TAB_ABC=300, TAB_AZT=300, TAB_DTG=50, TAB_TDF=300, TAB_FTC=200, TAB_TAF=25;

const CONFIG={
  neonatal:{
    AZTpf:{mg_per_kg:4,freq:"q12h",dur_by_risk:{low:14,standard:28,high:42},
      tip:"AZT prophylaxis: 4 mg/kg q12h. ระยะเวลา Low 14d / Standard 28d / High 42d."},
    "3TC":{by_age_wk:[{lt:4,mg_per_kg:2},{ge:4,mg_per_kg:4}],freq:"q12h",cap:150,
      tip:"3TC syrup 10 mg/mL: <4wk 2 mg/kg q12h; ≥4wk 4 mg/kg q12h (max 150 mg/ครั้ง)."},
    NVP:{mg_per_kg:4,freq:"q24h",dur:42,tip:"NVP syrup 4 mg/kg OD × 42 วัน (เฉพาะ high-risk, ใช้ร่วมกับ AZT+3TC)"}
  },
  pediatric:{
    "3TC":{by_wt:[{lt:14,mg_per_kg:4},{ge:14,mg_per_kg:5}],freq:"q12h",cap:150,
      tip:"3TC: <14kg 4 mg/kg; ≥14kg 5 mg/kg q12h; cap 150 mg/ครั้ง."},
    ABC:{mg_per_kg:8,freq:"q12h",cap:300,tip:"ABC 8 mg/kg q12h; cap 300 mg/ครั้ง."},
    AZTtx:{mg_per_m2:180,freq:"q12h",cap:300,tip:"AZT treatment 180 mg/m² q12h; cap 300 mg/ครั้ง."},
    LPVr_sol:{mg_per_kg_lop:12,freq:"q12h",mg_per_mL:LPV_MGPL,tip:"LPV/r solution (80/20 mg/mL) 12 mg/kg (lop) q12h."},
    LPVr_tab:{min_w_kg:25,tabs:1,mg_tab_lop:200,freq:"q12h",tip:"LPV/r tab 200/50 mg: ≥25 kg ⇒ 1 tab q12h."},
    EFV:{by_wt:[{lt:10,dose:null},{lt:15,dose:200},{lt:20,dose:250},{lt:25,dose:300},{lt:32.5,dose:350},{lt:40,dose:400},{ge:40,dose:600}],min_age_y:3,freq:"q24h",unit:200,tip:"EFV q24h: ≥3 ปี; 200–600 mg ตามน้ำหนัก."},
    DTG_disp:{by_wt:[{lt:3,dose:null},{lt:6,dose:5},{lt:10,dose:15},{lt:14,dose:20},{lt:20,dose:25},{lt:25,dose:25},{lt:30,dose:30},{ge:30,dose:30}],unit:10,freq_no_rif:"q24h",freq_with_rif:"q12h",tip:"DTG dispersible 10 mg: ถ้ามี Rifampicin ให้ q12h."},
    DTG_50:{min_w_kg:20,unit:50,dose:50,freq_no_rif:"q24h",freq_with_rif:"q12h",tip:"DTG 50 mg: ≥20 kg; +Rifampicin ⇒ 50 mg q12h."},
    TAF_FTC:{min_w_kg:25,allow_rif:false,freq:"q24h",label:"TAF/FTC 25/200 mg",tip:"TAF/FTC: ≥25 kg; ห้ามใช้กับ Rifampicin."},
    TDF_FTC:{min_w_kg:30,freq:"q24h",label:"TDF/FTC 300/200 mg",tip:"TDF/FTC: ≥30 kg."}
  }
};

const riskToDays=r=>CONFIG.neonatal.AZTpf.dur_by_risk[r]||28;
function riskInfoHTML(risk){
  const common=`<ul>
    <li><b>Low risk</b>: มารดา VL &lt;50 copies/mL ต่อเนื่อง และได้รับ ART ≥12 สัปดาห์ก่อนคลอด</li>
    <li><b>Standard risk</b>: VL ไม่ทราบ/รอผล หรือได้รับ ART ยังไม่ครบ 12 สัปดาห์</li>
    <li><b>High risk</b>: VL ≥50 copies/mL ใกล้คลอด/ไม่ได้รับ ART/adherence แย่/สงสัยติดเชื้อเฉียบพลัน</li>
  </ul>`;
  const rec=(risk==="low")?`AZT 4 mg/kg q12h x <b>14</b> วัน`:(risk==="standard")?`AZT 4 mg/kg q12h x <b>28</b> วัน`:`AZT+3TC+NVP ≈ <b>6 สัปดาห์</b>`;
  return common+`<div class="summary-hint">คำแนะนำ: ${rec}</div>`;
}
function updateRiskPanel(){ const r=document.getElementById('neoRisk')?.value||'standard'; document.getElementById('riskInfo').innerHTML=riskInfoHTML(r); }
function syncModeUI(){
  const neo=document.getElementById('mode').value==='neo';
  document.getElementById('neoInputs').classList.toggle('hidden',!neo);
  document.getElementById('pedsInputs').classList.toggle('hidden',neo);
  document.getElementById('riskPanel').classList.toggle('hidden',!neo);
  if(neo){ const d=document.getElementById('neoDays'); if(!d.value) d.value=riskToDays(document.getElementById('neoRisk').value); updateRiskPanel(); }
  clearResults();
}
function allowSet(){
  const neo = document.getElementById('mode').value === 'neo';
  if (neo){
    const r = document.getElementById('neoRisk').value;
    return (r === 'high') ? new Set(['AZTpf','3TC','NVP']) : new Set(['AZTpf']);
  }
  return new Set(['3TC','ABC','AZTtx','LPVr_sol','LPVr_tab','EFV','DTG_disp','DTG_50','TAF_FTC','TDF_FTC']);
}

function rowLiquid({drug,info,form,freq,mgDose,mlDose,days}){
  const dpd=dosesPerDay(freq); const totalML=(mlDose||0)*dpd*days; const bottles=Math.ceil(totalML/60);
  return {type:"liquid",drug,info,form,freq,mgDose,mlDose,days,dpd,totalML,bottles};
}
function rowTablet({drug,info,form,freq,mgDose,tabsPerDose,days}){
  const dpd=dosesPerDay(freq); const perDoseTabs=Math.ceil((tabsPerDose||0)); const totalTabs=perDoseTabs*dpd*days;
  return {type:"tablet",drug,info,form,freq,mgDose,tabsPerDose,perDoseTabs,days,dpd,totalTabs};
}
function renderLiquid(rows){
  let html=`<table><thead><tr>
<th class="no-print">Use</th><th>ชื่อยา</th><th>ข้อมูล</th><th>ความแรง</th><th>ความถี่</th><th>mg/ครั้ง</th><th>mL/ครั้ง</th><th>รวม mL</th><th>จำนวนขวด</th>
</tr></thead><tbody>`;
  rows.forEach((r,i)=>{
    const id=`li_${i}`; const invalid=(r.mgDose==null||r.mlDose==null);
    html+=`<tr class="${invalid?'invalid':''}">
<td class="no-print"><input type="checkbox" id="${id}"></td>
<td>${r.drug}</td><td>${r.info||''}</td><td>${r.form||''}</td><td>${freqText(r.freq)||''}</td>
<td>${round(r.mgDose)}</td><td>${round(r.mlDose)}</td><td>${round(r.totalML)}</td><td>${r.bottles}</td>
</tr>`;
  });
  html+=`</tbody></table>`;
  document.getElementById('results-liquid').innerHTML=html;
}
function renderTablet(rows){
  let html=`<table><thead><tr>
<th class="no-print">Use</th><th class="no-print">ละลายน้ำ</th><th>ชื่อยา</th><th>ข้อมูล</th><th>ความแรง</th><th>ความถี่</th><th>mg/ครั้ง</th><th>เม็ด/ครั้ง</th><th>เม็ดรวม</th>
</tr></thead><tbody>`;
  rows.forEach((r,i)=>{
    const id=`tb_${i}`; const invalid=(r.mgDose==null||r.tabsPerDose==null);
    html+=`<tr class="${invalid?'invalid':''}">
<td class="no-print"><input type="checkbox" id="${id}"></td>
<td class="no-print"><input type="checkbox" id="${id}_diss" data-dissolve="1"></td>
<td>${r.drug}</td><td>${r.info||''}</td><td>${r.form||''}</td><td>${freqText(r.freq)||''}</td>
<td>${round(r.mgDose)}</td><td>${r.perDoseTabs}</td><td>${r.totalTabs}</td>
</tr>`;
  });
  html+=`</tbody></table>`;
  document.getElementById('results-tablet').innerHTML=html;
}
function bestWaterVol(tabsPerDose){
  const need=tabsPerDose||0; const tabs=Math.ceil(need||0);
  if(tabs<=0) return {tabs:0,V:10,drink:0};
  let best={V:10,drink:10*need/tabs,score:1};
  for(let V=1;V<=10;V++){
    const drink=V*need/tabs;
    const frac=Math.abs(drink-Math.round(drink));
    const frac05=Math.abs(drink*2-Math.round(drink*2));
    const score=(frac<1e-6?0:(frac05<1e-6?0.1:frac));
    if(score<best.score-1e-9 || (Math.abs(score-best.score)<1e-9 && V<best.V)){
      best={V,drink:Math.round(drink*(score===0?1:(score<=0.1?10:10)))/(score===0?1:(score<=0.1?10:10)),score};
    }
  }
  return {...best,tabs};
}
function buildSummary(liquidRows,tabletRows){
  const liqChecked=[],tabChecked=[],tabDiss=[];
  (liquidRows||[]).forEach((r,i)=>{ if(document.getElementById(`li_${i}`)?.checked) liqChecked.push(r); });
  (tabletRows||[]).forEach((r,i)=>{ if(document.getElementById(`tb_${i}`)?.checked){ tabChecked.push(r); tabDiss.push(!!document.getElementById(`tb_${i}_diss`)?.checked);} });
  let html=''; const mode=document.getElementById('mode').value;
  if(mode==='neo'){ const risk=document.getElementById('neoRisk').value; const d=document.getElementById('neoDays').value || riskToDays(risk);
    html+=`<div class="summary-hint">สรุป (Neonatal): ตามความเสี่ยง <b>${risk}</b> • ระยะเวลา <b>${d} วัน</b></div>`; }
  if(liqChecked.length){
    html+=`<h3>ยาน้ำ (Liquid)</h3><table><thead><tr><th>ชื่อยา</th><th>ขนาด/ความแรง</th><th>mL/ครั้ง</th><th>ความถี่</th><th>จำนวนวัน</th><th>จำนวนขวด</th></tr></thead><tbody>`;
    liqChecked.forEach(r=>{ html+=`<tr><td>${r.drug}</td><td>${r.form}</td><td>${round(r.mlDose)}</td><td>${freqText(r.freq)}</td><td>${r.days}</td><td>${r.bottles}</td></tr>`; });
    html+=`</tbody></table>`;
  }
  if(tabChecked.length){
    html+=`<h3>ยาเม็ด (Tablet)</h3><table><thead><tr><th>ชื่อยา</th><th>ขนาด/ความแรง</th><th>เม็ด/ครั้ง</th><th>จำนวนวัน</th><th>เม็ดรวม</th><th>วิธีรับประทาน/ผสม</th></tr></thead><tbody>`;
    tabChecked.forEach((r,idx)=>{
      const dissolve=tabDiss[idx]; let method='';
      if(dissolve){ const plan=bestWaterVol(r.tabsPerDose||0); method=`ละลาย <b>${plan.tabs}</b> เม็ด ในน้ำ <b>${plan.V} mL</b> แล้ว <b>ดื่ม ${plan.drink} mL</b> (ทิ้งส่วนที่เหลือทุกครั้ง)`; }
      else{ method=`รับประทานตามขนาดที่คำนวณไว้ (${r.perDoseTabs} เม็ด/ครั้ง) • ${freqText(r.freq)}`; }
      html+=`<tr><td>${r.drug}</td><td>${r.form}</td><td>${r.perDoseTabs}</td><td>${r.days}</td><td>${r.totalTabs}</td><td>${method}</td></tr>`;
    });
    html+=`</tbody></table>`;
  }
  document.getElementById('staff-summary').innerHTML= html || '<div class="summary-hint">โปรดติ๊กเลือกยาที่ต้องการ</div>';
}
document.addEventListener('change',e=>{ if(e.target?.matches('input[type=checkbox]')) buildSummary(window.__rows?.liquid,window.__rows?.tablet); });

function calcNeonatal(){
  const kg=N(document.getElementById('neoW').value); const wk=N(document.getElementById('neoWk').value);
  let days=N(document.getElementById('neoDays').value); const risk=document.getElementById('neoRisk').value;
  if(!(kg>0)) return; if(!days) days=riskToDays(risk);
  const show=allowSet(); const liq=[]; const tab=[];
  if(show.has("AZTpf")){ const c=CONFIG.neonatal.AZTpf; const mg=kg*c.mg_per_kg;
    liq.push(rowLiquid({drug:"Zidovudine (AZT) — prophylaxis",info:c.tip,form:"Syrup 10 mg/mL",freq:c.freq,mgDose:mg,mlDose:mg/LIQ10,days})); }
  if(show.has("3TC")){ const c=CONFIG.neonatal["3TC"]; const band=(wk<4)?c.by_age_wk[0]:c.by_age_wk[1]; let mg=kg*band.mg_per_kg; if(c.cap) mg=Math.min(mg,c.cap);
    liq.push(rowLiquid({drug:"Lamivudine (3TC)",info:c.tip,form:"Syrup 10 mg/mL",freq:c.freq,mgDose:mg,mlDose:mg/LIQ10,days})); }
  if (show.has("NVP")){
  const c = CONFIG.neonatal.NVP;
  const mg = kg * c.mg_per_kg;
  const daysNVP = 42;
  liq.push(rowLiquid({
    drug:"Nevirapine (NVP) — prophylaxis",
    info:c.tip,
    form:"Syrup 10 mg/mL",
    freq:c.freq,
    mgDose:mg,
    mlDose:mg/10,
    days:daysNVP
  }));
}
window.__rows={liquid:liq,tablet:tab}; renderLiquid(liq); renderTablet(tab); buildSummary(liq,tab);
}
function pickByBand(val,bands){ for(const b of bands){ if(b.lt!=null && val<b.lt) return b; if(b.ge!=null && val>=b.ge) return b; } return bands[bands.length-1]; }
function calcPeds(){
  const kg=N(document.getElementById('pW').value); const y=N(document.getElementById('pY').value);
  const cm=N(document.getElementById('pH').value); const days=N(document.getElementById('pDays').value);
  const rif=document.getElementById('pRif').value; if(!(kg>0)) return; const bsa=BSA(kg,cm);
  const show=allowSet(); const liq=[]; const tab=[];
  if(show.has("3TC")){ const c=CONFIG.pediatric["3TC"]; const mgkg=(kg<14)?c.by_wt[0].mg_per_kg:c.by_wt[1].mg_per_kg; let mg=kg*mgkg; if(c.cap) mg=Math.min(mg,c.cap);
    liq.push(rowLiquid({drug:"Lamivudine (3TC)",info:c.tip,form:"Syrup 10 mg/mL",freq:c.freq,mgDose:mg,mlDose:mg/LIQ10,days}));
    tab.push(rowTablet({drug:"Lamivudine (3TC)",info:c.tip,form:`Tablet ${TAB_3TC} mg`,freq:c.freq,mgDose:mg,tabsPerDose:mg/TAB_3TC,days})); }
  if(show.has("ABC")){ const c=CONFIG.pediatric.ABC; let mg=kg*c.mg_per_kg; if(c.cap) mg=Math.min(mg,c.cap);
    tab.push(rowTablet({drug:"Abacavir (ABC)",info:c.tip,form:`Tablet ${TAB_ABC} mg`,freq:c.freq,mgDose:mg,tabsPerDose:mg/TAB_ABC,days})); }
  if(show.has("AZTtx")){ const c=CONFIG.pediatric.AZTtx; const mg=bsa?Math.min(c.mg_per_m2*bsa,c.cap):null;
    liq.push(rowLiquid({drug:"Zidovudine (AZT) — Tx",info:c.tip,form:"Syrup 10 mg/mL",freq:c.freq,mgDose:mg,mlDose:mg?mg/LIQ10:null,days}));
    tab.push(rowTablet({drug:"Zidovudine (AZT) — Tx",info:c.tip,form:`Tablet ${TAB_AZT} mg`,freq:c.freq,mgDose:mg,tabsPerDose:mg?mg/TAB_AZT:null,days})); }
  if(show.has("LPVr_sol")){ const c=CONFIG.pediatric.LPVr_sol; const mg=kg*c.mg_per_kg_lop;
    liq.push(rowLiquid({drug:"Lopinavir/ritonavir (LPV/r) — solution",info:c.tip,form:`Sol ${c.mg_per_mL}/20 mg/mL`,freq:c.freq,mgDose:mg,mlDose:mg/c.mg_per_mL,days})); }
  if(show.has("LPVr_tab")){ const c=CONFIG.pediatric.LPVr_tab; const ok=kg>=c.min_w_kg;
    tab.push(rowTablet({drug:"Lopinavir/ritonavir (LPV/r) — tablet",info:c.tip,form:"Tablet 200/50 mg",freq:c.freq,mgDose:ok?c.mg_tab_lop:null,tabsPerDose:ok?c.tabs:null,days})); }
  if(show.has("EFV")){ const c=CONFIG.pediatric.EFV; const age_ok=(y!=null && y>=c.min_age_y); let dose=null;
    if(age_ok){ const b=pickByBand(kg,c.by_wt); dose=b?b.dose:null; }
    tab.push(rowTablet({drug:"Efavirenz (EFV)",info:c.tip,form:"Capsule/Tablet",freq:c.freq,mgDose:dose,tabsPerDose:dose?dose/c.unit:null,days})); }
  if(show.has("DTG_disp")){ const c=CONFIG.pediatric.DTG_disp; const b=pickByBand(kg,c.by_wt); const freq=(rif==="yes")?c.freq_with_rif:c.freq_no_rif; const dose=b?b.dose:null;
    tab.push(rowTablet({drug:"Dolutegravir (DTG) dispersible",info:c.tip,form:`DTG dispersible ${c.unit} mg`,freq,mgDose:dose,tabsPerDose:dose?dose/c.unit:null,days})); }
  if(show.has("DTG_50")){ const c=CONFIG.pediatric.DTG_50; const ok=kg>=c.min_w_kg; const freq=(rif==="yes")?c.freq_with_rif:c.freq_no_rif;
    tab.push(rowTablet({drug:"Dolutegravir (DTG) 50 mg",info:c.tip,form:`DTG ${c.unit} mg`,freq,mgDose:ok?c.dose:null,tabsPerDose:ok?1:null,days})); }
  if(show.has("TAF_FTC")){ const c=CONFIG.pediatric.TAF_FTC; const ok=(kg>=c.min_w_kg)&&(rif==="no");
    tab.push(rowTablet({drug:"TAF/FTC (FDC)",info:c.tip,form:c.label,freq:c.freq,mgDose: ok?1:null,tabsPerDose:ok?1:null,days})); }
  if(show.has("TDF_FTC")){ const c=CONFIG.pediatric.TDF_FTC; const ok=(kg>=c.min_w_kg);
    tab.push(rowTablet({drug:"TDF/FTC (FDC)",info:c.tip,form:c.label,freq:c.freq,mgDose: ok?1:null,tabsPerDose:ok?1:null,days})); }
  if (show.has("NVP")){
  const c = CONFIG.neonatal.NVP;
  const mg = kg * c.mg_per_kg;
  const daysNVP = 42;
  liq.push(rowLiquid({
    drug:"Nevirapine (NVP) — prophylaxis",
    info:c.tip,
    form:"Syrup 10 mg/mL",
    freq:c.freq,
    mgDose:mg,
    mlDose:mg/10,
    days:daysNVP
  }));
}
window.__rows={liquid:liq,tablet:tab}; renderLiquid(liq); renderTablet(tab); buildSummary(liq,tab);
}
function clearResults(){
  document.getElementById('results-liquid').innerHTML="";
  document.getElementById('results-tablet').innerHTML="";
  document.getElementById('staff-summary').innerHTML='<div class="summary-hint">โปรดติ๊กเลือกยาที่ต้องการ</div>';
}
function clearAllInputs(){
  ['neoW','neoWk','neoDays'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
  const r=document.getElementById('neoRisk'); if(r) r.value='low';
  ['pW','pH','pY','pDays'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
  const rif=document.getElementById('pRif'); if(rif) rif.value='no';
  clearResults();
}
document.addEventListener('click',e=>{
  const t=e.target.closest('.tab'); if(!t) return;
  t.parentElement.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  const tab=t.dataset.tab;
  document.getElementById('results-liquid').classList.toggle('hidden',tab!=='liquid');
  document.getElementById('results-tablet').classList.toggle('hidden',tab!=='tablet');
});
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('mode').value='neo'; syncModeUI();
  document.getElementById('mode').addEventListener('change',syncModeUI);
  document.getElementById('neoRisk').addEventListener('change',()=>{ const d=document.getElementById('neoDays'); if(!d.value) d.value=riskToDays(document.getElementById('neoRisk').value); updateRiskPanel(); clearResults(); });
  document.getElementById('btnCalc').addEventListener('click',()=>{ (document.getElementById('mode').value==='neo'?calcNeonatal:calcPeds)(); });
  document.getElementById('btnClear').addEventListener('click',clearAllInputs);
  document.getElementById('btnPrint').addEventListener('click',()=>{ document.body.classList.add('print-summary'); window.print(); setTimeout(()=>document.body.classList.remove('print-summary'),500); });
});
