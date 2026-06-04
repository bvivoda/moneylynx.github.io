import { useState, useEffect, useMemo, useCallback } from 'react';

// ─── Lib ──────────────────────────────────────────────────────────────────────
import { K, DEF_LISTS, T, MONTHS, BACKUP_SNOOZE_MS } from './lib/constants.js';
import { EN_DICT } from './lib/i18n.js';
import { load, save, saveRaw, fmtCurrency, fDateTZ, curYear } from './lib/helpers.js';
import {
  encryptJSON, encryptAndSaveAll, loadAndDecryptAll,
  cacheKeyToSession, loadKeyFromSession, clearSessionKey,
} from './lib/crypto.js';
import { supabase, signOut } from './lib/supabase.js';
import { updateBadge, registerPeriodicSync, parseShortcutAction, computeOverdueCount } from './lib/pwaBadge.js';
import { uploadAll } from './lib/sync.js';

// ─── Hooks ────────────────────────────────────────────────────────────────────
import { useServiceWorker }  from './hooks/useServiceWorker.js';
import { useUndo }           from './hooks/useUndo.js';
import { useSupabaseAuth }   from './hooks/useSupabaseAuth.js';
import { useCloudSync }      from './hooks/useCloudSync.js';
import { useAppSecurity }    from './hooks/useAppSecurity.js';
import { useTransactions }   from './hooks/useTransactions.js';

// ─── Components ───────────────────────────────────────────────────────────────
import { Ic, LynxLogoWhite, QuickAddModal, ActionHubModal } from './components/ui.jsx';
import { LockScreen, SetupPin, OnboardingScreen }           from './components/auth.jsx';
import AuthScreen    from './components/AuthScreen.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ChunkErrorBoundary from './components/ChunkErrorBoundary.jsx';
import Dashboard     from './components/Dashboard.jsx';
import TxForm        from './components/TxForm.jsx';
import TxList        from './components/TxList.jsx';
import Charts        from './components/Charts.jsx';
import Settings      from './components/Settings.jsx';
import { RecurringScreen } from './components/Settings.jsx';

// Haptic feedback helper — silent if browser doesn't support vibrate
const haptic = (ms = 40) => { try { navigator.vibrate?.(ms); } catch {} };

// ── Platform detection ──────────────────────────────────────────────────────
// `isNative` = true kad app radi unutar Capacitor Android/iOS WebView-a.
// Na webu ostaje sve isto (Supabase auth + cloud sync). Na nativnom mobilu
// preskačemo auth i radimo 100% lokalno — podaci u localStorage na uređaju.
//
// TODO: NATIVE-CLOUD-SYNC — kasnije dodati opt-in cloud sync preko Postavki:
//   • korisnik upali "Sinkronizacija s računalom" u Settings
//   • prijavi se (email/lozinka ili biometrija + token)
//   • od tog trenutka koristi `useCloudSync` kao i web verzija
//   • do tada — ovo je čista offline app
const isNative = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

