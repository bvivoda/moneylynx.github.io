// ─── Schema migration ──────────────────────────────────────────────────────────
//
// Pokreće se jednom pri startu aplikacije, PRIJE nego React montira bilo što.
// Svaka verzija je inkrementalna — v1→v2→v3, nikad preskakanje.
//
// Trenutne verzije:
//   v0 → v1 : početno stanje (svi postojeći korisnici)
//   v1 → v2 : osiguraj recurring_income i budgets u ml_lists
//   v2 → v3 : osiguraj da svaka transakcija ima installments polje
//
// Dodavanje nove migracije:
//   1. Povećaj CURRENT_SCHEMA_VERSION
//   2. Dodaj case u switch ispod
//   3. Nikad ne mijenjaj postojeće case-ove
// ──────────────────────────────────────────────────────────────────────────────

const SCHEMA_KEY     = 'ml_schema_v';
const CURRENT_SCHEMA_VERSION = 3;

const loadRaw = (k)    => { try { return localStorage.getItem(k); } catch { return null; } };
const saveRaw = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const loadJ   = (k, fb) => { try { const v = loadRaw(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const saveJ   = (k, v) => { try { saveRaw(k, JSON.stringify(v)); } catch {} };

function getSchemaVersion() {
  return parseInt(loadRaw(SCHEMA_KEY) || '0', 10);
}

// ── Migracije ─────────────────────────────────────────────────────────────────

function migrateV1toV2() {
  // Dodaj recurring_income i budgets ako nedostaju u ml_lists
  const lists = loadJ('ml_lists', null);
  if (!lists) return; // novi korisnik, nema podataka za migrirati
  let changed = false;
  if (!lists.recurring_income) { lists.recurring_income = []; changed = true; }
  if (!lists.budgets)          { lists.budgets = {};          changed = true; }
  if (changed) saveJ('ml_lists', lists);
}

function migrateV2toV3() {
  // Osiguraj da svaka transakcija ima installments: 0 (stare transakcije ga nemaju)
  const raw = loadRaw('ml_data');
  if (!raw) return;
  // Ne dirajmo kriptirane podatke (počinju s "ENC2:") — migracija se
  // ne može izvesti bez ključa; preskačemo, nema štete jer novi kod
  // bezbjedno čita installments s parseInt fallbackom.
  if (raw.startsWith('ENC2:')) return;
  try {
    const txs = JSON.parse(raw);
    if (!Array.isArray(txs)) return;
    let changed = false;
    const migrated = txs.map(tx => {
      if (tx.installments === undefined || tx.installments === null) {
        changed = true;
        return { ...tx, installments: 0 };
      }
      return tx;
    });
    if (changed) saveJ('ml_data', migrated);
  } catch { /* oštećeni podaci — ne diraj */ }
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function runMigrations() {
  let v = getSchemaVersion();
  if (v >= CURRENT_SCHEMA_VERSION) return; // ništa za raditi

  // Svaki case pada kroz — svaka migracija se izvršava redom
  switch (true) {
    case v < 2: migrateV1toV2(); // falls through
    // eslint-disable-next-line no-fallthrough
    case v < 3: migrateV2toV3();
  }

  saveRaw(SCHEMA_KEY, String(CURRENT_SCHEMA_VERSION));
  console.info(`[migration] schema updated: v${v} → v${CURRENT_SCHEMA_VERSION}`);
}