const { GHANA_REGIONS } = require('../constants/ghanaRegions');

// Maps a raw CSV row (whatever headers the legacy export actually used) onto
// canonical field names via the alias reverse-map built in
// migrationFieldAliases.js. An unrecognized header is kept under its
// original name (harmless -- nothing reads it) rather than dropped, so nothing
// is silently lost even if the alias table doesn't cover it.
const normalizeRowKeys = (row, reverseMap) => {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    const canonical = reverseMap.get(key.toLowerCase().trim()) || key;
    // First alias wins if two source headers map to the same canonical field
    // (e.g. a sheet with both "Mobile" and "Parent Phone" columns) -- avoids
    // a later, possibly-blank column silently overwriting an earlier value.
    if (normalized[canonical] === undefined || normalized[canonical] === '') {
      normalized[canonical] = typeof value === 'string' ? value.trim() : value;
    }
  });
  return normalized;
};

// "0244123456" stays as-is; "+233244123456" / "233244123456" normalize to
// the app's established local-format convention (matches every other phone
// field already in the schema, and the WhatsApp link builder's assumption
// in StudentProfile.jsx). Returns the best-effort normalized value either
// way -- `valid` tells the caller whether it actually matches a real
// Ghanaian mobile shape, for a warning, not a silent drop.
const normalizeGhanaPhone = (raw) => {
  if (!raw) return { normalized: null, valid: false };
  const digits = raw.replace(/[^\d+]/g, '');
  let local = digits;
  if (local.startsWith('+233')) local = `0${local.slice(4)}`;
  else if (local.startsWith('233') && local.length === 12) local = `0${local.slice(3)}`;
  const valid = /^0\d{9}$/.test(local);
  return { normalized: valid ? local : raw.trim(), valid };
};

const normalizeRegionText = (raw) => (raw || '')
  .trim().toLowerCase()
  .replace(/\bregion\b/g, '')
  .replace(/\breg\.?\b/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const REGION_BY_NORMALIZED = new Map(GHANA_REGIONS.map((r) => [normalizeRegionText(r), r]));

// "ashanti reg" / "ASHANTI" / "Ashanti Region" all resolve to the same
// canonical "Ashanti Region" enum value. Returns null (not a guess) for
// anything that doesn't match one of the 16 regions after cleansing --
// callers report that as a warning rather than storing garbage.
const matchGhanaRegion = (raw) => {
  const normalized = normalizeRegionText(raw);
  if (!normalized) return null;
  return REGION_BY_NORMALIZED.get(normalized) || null;
};

module.exports = { normalizeRowKeys, normalizeGhanaPhone, matchGhanaRegion };
