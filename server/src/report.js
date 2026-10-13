'use strict';
// Report builder ported faithfully from public/app.js computeExceptions
// + server.js buildReport.
const PRETRIP_LEN = 13;

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildReport(docs, date) {
  const signins = docs.signins.filter((s) => s.date === date);
  const trips = docs.trips.filter((t) => t.date === date);
  const fuels = docs.fuels.filter((f) => f.date === date);
  const maint = docs.maintenance.filter((m) => m.date === date);
  const incidents = docs.incidents.filter((i) => i.date === date);
  const vehicles = docs.vehicles;

  const vehOf = (reg) => vehicles.find((v) => v.reg === reg) || {};

  const totalKm = signins.reduce((a, s) => {
    if (s.closeKm !== null && s.closeKm !== undefined && s.closeKm !== '' &&
        s.openKm !== null && s.openKm !== undefined && s.openKm !== '') {
      return a + (num(s.closeKm) - num(s.openKm));
    }
    return a;
  }, 0);
  const totalFuelL = fuels.reduce((a, f) => a + (num(f.litres) || 0), 0);
  const totalFuelCost = fuels.reduce((a, f) => a + (num(f.total) || 0), 0);
  const avgKmPerL = totalFuelL ? +(totalKm / totalFuelL).toFixed(2) : null;
  const completedTrips = trips.filter((t) => t.timeIn && (t.kmIn !== null && t.kmIn !== undefined && t.kmIn !== '')).length;

  const byVehicle = signins.map((s) => {
    const hasBoth = (s.closeKm !== null && s.closeKm !== undefined && s.closeKm !== '') &&
      (s.openKm !== null && s.openKm !== undefined && s.openKm !== '');
    const km = hasBoth ? (num(s.closeKm) - num(s.openKm)) : 0;
    const l = fuels.filter((f) => f.vehicle === s.vehicle).reduce((a, f) => a + (num(f.litres) || 0), 0);
    return {
      vehicle: s.vehicle,
      driver: s.driverName,
      openKm: s.openKm !== undefined ? s.openKm : null,
      closeKm: (s.closeKm !== null && s.closeKm !== undefined && s.closeKm !== '') ? s.closeKm : null,
      km,
      fuelL: l,
      kmPerL: l ? +(km / l).toFixed(2) : null
    };
  });

  const exceptions = [];

  signins.forEach((s) => {
    const checks = s.checks || [];
    const fails = checks.filter((c) => c.st === 'Fail');
    if (!s.checks || s.checks.length < PRETRIP_LEN) {
      exceptions.push({
        type: 'Driver did not complete inspection',
        detail: `${s.driverName} / ${s.vehicle} — only ${(s.checks || []).length}/${PRETRIP_LEN} items checked`,
        sev: 'Medium'
      });
    }
    fails.forEach((f) => {
      exceptions.push({
        type: 'Pre-trip defect',
        detail: `${s.vehicle}: ${f.item} — ${f.note || 'defect noted before departure'}`,
        sev: 'Medium'
      });
    });
    if (s.newDefects && /damage|dent|scratch|crack|broken/i.test(s.newDefects)) {
      exceptions.push({ type: 'New vehicle damage', detail: `${s.vehicle}: ${s.newDefects}`, sev: 'High' });
    }
    if (s.returnTime && s.returnTime > '18:30') {
      exceptions.push({
        type: 'Vehicle returned late',
        detail: `${s.vehicle} returned ${s.returnTime} by ${s.driverName}`,
        sev: 'Low'
      });
    }
    if (s.openKm !== null && s.openKm !== undefined && s.openKm !== '' &&
        s.closeKm !== null && s.closeKm !== undefined && s.closeKm !== '' &&
        num(s.closeKm) < num(s.openKm)) {
      exceptions.push({
        type: 'Odometer discrepancy',
        detail: `${s.vehicle}: closing ${s.closeKm} < opening ${s.openKm}`,
        sev: 'High'
      });
    }
    const v = vehOf(s.vehicle);
    if (v.nextServiceKm && s.closeKm !== null && s.closeKm !== undefined && s.closeKm !== '' &&
        num(s.closeKm) >= num(v.nextServiceKm) - 500) {
      exceptions.push({
        type: 'Maintenance overdue / due',
        detail: `${s.vehicle} at ${s.closeKm} km, service due ${v.nextServiceKm} km`,
        sev: 'High'
      });
    }
  });

  trips.forEach((t) => {
    if (t.kmIn !== null && t.kmIn !== undefined && t.kmIn !== '' &&
        t.kmOut !== null && t.kmOut !== undefined && t.kmOut !== '' &&
        num(t.kmIn) < num(t.kmOut)) {
      exceptions.push({
        type: 'Odometer discrepancy',
        detail: `Trip ${t.from}→${t.to}: KM in ${t.kmIn} < KM out ${t.kmOut}`,
        sev: 'High'
      });
    }
    if (!t.purpose) {
      exceptions.push({
        type: 'Unauthorized trip',
        detail: `${t.vehicle} ${t.from}→${t.to} has no stated purpose`,
        sev: 'Medium'
      });
    }
  });

  fuels.forEach((f) => {
    if (!f.receipt) {
      exceptions.push({
        type: 'Missing fuel receipt',
        detail: `${f.vehicle} ${f.litres}L @ ${f.station}`,
        sev: 'Medium'
      });
    }
  });

  // Excessive consumption: per vehicle with fuel uplifted on date
  const fuelByVeh = {};
  fuels.forEach((f) => {
    fuelByVeh[f.vehicle] = (fuelByVeh[f.vehicle] || 0) + (num(f.litres) || 0);
  });
  signins.forEach((s) => {
    if (s.openKm === null || s.openKm === undefined || s.openKm === '') return;
    if (s.closeKm === null || s.closeKm === undefined || s.closeKm === '') return;
    const km = num(s.closeKm) - num(s.openKm);
    const l = fuelByVeh[s.vehicle] || 0;
    const v = vehOf(s.vehicle);
    if (l > 0 && v.expectedKml) {
      const actual = km / l;
      if (actual < num(v.expectedKml) * 0.75) {
        exceptions.push({
          type: 'Excessive fuel consumption',
          detail: `${s.vehicle}: ${actual.toFixed(2)} km/L vs expected ${v.expectedKml} (km ${km}, fuel ${l}L)`,
          sev: 'High'
        });
      }
    }
  });

  incidents.forEach((i) => {
    exceptions.push({ type: i.type, detail: `${i.detail} (${i.vehicle})`, sev: i.severity });
  });

  return {
    date,
    kpis: {
      vehiclesInOperation: signins.length,
      driversActive: new Set(signins.map((s) => s.driverId)).size,
      totalKm,
      totalFuelL,
      totalFuelCost,
      avgKmPerL,
      maintenanceIssues: maint.length,
      completedTrips,
      uncompletedTrips: trips.length - completedTrips
    },
    byVehicle,
    exceptions
  };
}

module.exports = { buildReport };
