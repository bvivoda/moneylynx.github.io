import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, DEF_LISTS, T, CHART_COLORS, BACKUP_SNOOZE_MS } from '../lib/constants.js';
import { fmtEur, monthOf, curYear, curMonthIdx, needsBackupReminder, expandSplits } from '../lib/helpers.js';
import { Ic, LynxLogo } from './ui.jsx';
import { categoryIcon } from '../lib/categoryIcons.js';
import { useAdvisor } from '../hooks/useAdvisor.js';

const CHART_TREND_ICON = "data:image/png;base64,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";
const WALLET_GAUGE_ICON = "data:image/png;base64,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";
function Dashboard({ C, data, setTxs, year, user, lists, setPage, setTxFilter, onQuickAdd, t, lang, prefs, updPrefs, setSubPg, syncing, supaUser, fmt: fmtProp, fmtD, onGoToTransactions }) {
  const fmt = fmtProp || fmtEur;
  const cmIdx = curMonthIdx();
  const cm     = MONTHS[cmIdx];
  const cmName = lang === "en" ? MONTHS_EN[cmIdx] : cm;
  const MONTHS_GEN_HR = ["siječnja","veljače","ožujka","travnja","svibnja","lipnja","srpnja","kolovoza","rujna","listopada","studenoga","prosinca"];
  const projectionMonthLabel = lang === "en" ? `Projection at the end of ${cmName}` : `Projekcija na kraju ${MONTHS_GEN_HR[cmIdx]}`;

  const yd = data.filter(x => new Date(x.date).getFullYear() === year);
  const md = yd.filter(x => monthOf(x.date) === cm);

  const inc = yd.filter(x => x.type === "Primitak").reduce((s,x) => s + (+x.amount||0), 0);
  const exp = yd.filter(x => x.type === "Isplata").reduce((s,x) => s + (+x.amount||0), 0);
  const bal = inc - exp;

  const mI = md.filter(x => x.type === "Primitak").reduce((s,x) => s + (+x.amount||0), 0);
  const mE = md.filter(x => x.type === "Isplata" && x.status === "Plaćeno").reduce((s,x) => s + (+x.amount||0), 0);

  // ── Daily Limit calculations ────────────────────────────────────────────────
  // x = svi primici tekućeg mjeseca (plaćeni + očekivani iz recurring)
  // y = svi izdaci tekućeg mjeseca (plaćeni + pending + recurring koji nisu plaćeni)
  // A = (x - y) / dani_do_kraja_mjeseca - B
  const [dlSavingsEdit, setDlSavingsEdit] = useState(false);
  const [dlDetailOpen, setDlDetailOpen] = useState(false); // savings detail cards open by default
  const [dlSavingsInput, setDlSavingsInput] = useState("");
  const [dlSavingsPeriod, setDlSavingsPeriod] = useState(() => prefs?.plannedSavingsPeriod || "monthly");

  const plannedSavingsRaw = parseFloat(prefs?.plannedSavings) || 0;
  const savedPeriod = prefs?.plannedSavingsPeriod || "monthly";
  // Normalize to monthly for formula
  const plannedSavings = savedPeriod === "yearly" ? plannedSavingsRaw / 12 : plannedSavingsRaw;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - today.getDate();

  // Next payday: find largest recurring income, compute days until next dueDate.
  // Use CATEGORY (not description) so EN mode auto-translates ("Plaća" → "Salary").
  // For HR locative case formatting ("do plaće"), apply runtime case mapping.
  const HR_LOCATIVE = {
    "Plaća": "plaće",
    "Uplata": "uplate",
    "Ostali primici": "sljedećeg primitka",
  };
  const nextPayday = (() => {
    const recInc = lists.recurring_income || [];
    if (recInc.length === 0) return null;
    // Find largest by amount
    const biggest = recInc.reduce((best, r) => (parseFloat(r.amount)||0) > (parseFloat(best.amount)||0) ? r : best, recInc[0]);
    // Field is stored as `dueDate` in RecurringEditor — accept both for backwards compat
    const dayRaw = biggest.dueDate ?? biggest.dueDay;
    const dDay = Math.max(1, Math.min(28, parseInt(dayRaw)||1));
    const tDay = today.getDate();
    // Days until next occurrence
    let daysUntil;
    if (dDay >= tDay) {
      daysUntil = dDay - tDay;
    } else {
      // Next month
      const nextOcc = new Date(today.getFullYear(), today.getMonth()+1, dDay);
      daysUntil = Math.ceil((nextOcc - today) / 86400000);
    }
    // Display label:
    //  - EN: translated category ("Salary", "Deposit") via t()
    //  - HR: locative form ("plaće", "uplate") for grammatical "do plaće"
    const cat = biggest.category || "";
    const label = lang === "en"
      ? (cat ? t(cat) : t("primitka"))
      : (HR_LOCATIVE[cat] || cat.toLowerCase() || "sljedećeg primitka");
    return { name: label, days: daysUntil, dDay };
  })();

  const daysLeftYear = (() => { const e=new Date(today.getFullYear(),11,31); return Math.ceil((e-today)/86400000); })();

  // x = monthly income (paid + upcoming recurring this month)
  const recIncUnpaid = (lists.recurring_income||[]).filter(r=>!md.find(x=>x.recurringIncomeId===r.id)).reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
  const xIncome = mI + recIncUnpaid;

  // xYear = yearly income (all year + remaining recurring months)
  const ydYear = data.filter(x=>new Date(x.date).getFullYear()===today.getFullYear());
  const monthsLeft = 12-(today.getMonth()+1);
  const xIncomeYear = ydYear.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0)
    + (lists.recurring_income||[]).reduce((s,r)=>s+(parseFloat(r.amount)||0)*monthsLeft,0);

  // y = monthly expenses (paid + pending + unpaid recurring)
  const mEPending = md.filter(x=>x.type==="Isplata"&&x.status!=="Plaćeno").reduce((s,x)=>s+(+x.amount||0),0);
  const recUnpaid = (lists.recurring||[]).filter(r=>!md.find(x=>x.recurringId===r.id)).reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
  const yExpenses = mE + mEPending + recUnpaid;

  // yYear = yearly expenses + remaining recurring
  const yExpensesYear = ydYear.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0)
    + (lists.recurring||[]).reduce((s,r)=>s+(parseFloat(r.amount)||0)*monthsLeft,0);

  // Savings validation: reject if exceeds available funds
  const maxSavings = savedPeriod==="yearly" ? Math.max(0,xIncomeYear-yExpensesYear) : Math.max(0,xIncome-yExpenses);
  const savingsExceedsIncome = plannedSavingsRaw > 0 && plannedSavingsRaw > maxSavings && maxSavings > 0;

  // Effective daily savings contribution
  const effectiveSavings = savedPeriod==="yearly"
    ? (daysLeftYear>0 ? plannedSavingsRaw*(daysLeft/daysLeftYear) : 0)
    : plannedSavings;
  const dailyLimitRaw = daysLeft>0 ? (xIncome-yExpenses-effectiveSavings)/daysLeft : 0;
  const dailyLimit = Math.round(dailyLimitRaw * 100) / 100;
  const dlGood = dailyLimit >= 0;

  // ── Savings metrics for detail cards ─────────────────────────────────────
  const plannedMonthly = savedPeriod === "yearly" ? plannedSavingsRaw / 12 : plannedSavings;
  const plannedYearly  = savedPeriod === "yearly" ? plannedSavingsRaw : plannedSavings * 12;
  // "Ušteđeno do sada" = net surplus this month (paid income - paid expenses)
  const savedSoFar     = Math.max(0, mI - mE);
  const savingsProgress = plannedMonthly > 0 ? Math.min(1, savedSoFar / plannedMonthly) : 0;
  const savingsProgressColor = savingsProgress >= 1 ? C.income : savingsProgress >= 0.5 ? C.warning : C.expense;
  const dlColor = dailyLimit >= 20 ? C.income : dailyLimit >= 0 ? C.warning : C.expense;

  const { forecast, anomalies, insights } = useAdvisor(data, lists, fmt, t);
  const [forecastOpen, setForecastOpen] = useState(false);

  // ── To-Do items ────────────────────────────────────────────────────────────
  const todoItems = useMemo(() => {
    const items = [];
    const today = new Date(); today.setHours(23,59,59,999);
    data.filter(x =>
      x.type === "Isplata" &&
      (x.status === "Čeka plaćanje" || x.status === "U obradi") &&
      new Date(x.date) <= today
    ).forEach(x => items.push({ kind:"tx", id:x.id, date:x.date, description:x.description, category:x.category, location:x.location, amount:parseFloat(x.amount)||0, status:x.status }));

    const rec = lists.recurring || [];
    const recTxsIds = new Set(md.filter(x => x.recurringId).map(x => x.recurringId));
    const cy = new Date().getFullYear(), cmi = new Date().getMonth();
    rec.forEach(r => {
      if (recTxsIds.has(r.id)) return;
      const day = Math.max(1, Math.min(28, parseInt(r.dueDate ?? r.dueDay)||1));
      items.push({ kind:"recurring", id:r.id, date:new Date(cy,cmi,day).toISOString().split("T")[0], description:r.description, category:r.category, location:r.location, amount:parseFloat(r.amount)||0, recurring:r });
    });
    // ── Upcoming recurring income ────────────────────────────────────────
    const recInc = lists.recurring_income || [];
    const recIncPaidIds = new Set(md.filter(x => x.recurringIncomeId).map(x => x.recurringIncomeId));
    const todayDate = new Date();
    recInc.forEach(r => {
      if (recIncPaidIds.has(r.id)) return;
      const day = Math.max(1, Math.min(28, parseInt(r.dueDate ?? r.dueDay)||1));
      // If dueDay already passed this month → show next month's occurrence
      let incDate;
      if (day < todayDate.getDate()) {
        incDate = new Date(cy, cmi + 1, day);
      } else {
        incDate = new Date(cy, cmi, day);
      }
      items.push({ kind:"recurring_income", id:r.id, date:incDate.toISOString().split("T")[0], description:r.description, category:r.category, amount:parseFloat(r.amount)||0, recurring:r });
    });

    return items.sort((a,b) => a.date.localeCompare(b.date));
  }, [data, md, lists.recurring, lists.recurring_income]);

  const payTodoItem = (item) => {
    if (!setTxs) return;
    try { navigator.vibrate?.(40); } catch {}
    const today = new Date().toISOString().split("T")[0];
    if (item.kind === "tx") { setTxs(p => p.map(x => x.id === item.id ? {...x, status:"Plaćeno", date:today} : x)); return; }
    const r = item.recurring;
    if (item.kind === "recurring_income") {
      setTxs(p => [...p, { id:Date.now().toString(), type:"Primitak", date:today, description:r.description, amount:r.amount, category:r.category||"Plaća", location:"Ostalo", payment:r.payment||"Bankovni prijenos", status:"Plaćeno", notes:r.notes||"", recurringIncomeId:r.id, installments:0 }]);
      return;
    }
    setTxs(p => [...p, { id:Date.now().toString(), type:"Isplata", date:today, description:r.description, amount:r.amount, category:r.category, location:r.location, payment:r.payment, status:"Plaćeno", notes:r.notes||"", recurringId:r.id, installments:0 }]);
  };

  const catsMonth = useMemo(() => {
    const m = {};
    expandSplits(md.filter(x => x.type === "Isplata")).forEach(x => { m[x.category]=(m[x.category]||0)+(parseFloat(x.amount)||0); });
    return Object.entries(m).map(([name,value]) => ({name,value})).sort((a,b) => b.value-a.value);
  }, [md]);

  const now = new Date();
  const wd  = now.toLocaleDateString(lang==="en"?"en-US":"hr-HR",{weekday:"short"}).replace(".","").toUpperCase();
  const dd  = String(now.getDate()).padStart(2,"0");
  const mm  = String(now.getMonth()+1).padStart(2,"0");
  const yy  = now.getFullYear();
  const W   = Math.min(window.innerWidth??480,480)-64;
  const VH  = typeof window !== "undefined" ? Math.min(window.innerHeight || 720, 900) : 720;
  const todoMaxHeight = Math.max(88, Math.min(116, Math.round(VH * 0.13)));
  const dn  = [user.firstName, user.lastName].filter(Boolean).join(" ");

  const insightColor = (color) => ({ income:C.income, expense:C.expense, warning:C.warning, accent:C.accent }[color] || C.accent);
  const visibleInsights = insights.filter(ins => ins.type !== "forecast");

  // Forecast projection line — shown inside balance card
  const forecastBal = forecast.hasHistory && forecast.daysLeft > 0 ? forecast.projectedBalance : null;
  const forecastColor = forecastBal === null ? null : forecastBal >= 0 ? C.income : C.expense;

  // Positive month comparison vs last year (for mini-cards)
  const lastYrME = useMemo(() => {
    const ly = year - 1;
    return data.filter(x => new Date(x.date).getFullYear()===ly && monthOf(x.date)===cm && x.type==="Isplata" && x.status==="Plaćeno").reduce((s,x)=>s+(+x.amount||0),0);
  }, [data, year, cm]);
  const monthImprovement = lastYrME > 0 && mE > 0 ? (lastYrME - mE) / lastYrME : null;

  // Empty state onboarding steps
  const onboardingSteps = useMemo(() => {
    const hasTx   = data.length > 0;
    const hasRec  = (lists.recurring||[]).length > 0;
    const hasBudg = lists.budgets && Object.keys(lists.budgets).some(k => lists.budgets[k] > 0);
    return [
      { done:hasTx,  icon:"💳", title:t("Dodaj prvu transakciju"), body:t("Zabileži prihod ili trošak — aplikacija počinje učiti tvoje navike."), action:()=>setPage("add"), cta:t("Dodaj sada →") },
      { done:hasRec, icon:"🔄", title:t("Dodaj redovnu obvezu"), body:t("Najam, pretplate, kredit — jednom dodaj, aplikacija te svaki mjesec podsjeća."), action:()=>{setPage("settings");setSubPg&&setSubPg("recurring");}, cta:t("Postavi obveze →") },
      { done:hasBudg,icon:"🎯", title:t("Postavi budžet kategorije"), body:t("Odredi limit za npr. Hranu ili Zabavu — aplikacija upozori kad se priblizavaš."), action:()=>{setPage("settings");setSubPg&&setSubPg("budgets");}, cta:t("Postavi budžet →") },
    ];
  }, [data, lists]);

  return (
    <div className="fi" style={{ width:"100%" }}>
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div className="hdr" style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, display:"flex", alignItems:"center", gap:8, color:C.accent }}>
              <LynxLogo s={22} color={C.accent}/> {t("Moja Lova")} <span style={{fontSize:14,color:C.textMuted,fontWeight:500,verticalAlign:"middle",position:"relative",top:2}}>· {year}.</span>
            </h1>
            {dn && <span style={{ fontSize:12, color:C.textMuted, marginTop:3, paddingLeft:30 }}>{t("Bok,")} {user.firstName || dn}!</span>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {syncing && <span title={t("Sinkronizacija…")} style={{ width:8,height:8,borderRadius:"50%",background:C.warning,display:"inline-block",animation:"pulse 1s infinite" }}/>}
            {!syncing && supaUser && <span title={supaUser.email} style={{ width:8,height:8,borderRadius:"50%",background:C.income,display:"inline-block" }}/>}
            <button onClick={onQuickAdd} style={{ background:`${C.warning}18`,border:`1px solid ${C.warning}50`,borderRadius:12,padding:"6px 10px",fontSize:12,fontWeight:700,color:C.warning,display:"flex",alignItems:"center",gap:5,cursor:"pointer",boxShadow:`0 2px 10px ${C.warning}20` }}>
              <Ic n="zap" s={14} c={C.warning}/> {t("Brzi unos")}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding:"12px 16px 0" }}>
        {/* Backup reminder */}
        {needsBackupReminder(prefs) && (
          <div className="su" style={{ background:`linear-gradient(135deg,${C.warning}28,${C.warning}14)`, border:`1px solid ${C.warning}60`, borderRadius:14, padding:"12px 14px", marginBottom:10, display:"flex", alignItems:"center", gap:10 }}>
            <div onClick={()=>{setPage("settings");setSubPg&&setSubPg("general");}} style={{ flex:1,display:"flex",alignItems:"center",gap:10,cursor:"pointer" }}>
              <div style={{ width:36,height:36,borderRadius:10,background:`${C.warning}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Ic n="dl" s={18} c={C.warning}/></div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:2 }}>{t("Davno nisi napravio backup")}</div>
                <div style={{ fontSize:11,color:C.textMuted,lineHeight:1.35 }}>{t("Klikni ovdje da sačuvaš kopiju podataka.")}</div>
              </div>
              <Ic n="chevron" s={14} c={C.warning} style={{ transform:"rotate(-90deg)",flexShrink:0 }}/>
            </div>
            <button onClick={e=>{e.stopPropagation();updPrefs({backupSnoozedUntil:Date.now()+BACKUP_SNOOZE_MS});}} title={t("Podsjeti me za 7 dana")} style={{ background:"transparent",border:"none",padding:4,cursor:"pointer",color:C.textMuted,flexShrink:0 }}>
              <Ic n="x" s={14} c={C.textMuted}/>
            </button>
          </div>
        )}

        {/* ── 1. HERO BALANCE CARD — ultra-modern redesign ────────── */}
        <div className="su" onClick={() => forecast.hasHistory && setForecastOpen(v => !v)}
          style={{ background:bal>=0?`linear-gradient(135deg,${C.accent}18 0%,${C.income}12 100%)`:`linear-gradient(135deg,${C.expense}22 0%,${C.accent}10 100%)`, border:`1.5px solid ${bal>=0?C.income:C.expense}35`, borderRadius:22, padding:"18px 18px 16px", marginBottom:10, position:"relative", overflow:"hidden", cursor: forecast.hasHistory ? "pointer" : "default",
            boxShadow:`0 4px 24px ${bal>=0?C.income:C.expense}18` }}>
          {/* Background decoration */}
          <div style={{ position:"absolute",right:-30,top:-30,width:120,height:120,borderRadius:"50%",background:`${bal>=0?C.income:C.expense}12`,pointerEvents:"none" }}/>
          <div style={{ position:"absolute",right:20,bottom:-20,width:80,height:80,borderRadius:"50%",background:`${C.accent}08`,pointerEvents:"none" }}/>

          {/* Top row: label + date */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:bal>=0?C.income:C.expense,boxShadow:`0 0 6px ${bal>=0?C.income:C.expense}` }}/>
              <span style={{ fontSize:11,fontWeight:600,color:C.textSub,letterSpacing:.5,textTransform:"uppercase" }}>{t("Stanje na dan")}</span>
            </div>
            <div style={{ textAlign:"right" }}>
              <span style={{ fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:C.textSub }}>{dd}.{mm}.</span>
              <span style={{ fontSize:10,color:C.textMuted,marginLeft:3 }}>{yy}.</span>
            </div>
          </div>

          {/* Balance amount */}
          <div style={{ fontSize:bal>=0&&Math.abs(bal)<10000?36:32,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:bal>=0?C.income:C.expense,letterSpacing:-1,lineHeight:1.1,marginBottom:2 }}>{fmt(bal)}</div>

          {/* Inline forecast row */}
          {forecastBal !== null && (
            <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${bal>=0?C.income:C.expense}25`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, color:C.textMuted, display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ fontSize:12 }}>📊</span> {projectionMonthLabel}
              </span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:13, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:forecastColor }}>
                  {forecastBal >= 0 ? "+" : ""}{fmt(forecastBal)}
                </span>
                <Ic n="chevron" s={11} c={C.textMuted} style={{ transform: forecastOpen ? "rotate(90deg)" : "rotate(-90deg)", transition:"transform .2s" }}/>
              </div>
            </div>
          )}

          {/* Expandable forecast detail */}
          {forecastOpen && forecast.hasHistory && (
            <div className="su" style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${forecastColor}30` }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                {[
                  { lb:t("Plaćeno"),  val:fmt(forecast.paidSoFar),    col:C.expense },
                  { lb:t("Obveze"),   val:fmt(forecast.recurringLeft), col:C.accent  },
                  { lb:t("Procjena"),  val:fmt(forecast.discForecast), col:C.textMuted },
                  { lb:t("Prihodi"),  val:fmt(forecast.incomeSoFar),   col:C.income  },
                  { lb:t("U čekanju"),val:fmt(forecast.pendingKnown),  col:C.warning },
                  { lb:`${forecast.daysLeft} ${t("dana")}`, val:`${fmt(forecast.dailyDisc)}/${t("dan")}`, col:C.textMuted },
                ].map(({lb,val,col:c}) => (
                  <div key={lb} style={{ background:`${C.bg}80`, borderRadius:8, padding:"6px 8px", border:`1px solid ${c}20` }}>
                    <div style={{ fontSize:9,color:C.textMuted,marginBottom:2,textTransform:"uppercase",letterSpacing:.4 }}>{lb}</div>
                    <div style={{ fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:c }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ position:"absolute",right:-20,top:-20,width:90,height:90,borderRadius:"50%",background:`${bal>=0?C.income:C.expense}10` }}/>
        </div>

        {/* ── 2. MINI CARDS — modern glassmorphism style ──────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
          <div className="su" style={{ background:C.card,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.income}`,borderRadius:14,padding:"10px 12px" }}>
            <div style={{ fontSize:10,color:C.textMuted,marginBottom:3,display:"flex",alignItems:"center",gap:4 }}><Ic n="up" s={13} c={C.income}/>{cmName} {t("primici")}</div>
            <div style={{ fontSize:14,fontWeight:700,color:C.income,fontFamily:"'JetBrains Mono',monospace" }}>{fmt(mI)}</div>
          </div>
          <div className="su" style={{ background:C.card,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.expense}`,borderRadius:14,padding:"10px 12px" }}>
            <div style={{ fontSize:10,color:C.textMuted,marginBottom:3,display:"flex",alignItems:"center",gap:4 }}><Ic n="down" s={13} c={C.expense}/>{cmName} {t("plaćeno")}</div>
            <div style={{ display:"flex",alignItems:"baseline",gap:6 }}>
              <div style={{ fontSize:14,fontWeight:700,color:C.expense,fontFamily:"'JetBrains Mono',monospace" }}>{fmt(mE)}</div>
              {/* YoY improvement badge */}
              {monthImprovement !== null && monthImprovement >= 0.05 && (
                <span style={{ fontSize:10,fontWeight:700,color:C.income,background:`${C.income}18`,borderRadius:8,padding:"1px 5px",display:"flex",alignItems:"center",gap:2 }}>
                  ↓{Math.round(monthImprovement*100)}%
                </span>
              )}
              {monthImprovement !== null && monthImprovement < -0.05 && (
                <span style={{ fontSize:10,fontWeight:700,color:C.expense,background:`${C.expense}18`,borderRadius:8,padding:"1px 5px",display:"flex",alignItems:"center",gap:2 }}>
                  ↑{Math.round(Math.abs(monthImprovement)*100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {yd.length === 0 ? (
          /* ── EMPTY STATE — onboarding guide ─────────────────────────── */
          <div className="su" style={{ marginTop:8 }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ width:60,height:60,borderRadius:20,background:`linear-gradient(135deg,${C.accent},${C.accentDk})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:`0 4px 15px ${C.accentGlow}`,cursor:"pointer" }}
                onClick={()=>setPage("add")}>
                <Ic n="plus" s={28} c="#fff"/>
              </div>
              <h3 style={{ fontSize:17,fontWeight:700,color:C.text,marginBottom:6 }}>{t("Dobrodošao u Moja Lova!")}</h3>
              <p style={{ fontSize:13,color:C.textMuted,lineHeight:1.5 }}>{t("Prati financije u 3 koraka:")}</p>
            </div>

            {onboardingSteps.map((step, i) => (
              <div key={i} onClick={!step.done ? step.action : undefined}
                style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",background:step.done?`${C.income}08`:C.cardAlt,border:`1px solid ${step.done?C.income+"40":C.border}`,borderRadius:14,marginBottom:8,cursor:step.done?"default":"pointer",transition:"all .2s" }}>
                <div style={{ width:36,height:36,borderRadius:11,background:step.done?`${C.income}20`:`${C.accent}15`,border:`1px solid ${step.done?C.income:C.accent}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18 }}>
                  {step.done ? "✅" : step.icon}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:step.done?C.income:C.text,marginBottom:3,display:"flex",alignItems:"center",gap:6 }}>
                    {step.title}
                    {step.done && <span style={{ fontSize:10,fontWeight:700,color:C.income }}>✓</span>}
                  </div>
                  <div style={{ fontSize:11,color:C.textMuted,lineHeight:1.4 }}>{step.body}</div>
                </div>
                {!step.done && (
                  <span style={{ fontSize:11,fontWeight:700,color:C.accent,flexShrink:0,whiteSpace:"nowrap",alignSelf:"center" }}>{step.cta}</span>
                )}
              </div>
            ))}

            <div style={{ textAlign:"center",marginTop:8,padding:"10px 0" }}>
              <button onClick={()=>setPage("add")} style={{ background:`linear-gradient(135deg,${C.accent},${C.accentDk})`,border:"none",borderRadius:14,padding:"12px 28px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 15px ${C.accentGlow}` }}>
                <Ic n="plus" s={16} c="#fff" style={{ marginRight:6,verticalAlign:"middle" }}/>{t("Dodaj prvu transakciju")}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── 3. ZA PLATITI — moved up, compact, 4 items max ─────── */}
            {todoItems.length === 0 ? (
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                <div className="su" style={{ flex:1, background:C.card,border:`1px solid ${C.income}40`,borderLeft:`4px solid ${C.income}`,borderRadius:14,padding:"10px 14px",display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:30,height:30,borderRadius:9,background:`${C.income}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <Ic n="check" s={15} c={C.income}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:C.income }}>{t("Sve obveze podmirene!")}</div>
                    <div style={{ fontSize:10,color:C.textMuted,marginTop:1 }}>{cmName} {year}.</div>
                  </div>
                </div>
                <div className="su" onClick={()=>setPage("journey")}
                  style={{ background:`linear-gradient(135deg,${C.accent}18,${C.accent}08)`, border:`1px solid ${C.accent}40`, borderRadius:14, padding:"10px 12px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, cursor:"pointer", flexShrink:0, minWidth:64 }}>
                  <Ic n="run" s={18} c={C.accent}/>
                  <span style={{ fontSize:10, fontWeight:700, color:C.accent }}>{t("Trening")}</span>
                </div>
              </div>
            ) : (
              <div className="su" style={{ background:C.card,border:`1px solid ${C.warning}40`,borderLeft:`4px solid ${C.warning}`,borderRadius:14,marginBottom:10,overflow:"hidden" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px 7px",borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:11,fontWeight:600,color:C.warning,display:"flex",alignItems:"center",gap:5 }}>
                    <Ic n="coins" s={12} c={C.warning}/>
                    {todoItems.some(i=>i.kind==="recurring_income") && todoItems.some(i=>i.kind!=="recurring_income")
                      ? t("Dospijeva")
                      : todoItems.every(i=>i.kind==="recurring_income")
                      ? t("Za naplatiti")
                      : t("Za platiti")}
                    <span style={{ background:`${C.warning}25`,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700,color:C.warning }}>{todoItems.length}</span>
                  </div>
                  <div style={{ fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:C.warning }}>{(() => {
                    // Sum only items that match the header context:
                    //  - All items are recurring_income → show income total ("To collect")
                    //  - Otherwise → show expenses only (recurring_income excluded, since
                    //    pending income isn't money you owe — it's money you're waiting for).
                    const allIncome = todoItems.every(i=>i.kind==="recurring_income");
                    const filtered = allIncome
                      ? todoItems
                      : todoItems.filter(i => i.kind !== "recurring_income");
                    return fmt(filtered.reduce((s,i)=>s+i.amount,0));
                  })()}</div>
                </div>
                {/* Scrollable list — fits ~3.5 items, scrolls if more. Subtle bottom fade hints at more content below. */}
                <div style={{ position:"relative" }}>
                  <div style={{
                    padding:"6px 10px",
                    display:"flex",
                    flexDirection:"column",
                    gap:5,
                    maxHeight: todoMaxHeight,
                    overflowY: todoItems.length > 2 ? "auto" : "visible",
                    overscrollBehavior: "contain",
                    WebkitOverflowScrolling: "touch",
                  }}>
                    {todoItems.map(item => (
                      <div key={item.kind+"-"+item.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:C.cardAlt,borderRadius:9,border:`1px solid ${C.border}`,flexShrink:0 }}>
                        <div style={{ width:26,height:26,borderRadius:7,background:item.kind==="recurring_income"?`${C.income}15`:item.kind==="recurring"?`${C.accent}15`:`${C.warning}15`,border:`1px solid ${item.kind==="recurring_income"?C.income:item.kind==="recurring"?C.accent:C.warning}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13 }}>
                          {item.kind==="recurring_income" ? "💵" : categoryIcon(item.category)}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:12,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.description || t(item.category)}</div>
                          <div style={{ fontSize:10,color:C.textMuted,display:"flex",alignItems:"center",gap:3,marginTop:1 }}>
                            <Ic n="cal" s={9} c={C.textMuted}/>{new Date(item.date).getDate()}.{new Date(item.date).getMonth()+1}.
                            {item.kind==="recurring" && <span style={{ color:C.accent,fontWeight:600 }}>· {t("Redovna obveza")}</span>}
                            {item.kind==="recurring_income" && <span style={{ color:C.income,fontWeight:600 }}>· {t("Redovni primitak")}</span>}
                          </div>
                        </div>
                        <div style={{ fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:C.text,flexShrink:0 }}>{fmt(item.amount)}</div>
                        <button onClick={()=>payTodoItem(item)} style={{ padding:"4px 8px",background:C.income,border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0 }}>
                          <Ic n="check" s={10} c="#fff"/>
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Bottom fade hint — only when scroll is active */}
                  {todoItems.length > 2 && (
                    <div style={{ position:"absolute", left:0, right:0, bottom:0, height:14, pointerEvents:"none", background:`linear-gradient(180deg, transparent 0%, ${C.card} 95%)` }}/>
                  )}
                </div>
                {/* Footer — always visible */}
                <div style={{ padding:"6px 12px 8px", borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                  <button onClick={()=>{ if (onGoToTransactions) onGoToTransactions("overdue"); else { if(setTxFilter)setTxFilter("overdue"); setPage("transactions"); } }}
                    style={{ flex:1, padding:"5px 0", background:"transparent", border:"none", color:C.accent, fontSize:11, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
                    {todoItems.length > 3 ? `${t("Prikaži sve")} (${todoItems.length}) →` : `${t("Otvori transakcije")} →`}
                  </button>
                  <div onClick={()=>setPage("journey")}
                    style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 0", width:110, height:36, justifyContent:"center", background:`${C.accent}15`, border:`1px solid ${C.accent}35`, borderRadius:8, cursor:"pointer", flexShrink:0 }}>
                    <Ic n="run" s={13} c={C.accent}/>
                    <span style={{ fontSize:11, fontWeight:700, color:C.accent }}>{t("Trening")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── 3b. DAILY LIMIT WIDGET ──────────────────────────────── */}
            <div className="su" style={{ background:C.card, border:`1px solid ${dlColor}40`, borderRadius:18, padding:"14px 16px", marginBottom:10, overflow:"hidden", position:"relative" }}>
              {/* Subtle background glow */}
              <div style={{ position:"absolute", top:0, right:0, width:120, height:120, borderRadius:"50%", background:`${dlColor}12`, transform:"translate(30%,-30%)", pointerEvents:"none" }}/>

              {/* Header row */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, marginRight:-4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:`${dlColor}20`, border:`1px solid ${dlColor}25`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                    <Ic n="gauge" s={20} c={dlColor}/>                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:C.textSub, textTransform:"uppercase", letterSpacing:.5 }}>{t("Dnevni limit potrošnje")}</div>
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:1 }}>
                      {nextPayday && nextPayday.days <= 31
                        ? <>{nextPayday.days === 0 ? t("Danas") : `${nextPayday.days} ${t("dana do")} ${nextPayday.name}`}</>
                        : <>{daysLeft} {t("dana do kraja mjeseca")}</>
                      }
                    </div>
                  </div>
                </div>
                {/* Savings edit button */}
                <button onClick={() => {
                    if (dlDetailOpen && dlSavingsEdit) {
                      // Both open → close both
                      setDlDetailOpen(false); setDlSavingsEdit(false);
                    } else {
                      // Open both
                      setDlDetailOpen(true); setDlSavingsEdit(true);
                      setDlSavingsInput(plannedSavingsRaw > 0 ? String(plannedSavingsRaw) : "");
                      setDlSavingsPeriod(savedPeriod);
                    }
                  }}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"0 12px", height:36, width:110, justifyContent:"center", background:`${C.accent}15`, border:`1px solid ${C.accent}35`, borderRadius:8, cursor:"pointer", flexShrink:0, fontSize:11, fontWeight:700, color:C.accent }}>
                  <Ic n="wallet" s={13} c={C.accent}/>
                  <span>{t("Štednja")}</span>
                </button>
              </div>

              {/* Main daily limit number */}
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, marginBottom:10 }}>
                <div style={{ fontSize:36, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", color:dlColor, lineHeight:1 }}>
                  {dlGood ? "" : "-"}{fmt(Math.abs(dailyLimit))}
                </div>
                <div style={{ fontSize:16, color:dlColor, marginBottom:5, fontWeight:700, opacity:.75 }}>{t("/ dan")}</div>
              </div>

              {/* Status message */}
              <div style={{ fontSize:12, color:dlColor, fontWeight:600, marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
                <span>{dailyLimit >= 20 ? "✅" : dailyLimit >= 0 ? "⚠️" : "🚨"}</span>
                <span>
                  {dailyLimit >= 20
                    ? t("Dobro si! Možeš trošiti ovaj iznos dnevno.")
                    : dailyLimit >= 0
                    ? t("Pažnja — mali prostor za potrošnju.")
                    : t("Prekoračenje — smanji rashode ili štednju.")}
                </span>
              </div>

              {/* ── Savings detail cards (toggle with 💸) ─────────── */}
              {dlDetailOpen && (
                <div style={{ marginBottom: dlSavingsEdit ? 10 : 0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <div style={{ flex:1, height:1, background:C.border }}/>
                    <span style={{ fontSize:9, fontWeight:700, color:C.textMuted, letterSpacing:1, textTransform:"uppercase" }}>{t("Štednja")}</span>
                    <div style={{ flex:1, height:1, background:C.border }}/>
                  </div>
                  <div style={{ display:"flex", gap:7, marginBottom:8 }}>
                    <div style={{ flex:1, background:C.cardAlt, borderRadius:12, padding:"8px 9px", border:`1px solid ${C.income}30` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:5 }}>
                        <span style={{ fontSize:12 }}>💰</span>
                        <span style={{ fontSize:9, fontWeight:700, color:C.income, textTransform:"uppercase", letterSpacing:.5 }}>{t("Mjes.")}</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", color:C.income }}>{fmt(plannedMonthly)}</div>
                      <div style={{ fontSize:9, color:C.textMuted, marginTop:3, fontStyle:"italic" }}>{t("planirano")}</div>
                    </div>
                    <div style={{ flex:1, background:C.cardAlt, borderRadius:12, padding:"8px 9px", border:`1px solid ${C.accent}30` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:5 }}>
                        <span style={{ fontSize:12 }}>📅</span>
                        <span style={{ fontSize:9, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:.5 }}>{t("God.")}</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", color:C.accent }}>{fmt(plannedYearly)}</div>
                      <div style={{ fontSize:9, color:C.textMuted, marginTop:3, fontStyle:"italic" }}>{t("planirano")}</div>
                    </div>
                    <div style={{ flex:1, background:C.cardAlt, borderRadius:12, padding:"8px 9px", border:`1.5px solid ${savingsProgressColor}50` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:5 }}>
                        <span style={{ fontSize:12 }}>{savingsProgress >= 1 ? "🏆" : savingsProgress >= .5 ? "📊" : "🎯"}</span>
                        <span style={{ fontSize:9, fontWeight:700, color:savingsProgressColor, textTransform:"uppercase", letterSpacing:.5 }}>{t("Ovaj mj.")}</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", color:savingsProgressColor }}>{fmt(savedSoFar)}</div>
                      {plannedMonthly > 0 ? (
                        <div style={{ marginTop:4 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                            <span style={{ fontSize:8, color:C.textMuted }}>{Math.min(100,Math.round(savingsProgress*100))}%</span>
                            <span style={{ fontSize:8, color:savingsProgressColor, fontWeight:700 }}>{t("cilj:")} {fmt(plannedMonthly)}</span>
                          </div>
                          <div style={{ height:4, borderRadius:3, background:`${C.textMuted}20` }}>
                            <div style={{ height:"100%", width:`${Math.min(100,savingsProgress*100)}%`, background:`linear-gradient(90deg,${savingsProgressColor}90,${savingsProgressColor})`, borderRadius:3, transition:"width .5s" }}/>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize:8, color:C.textMuted, marginTop:3, fontStyle:"italic" }}>{t("slobodan novac")}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}


              {/* Otvori/Zatvori štednju toggle */}
              <div onClick={() => { setDlDetailOpen(v=>!v); if (!dlDetailOpen) setDlSavingsEdit(false); }}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, cursor:"pointer", padding:"6px 0 2px", marginBottom:4 }}>
                <span style={{ fontSize:11, color:C.accent, fontWeight:600 }}>
                  {dlDetailOpen ? t("Zatvori štednju") : t("Otvori štednju")}
                </span>
                <span style={{ fontSize:11, color:C.accent, transform:dlDetailOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform .2s", display:"inline-block" }}>▼</span>
              </div>
              {/* Savings input panel */}
              {dlSavingsEdit && (
                <div style={{ marginTop:10 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, letterSpacing:.3 }}>{t("Planirana štednja")}</div>
                    <div style={{ display:"flex", gap:6 }}>
                      {[{k:"monthly",lhr:"Mjesečno",len:"Monthly"},{k:"yearly",lhr:"Godišnje",len:"Yearly"}].map(opt=>(
                        <button key={opt.k} type="button" onClick={(e)=>{e.stopPropagation();setDlSavingsPeriod(opt.k);}}
                          style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20, cursor:"pointer", border:`1px solid ${dlSavingsPeriod===opt.k?C.accent:C.border}`, background:dlSavingsPeriod===opt.k?C.accent:"transparent", color:dlSavingsPeriod===opt.k?"#fff":C.textMuted, transition:"all .2s" }}>
                          {t(opt.lhr)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:C.textMuted, marginBottom:6 }}>{dlSavingsPeriod==="monthly" ? t("Iznos koji odvajate svaki mjesec") : t("Godišnji iznos — dijelit će se s 12")}</div>
                  {savingsExceedsIncome && (
                    <div style={{ fontSize:10, color:C.expense, fontWeight:600, marginBottom:8, padding:"4px 8px", background:`${C.expense}12`, borderRadius:6, border:`1px solid ${C.expense}30` }}>
                      ⚠️ {t("Planirana štednja premašuje raspoložive prihode")}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ flex:1, position:"relative" }}>
                    <input
                      type="number" min="0" step="10"
                      value={dlSavingsInput}
                      onChange={e => setDlSavingsInput(e.target.value)}
                      placeholder="0"
                      style={{ width:"100%", background:C.cardAlt, border:`1.5px solid ${C.accent}60`, borderRadius:10, padding:"8px 36px 8px 10px", fontSize:14, fontWeight:700, color:C.text, fontFamily:"'JetBrains Mono',monospace", outline:"none", boxSizing:"border-box" }}
                      autoFocus
                    />
                    <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:12, color:C.textMuted, fontWeight:600 }}>€</span>
                  </div>
                  <button
                    onClick={() => {
                      const v = parseFloat(dlSavingsInput) || 0;
                      updPrefs({ plannedSavings: v, plannedSavingsPeriod: dlSavingsPeriod });
                      setDlSavingsEdit(false);
                    }}
                    style={{ background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    {t("Spremi")}
                  </button>
                  <button
                    onClick={() => setDlSavingsEdit(false)}
                    style={{ background:C.cardAlt, color:C.textMuted, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 12px", fontSize:13, cursor:"pointer" }}>
                    ✕
                  </button>
                </div>
                </div>
              )}
            </div>

            {/* ── 4. ADVISOR INSIGHTS — anomalies + positive ──────────── */}
            {visibleInsights.length > 0 && (
              <div style={{ marginBottom:10 }}>
                {visibleInsights.map((ins, i) => {
                  const col = insightColor(ins.color);
                  return (
                    <div key={i} className="su"
                      style={{ background:`linear-gradient(135deg,${col}18,${col}08)`, border:`1px solid ${col}40`, borderLeft:`4px solid ${col}`, borderRadius:14, padding:"9px 12px", marginBottom:i<visibleInsights.length-1?6:0, animationDelay:`${i*.05}s` }}>
                      <div style={{ display:"flex",alignItems:"flex-start",gap:8 }}>
                        {ins.icon === 'WALLET_GAUGE' ? <Ic n="gauge" s={18} c={col} style={{flexShrink:0}}/> : ins.icon === 'CHART_TREND' ? <Ic n="bar" s={18} c={col} style={{flexShrink:0}}/> : <span style={{ fontSize:15,flexShrink:0,lineHeight:1.3 }}>{ins.icon}</span>}
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:12,fontWeight:700,color:col,marginBottom:1 }}>{ins.title}</div>
                          <div style={{ fontSize:11,color:C.textMuted,lineHeight:1.4 }}>{ins.body}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 5. TOP KATEGORIJE — horizontal bar chart, mobile-optimized ── */}
            {catsMonth.length > 0 && (() => {
              const topN     = catsMonth.slice(0, 4);
              const maxVal   = topN[0].value;
              const totalAll = catsMonth.reduce((s,c)=>s+c.value, 0);
              const totalTop = topN.reduce((s,c)=>s+c.value, 0);
              return (
                <div className="su" style={{ background:C.card,border:`1px solid ${C.accent}40`,borderLeft:`4px solid ${C.accent}`,borderRadius:14,padding:"10px 12px 8px",marginBottom:10 }}>
                  {/* Header row: title + total */}
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9,paddingBottom:7,borderBottom:`1px solid ${C.border}40` }}>
                    <div style={{ fontSize:11,fontWeight:600,color:C.textMuted,display:"flex",alignItems:"center",gap:5 }}>
                      <Ic n="tag" s={12} c={C.textMuted}/>{t("Top kategorije")} · {cmName}
                    </div>
                    <div style={{ fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:C.text }}>
                      {fmt(totalTop)}
                    </div>
                  </div>

                  {/* Bar rows */}
                  <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                    {topN.map((c, i) => {
                      const pctMax   = Math.max(2, Math.round((c.value / maxVal) * 100));
                      const pctTotal = totalAll > 0 ? Math.round((c.value / totalAll) * 100) : 0;
                      const color    = CHART_COLORS[i % CHART_COLORS.length];
                      const isHot    = !!anomalies.find(a => a.category === c.name);
                      return (
                        <div key={c.name} style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <span style={{ fontSize:14,flexShrink:0,lineHeight:1,width:18,textAlign:"center" }}>{categoryIcon(c.name)}</span>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3,gap:6 }}>
                              <span style={{ fontSize:11,fontWeight:500,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0 }}>{t(c.name)}</span>
                              <div style={{ display:"flex",alignItems:"center",gap:5,flexShrink:0 }}>
                                {isHot && (
                                  <span title={t("Iznad prosjeka")} style={{ fontSize:9,fontWeight:700,color:C.warning,background:`${C.warning}20`,borderRadius:6,padding:"1px 5px",lineHeight:1.3 }}>↑</span>
                                )}
                                <span style={{ fontSize:10,color:C.textMuted,fontFamily:"'JetBrains Mono',monospace",fontWeight:500 }}>{pctTotal}%</span>
                                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:11,color:C.text,minWidth:48,textAlign:"right" }}>{fmt(c.value)}</span>
                              </div>
                            </div>
                            {/* Bar */}
                            <div style={{ height:7,background:`${C.cardAlt}`,borderRadius:4,overflow:"hidden",boxShadow:`inset 0 1px 1px rgba(0,0,0,.08)` }}>
                              <div style={{
                                height:"100%",
                                width:`${pctMax}%`,
                                background:`linear-gradient(90deg, ${color}AA 0%, ${color} 60%, ${color} 100%)`,
                                borderRadius:4,
                                transition:"width .55s cubic-bezier(.2,.8,.2,1)",
                                boxShadow:`0 1px 2px ${color}40`
                              }}/>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {catsMonth.length > 4 && (
                    <button onClick={()=>{setPage("charts");}} style={{ marginTop:8,width:"100%",padding:"5px 0 2px",background:"transparent",border:"none",borderTop:`1px solid ${C.border}30`,color:C.accent,fontSize:11,fontWeight:600,cursor:"pointer" }}>
                      + {catsMonth.length - 4} {t("više")} · {t("Otvori statistiku →")}
                    </button>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}


export default Dashboard;