export default function App() {
  const _sec    = load(K.sec, {});
  const _hasPin = !!_sec.pinHash;

  // ── Core data state ───────────────────────────────────────────────────────
  const [txs,    setTxs]    = useState(() => _hasPin ? [] : load(K.db,  []));
  const [drafts, setDrafts] = useState(() => _hasPin ? [] : load(K.drf, []));
  const [prefs,  setPrefs]  = useState(() => load(K.prf, {
    theme: 'auto', year: curYear(), onboarded: false,
    lang: 'hr', currency: 'EUR', timezone: 'Europe/Zagreb',
  }));
  const [user,   setUser]   = useState(() => _hasPin ? {} : load(K.usr, { firstName: '', lastName: '', phone: '', email: '' }));
  const [lists,  setLists]  = useState(() => _hasPin ? DEF_LISTS : load(K.lst, DEF_LISTS));

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { swUpdate, applySwUpdate } = useServiceWorker();
  const { undoInfo, startUndo, doUndo } = useUndo();
  const { supaUser, setSupaUser, authReady } = useSupabaseAuth();

  const {
    sec, setSec, secRef,
    encKey, setEncKey,
    unlocked, setUnlocked,
    setupMode, setSetupMode,
    handleCryptoUnlock,
    handleFirstSetPin: _handleFirstSetPin,
    handleChangePinCrypto: _handleChangePinCrypto,
    handleRemovePinCrypto: _handleRemovePinCrypto,
    wipe: _wipe,
  } = useAppSecurity({ setTxs, setDrafts, setLists, setUser });

  const lang = prefs.lang || 'hr';

  const HR_OVERRIDE = {
    'Obveze (short)': 'Obveze',
    'Obroci (short)': 'Obroci',
    'Rate (short)':   'Rate',
    'Ostalo (short)': 'Ostalo',
  };
  const t = useCallback((key) => {
    if (lang === 'en' && EN_DICT[key])     return EN_DICT[key];
    if (lang === 'hr' && HR_OVERRIDE[key]) return HR_OVERRIDE[key];
    return key;
  }, [lang]);

  const {
    syncing, syncError, setSyncError,
    isOnline,
    handleSyncAfterLogin,
    queueSync, cloudDel,
  } = useCloudSync({ supaUser, txs, lists, user, setTxs, setLists, setUser, t });

  // ── Navigation + UI state ─────────────────────────────────────────────────
  const [page,      setPage]      = useState('dashboard');
  const [editId,    setEditId]    = useState(null);
  const [draftEdit, setDraftEdit] = useState(null);
  const [subPg,     setSubPg]     = useState(null);
  const [showQuickAdd,  setShowQuickAdd]  = useState(false);
  const [showActionHub, setShowActionHub] = useState(false);
  // Origin tracking for the Transactions screen — when the user opens
  // Transactions from a non-tab entry point (e.g. Dashboard → "Prikaži sve"),
  // we remember the origin page so a back button can take them back. When
  // they reach Transactions via the bottom nav, this stays null = no back btn.
  const [txListReturnTo, setTxListReturnTo] = useState(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [txFilter,      setTxFilter]      = useState('pending');
  const [statTab,       setStatTab]       = useState('expected');
  const [statMonth,     setStatMonth]     = useState(() => MONTHS[new Date().getMonth()]);
  const [statExpFilter, setStatExpFilter] = useState({ recurring: true, rate: true, kredit: true, processing: true });

  // ── Transaction operations ────────────────────────────────────────────────
  const { addTx, updTx, delTx, delGrp, delDraft } = useTransactions({
    txs, setTxs, drafts, setDrafts,
    queueSync, cloudDel,
    startUndo, setPage, t,
  });

  const handleUpdTx = (tx) => { setEditId(null); updTx(tx); };

  // ── Crypto-aware persistence ──────────────────────────────────────────────
  useEffect(() => {
    if (encKey)            { encryptJSON(encKey, txs).then(e => saveRaw(K.db,  e)); }
    else if (!sec.pinHash) { save(K.db,  txs); }
  }, [txs]);
  useEffect(() => {
    if (encKey)            { encryptJSON(encKey, drafts).then(e => saveRaw(K.drf, e)); }
    else if (!sec.pinHash) { save(K.drf, drafts); }
  }, [drafts]);
  useEffect(() => { save(K.prf, prefs); }, [prefs]);
  useEffect(() => {
    if (encKey)            { encryptJSON(encKey, lists).then(e => saveRaw(K.lst, e)); }
    else if (!sec.pinHash) { save(K.lst, lists); }
  }, [lists]);
  useEffect(() => {
    if (encKey)            { encryptJSON(encKey, user).then(e => saveRaw(K.usr, e)); }
    else if (!sec.pinHash) { save(K.usr, user); }
  }, [user]);
  useEffect(() => { save(K.sec, sec); }, [sec]);

  // ── PWA badge + shortcut setup ───────────────────────────────────────────────
  useEffect(() => {
    registerPeriodicSync();
    const shortcut = parseShortcutAction();
    if (shortcut) {
      setPage(shortcut.page);
      if (shortcut.filter) setTxFilter(shortcut.filter);
    }
    // Listen for SW badge count requests
    const handler = (e) => {
      if (e.data?.type === 'REQUEST_BADGE_COUNT') {
        updateBadge(computeOverdueCount(txs, lists));
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  // Update badge whenever txs or lists change
  useEffect(() => {
    updateBadge(computeOverdueCount(txs, lists));
  }, [txs, lists]);

  // ── One-time setup effects ─────────────────────────────────────────────────
  useEffect(() => {
    if (!prefs.langChosen) {
      try {
        const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone;
        updP({ lang: tz === 'Europe/Zagreb' ? 'hr' : 'en', langChosen: true });
      } catch { updP({ lang: 'en', langChosen: true }); }
    }
  }, []);

  useEffect(() => {
    if (prefs.onboarded && !prefs.firstUseAt) updP({ firstUseAt: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { try { localStorage.removeItem('ml_sk'); } catch {} }, []);

  // Route back to dashboard when app is backgrounded.
  useEffect(() => {
    const fn = () => { if (document.hidden) { setPage('dashboard'); setTxListReturnTo(null); } };
    document.addEventListener('visibilitychange', fn);
    return () => document.removeEventListener('visibilitychange', fn);
  }, []);

  // ── Crypto wrappers (inject live state into pure hook callbacks) ──────────
  const handleFirstSetPin = async (pin) => {
    const { key } = await _handleFirstSetPin(pin);
    await encryptAndSaveAll(key, { txs, drafts, lists, user });
  };

  const handleChangePinCrypto = async (newPin) => {
    await _handleChangePinCrypto(newPin, { txs, drafts, lists, user });
  };

  const handleRemovePinCrypto = () => {
    _handleRemovePinCrypto({ txs, drafts, lists, user });
  };

  const wipe = () => { _wipe(); updP({ onboarded: false }); };

  // ── Shortcuts ─────────────────────────────────────────────────────────────
  const updP = (p) => setPrefs(v => ({ ...v, ...p }));
  const updU = (p) => setUser(v  => ({ ...v, ...p }));
  const updS = (p) => setSec(v  => ({ ...v, ...p }));

  // ── Theme ─────────────────────────────────────────────────────────────────
  // Track the OS-level dark preference live. A `useMemo` would only re-evaluate
  // on prop changes; we need a real subscription so that 'auto' mode reflects
  // the user toggling their phone's theme while the app is open.
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    // Modern browsers + legacy Safari (<14) fallback
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else if (mq.removeListener) mq.removeListener(handler);
    };
  }, []);

  // Resolve final theme. An explicit user choice (light or dark) ALWAYS wins
  // over OS preference, ambient light, battery-saver, etc. — only 'auto'
  // defers to the system. Anything else falls back to 'light'.
  const theme = prefs.theme === 'dark'  ? 'dark'
              : prefs.theme === 'light' ? 'light'
              : (systemDark ? 'dark' : 'light');
  const C = T[theme] ?? T.dark;

  // Sync external browser-level theming hints with the chosen theme so
  // status bar / PWA chrome / browser UA stylesheet all match. Without this,
  // some Android Chromes will auto-darken a light page that would otherwise
  // be locked light.
  useEffect(() => {
    // <meta name="theme-color"> — controls Android Chrome status bar tint
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', C.bg);

    // iOS PWA status bar
    const sbar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (sbar) sbar.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default');

    // Drop the pre-render style injected by index.html — the React-managed
    // styles below take over from this point.
    const pre = document.getElementById('ml-theme-pre');
    if (pre) pre.remove();
  }, [theme, C.bg]);

  const gs = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
    /* color-scheme is the strongest signal to the browser about which theme
       this page actually uses. Setting it explicitly disables:
        – Chrome on Android "Auto-dark for web contents" (force-darken)
        – Firefox "Override page colours" auto-inversion
        – ambient-light / reading-mode tone shifts
       This is what guarantees that the user's choice is respected — no OS
       layer can darken light or further-darken dark. */
    :root{color-scheme:${theme};}
    html,body,#root{width:100%;min-height:100vh;background:${C.bg};color:${C.text};}
    input,select,textarea{font-family:inherit;color-scheme:${theme};}
    input:focus,select:focus,textarea:focus{outline:none;border-color:${C.accent}!important;}
    ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px;}
    @keyframes su{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fi{from{opacity:0}to{opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
    @keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.8}}
    .su{animation:su .25s ease-out both} .fi{animation:fi .2s ease-out both}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${theme === 'dark' ? 'invert(1)' : 'none'};opacity:.5;}
    select{appearance:none;-webkit-appearance:none;}
    select.empty{color:${C.textMuted};}
    select:not(.empty){color:${C.text};}
    button{font-family:inherit;}
    .hdr{padding-top:max(14px, env(safe-area-inset-top));}
  `;
  const wrap = { background: C.bg, minHeight: '100vh', width: '100%', color: C.text, fontFamily: "'Inter',sans-serif", maxWidth: 480, margin: '0 auto', transition: 'background .3s,color .3s' };

  const currency = prefs.currency || 'EUR';
  const timezone = prefs.timezone || 'Europe/Zagreb';
  const fmt      = (n) => fmtCurrency(n, currency);
  const fmtD     = (d) => fDateTZ(d, timezone);
  const shared   = { C, year: prefs.year, lists, user, t, lang, fmt, fmtD, currency, timezone };

  // ── Early returns ─────────────────────────────────────────────────────────

  // Auth loading screen — samo na webu (TODO: NATIVE-CLOUD-SYNC: vratiti i za native kad bude opt-in sync)
  if (!isNative && !authReady) return (
    <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{gs}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg,${C.accent},${C.accentDk || C.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'pulse 1.5s ease-in-out infinite' }}>
          <LynxLogoWhite s={26}/>
        </div>
        <span style={{ color: C.textMuted, fontSize: 13 }}>Moja Lova</span>
      </div>
    </div>
  );

  // Login screen — samo na webu. Native app (Android/iOS) radi lokalno bez prijave.
  // TODO: NATIVE-CLOUD-SYNC — kad implementiramo opt-in sync, ovdje dodati provjeru
  // tipa: `if (!isNative && authReady && !supaUser)` → AuthScreen,
  //       `if (isNative && cloudSyncEnabled && !supaUser)` → AuthScreen.
  if (!isNative && authReady && !supaUser) return (
    <div style={wrap}><style>{gs}</style>
      <AuthScreen C={C} t={t} lang={lang} onLangChange={(l) => updP({ lang: l })} onSuccess={(session) => setSupaUser(session?.user)}/>
    </div>
  );

  if (syncing) return (
    <div style={{ ...wrap, padding: '0 16px' }}>
      <style>{gs}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 12px' }}>
        <div style={{ width: 120, height: 22, borderRadius: 8, background: C.cardAlt, animation: 'shimmer 1.4s ease-in-out infinite' }}/>
        <div style={{ width: 80,  height: 30, borderRadius: 10, background: C.cardAlt, animation: 'shimmer 1.4s ease-in-out infinite' }}/>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, marginBottom: 12 }}>
        <div style={{ width: 80,  height: 12, borderRadius: 6, background: C.cardAlt, marginBottom: 10, animation: 'shimmer 1.4s ease-in-out infinite' }}/>
        <div style={{ width: 150, height: 28, borderRadius: 8, background: C.cardAlt, marginBottom: 12, animation: 'shimmer 1.4s ease-in-out infinite' }}/>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, height: 48, borderRadius: 12, background: C.cardAlt, animation: 'shimmer 1.4s ease-in-out infinite' }}/>
          <div style={{ flex: 1, height: 48, borderRadius: 12, background: C.cardAlt, animation: 'shimmer 1.4s ease-in-out infinite' }}/>
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, marginBottom: 12, display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
        {[60,85,45,95,70,55,80,40,90,65,75,50].map((h,i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: C.cardAlt, animation: `shimmer 1.4s ease-in-out ${i * 0.08}s infinite` }}/>
        ))}
      </div>
      {[1,2,3].map(i => (
        <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.cardAlt}`, borderRadius: 14, padding: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.cardAlt, flexShrink: 0, animation: 'shimmer 1.4s ease-in-out infinite' }}/>
          <div style={{ flex: 1 }}>
            <div style={{ width: '60%', height: 12, borderRadius: 6, background: C.cardAlt, marginBottom: 7, animation: 'shimmer 1.4s ease-in-out infinite' }}/>
            <div style={{ width: '40%', height: 10, borderRadius: 6, background: C.cardAlt, animation: 'shimmer 1.4s ease-in-out infinite' }}/>
          </div>
          <div style={{ width: 60, height: 16, borderRadius: 6, background: C.cardAlt, animation: 'shimmer 1.4s ease-in-out infinite' }}/>
        </div>
      ))}
      <div style={{ textAlign: 'center', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.warning, display: 'inline-block', animation: 'pulse 1s infinite' }}/>
        <span style={{ color: C.textMuted, fontSize: 12 }}>{t('Sinkronizacija podataka…')}</span>
      </div>
    </div>
  );

  if (!prefs.onboarded) return (
    <div style={wrap}><style>{gs}</style>
      <OnboardingScreen C={C} prefs={prefs} updPrefs={updP} user={user} updUser={updU} lists={lists} updLists={setLists} updSec={updS} t={t} onSetPin={handleFirstSetPin}
        onAddFirstTx={(tx) => { const newTx = { ...tx, id: Date.now().toString(), installments: 0 }; setTxs(p => [...p, newTx]); queueSync([newTx]); }}
        finish={() => { updP({ onboarded: true, firstUseAt: Date.now() }); setUnlocked(true); }}
      />
    </div>
  );

  if (sec.pinHash && !unlocked) return (
    <div style={wrap}><style>{gs}</style>
      <LockScreen C={C} sec={sec} t={t} supaUser={supaUser}
        onUnlock={async (pin, isLegacy, bioOnly) => {
          if (bioOnly) {
            const cachedKey = await loadKeyFromSession();
            if (cachedKey) {
              const data = await loadAndDecryptAll(cachedKey, DEF_LISTS);
              setTxs(data.txs); setDrafts(data.drafts); setLists(data.lists); setUser(data.user);
              setEncKey(cachedKey);
              updS({ attempts: 0, lockedUntil: null });
              await cacheKeyToSession(cachedKey);
              setUnlocked(true);
            }
            return;
          }
          await handleCryptoUnlock(pin, isLegacy);
        }}
        onWipe={wipe}
        onResetPin={async () => {
          const newSec = { pinHash: null, pinSalt: null, encSalt: null, pinHashVersion: null, bioEnabled: false, bioCredId: null, attempts: 0, totalFailed: 0, lockedUntil: null };
          save(K.sec, newSec); setSec(newSec); secRef.current = newSec;
          setEncKey(null); clearSessionKey();
          save(K.db, []); save(K.drf, []); save(K.lst, DEF_LISTS); save(K.usr, {});
          setTxs([]); setDrafts([]); setLists(DEF_LISTS); setUser({});
          setUnlocked(true);
          if (supaUser) handleSyncAfterLogin(supaUser.id);
        }}
      />
    </div>
  );

  if (setupMode) return (
    <div style={wrap}><style>{gs}</style>
      <SetupPin C={C} isChange={false} t={t} onSave={pin => handleFirstSetPin(pin)} onSkip={() => setSetupMode(false)}/>
    </div>
  );

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <div style={{ ...wrap, paddingBottom: 88 }}>
      <style>{gs}</style>

      {!isOnline && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 301, background: '#374151', color: '#fff', padding: `max(10px, env(safe-area-inset-top)) 16px 10px`, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #4B5563' }}>
          <Ic n="alert" s={14} c="#FCD34D"/>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{t('Nema internetske veze — radite offline')}</span>
        </div>
      )}

      {syncError && isOnline && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 301, background: `${C.expense}E8`, color: '#fff', padding: `max(10px, env(safe-area-inset-top)) 16px 10px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.expense}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic n="alert" s={14} c="#fff"/>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{syncError}</span>
          </div>
          <button onClick={() => { setSyncError(null); if (supaUser) handleSyncAfterLogin(supaUser.id); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {t('Pokušaj ponovo')}
          </button>
        </div>
      )}

      {swUpdate && (
        <div onClick={applySwUpdate} style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 300, background: `linear-gradient(135deg,${C.accent},${C.accentDk})`, color: '#fff', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: `1px solid ${C.accentDk}`, paddingTop: `max(12px, env(safe-area-inset-top))` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <Ic n="zap" s={16} c="#fff"/>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{t('Nova verzija dostupna')}</div>
              <div style={{ fontSize: 11, opacity: .9 }}>{t('Klikni za ažuriranje')}</div>
            </div>
          </div>
          <Ic n="chevron" s={14} c="#fff" style={{ transform: 'rotate(-90deg)' }}/>
        </div>
      )}

      {page === 'dashboard'    && <Dashboard    {...shared} data={txs} setTxs={setTxs} setPage={setPage} setTxFilter={setTxFilter} onQuickAdd={() => setShowQuickAdd(true)} prefs={prefs} updPrefs={updP} setSubPg={setSubPg} syncing={syncing} supaUser={supaUser} onGoToTransactions={(filter) => { if (filter) setTxFilter(filter); setTxListReturnTo('dashboard'); setPage('transactions'); }}/>}
      {page === 'add'          && <TxForm {...shared} txs={txs} draft={draftEdit} setLists={setLists} onSubmit={tx => { addTx(tx); if (draftEdit) { setDrafts(p => p.filter(d => d.id !== draftEdit.id)); setDraftEdit(null); } }} onCancel={() => { setPage('dashboard'); setDraftEdit(null); }} onGoRecurring={() => setPage('recurring')}/>}
      {page === 'edit'         && <TxForm {...shared} txs={txs} tx={txs.find(x => x.id === editId)} setLists={setLists} onSubmit={handleUpdTx} onCancel={() => { setEditId(null); setPage('transactions'); }}/>}
      {page === 'transactions' && <TxList {...shared} data={txs} filter={txFilter} setFilter={setTxFilter} onBack={txListReturnTo ? () => { const dest = txListReturnTo; setTxListReturnTo(null); setPage(dest); } : null} onEdit={id => { setEditId(id); setPage('edit'); }} onDelete={delTx} onDeleteGroup={delGrp} onPay={id => { haptic(40); setTxs(p => p.map(x => x.id === id ? { ...x, status: 'Plaćeno', date: new Date().toISOString().split('T')[0] } : x)); }} onUnpay={id => {
        const tx = txs.find(x => x.id === id);
        if (!tx) return;
        const previousStatus = tx.status;
        const previousDate = tx.date;
        setTxs(p => p.map(x => x.id === id ? { ...x, status: 'Čeka plaćanje' } : x));
        startUndo(t('Status vraćen u Čeka plaćanje'), () => {
          setTxs(p => p.map(x => x.id === id ? { ...x, status: previousStatus, date: previousDate } : x));
        });
      }}/>}
      {page === 'charts'       && <ChunkErrorBoundary C={C} label={t('Statistika')} t={t}><Charts {...shared} data={txs} tab={statTab} setTab={setStatTab} selMonth={statMonth} setSelMonth={setStatMonth} expFilter={statExpFilter} setExpFilter={setStatExpFilter}/></ChunkErrorBoundary>}
      {page === 'recurring'    && <RecurringScreen {...shared} data={txs} setTxs={setTxs} onBack={() => setPage('dashboard')}/>}
      {page === 'settings'     && <ChunkErrorBoundary C={C} label={t('Postavke')} t={t}><Settings {...shared} txs={txs} setTxs={setTxs} drafts={drafts} prefs={prefs} updPrefs={updP} updUser={updU} sec={sec} updSec={updS} lists={lists} setLists={setLists} subPg={subPg} setSubPg={setSubPg} setUnlocked={setUnlocked} setSetupMode={setSetupMode} onChangePinCrypto={handleChangePinCrypto} onRemovePinCrypto={handleRemovePinCrypto} supaUser={supaUser} onSignOut={async () => { await signOut(); setSupaUser(null); }} onSyncToCloud={supaUser ? async (t, l, u) => { await uploadAll(supaUser.id, { txs: t || txs, lists: l || lists, user: u || user }); } : null}/></ChunkErrorBoundary>}

      {showQuickAdd  && <QuickAddModal  C={C} t={t} onClose={() => setShowQuickAdd(false)} onSave={d => { setDrafts(p => [{ id: Date.now().toString(), amount: d.amount, description: d.desc, date: new Date().toISOString() }, ...p]); setShowQuickAdd(false); }}/>}
      {showActionHub && <ActionHubModal C={C} t={t} drafts={drafts} onClose={() => setShowActionHub(false)} onNew={() => { setPage('add'); setDraftEdit(null); setShowActionHub(false); }} onSelect={d => { setDraftEdit(d); setPage('add'); setShowActionHub(false); }} onDel={delDraft}/>}

      {undoInfo && (
        <div className="fi" style={{ position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 440, zIndex: 150, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 12px 10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <Ic n="trash" s={14} c={C.expense}/>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{undoInfo.label}</span>
          </div>
          <button onClick={doUndo} style={{ background: `${C.accent}22`, border: `1px solid ${C.accent}60`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: C.accent, fontSize: 13, fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Ic n="zap" s={12} c={C.accent}/>{t('Vrati')}
          </button>
        </div>
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: C.navBg, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-around', padding: '6px 0 16px', zIndex: 100, backdropFilter: 'blur(12px)' }}>
        {[['dashboard','home','Početna'],['transactions','list','Transakcije'],['add','plus',''],['charts','bar','Statistika'],['settings','gear','Postavke']].map(([id, ic, lb]) => (
          <button key={id} onClick={() => {
            if (id === 'add') { if (drafts.length > 0) { setShowActionHub(true); } else { setDraftEdit(null); setPage('add'); setSubPg(null); } }
            else { setPage(id); setSubPg(null); setTxListReturnTo(null); }
          }} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 10px', borderRadius: 10 }}>
            {id === 'add'
              ? <div style={{ width: 46, height: 46, borderRadius: 16, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -24, boxShadow: `0 4px 18px ${C.accentGlow}` }}><Ic n="plus" s={24} c="#fff"/></div>
              : <><Ic n={ic} s={20} c={page === id ? C.accent : C.textMuted}/><span style={{ fontSize: 10, color: page === id ? C.accent : C.textMuted, fontWeight: page === id ? 600 : 400 }}>{t(lb)}</span></>
            }
          </button>
        ))}
      </nav>
    </div>
  );
}

export function AppWithBoundary() {
  return <ErrorBoundary><App /></ErrorBoundary>;
}
