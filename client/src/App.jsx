import { useEffect, useState } from 'react'
import { del, get, post, put } from './api.js'
import './App.css'

const PRETRIP = [
  'Engine oil',
  'Coolant',
  'Brake fluid',
  'Tyres',
  'Lights',
  'Indicators',
  'Brakes',
  'Windscreen/wipers',
  'Battery',
  'Spare tyre',
  'Jack/tools',
  'First-aid kit / fire extinguisher',
  'General body condition',
]

const TABS = [
  { id: 'dash', t: 'Home', s: 'Today at a glance', icon: '🏠', grp: 'Daily work' },
  { id: 'signin', t: 'Sign In & Return', s: 'Start and end of day', icon: '🔑', grp: 'Daily work' },
  { id: 'trips', t: 'Trips', s: 'Log every journey', icon: '🛣️', grp: 'Daily work' },
  { id: 'time', t: 'Time Log', s: 'Waiting, breaks, delays', icon: '⏱️', grp: 'Daily work' },
  { id: 'fuel', t: 'Fuel', s: 'Refuels & consumption', icon: '⛽', grp: 'Daily work' },
  { id: 'maint', t: 'Maintenance', s: 'Services & repairs', icon: '🛠️', grp: 'Office' },
  { id: 'incidents', t: 'Incidents', s: 'Problems & reports', icon: '⚠️', grp: 'Office' },
  { id: 'report', t: 'Daily Report', s: 'Summary for management', icon: '📊', grp: 'Office' },
  { id: 'drivers', t: 'Drivers', s: 'Driver records', icon: '👤', grp: 'Setup' },
  { id: 'vehicles', t: 'Vehicles', s: 'Vehicle records', icon: '🚛', grp: 'Setup' },
]

const NAV_GROUPS = ['Daily work', 'Office', 'Setup']

const TIME_EVENTS = [
  'Sign-in',
  'Vehicle inspection',
  'Departure',
  'Arrival',
  'Waiting',
  'Break',
  'Refuelling',
  'Maintenance/repair',
  'Return-to-office',
  'Sign-out',
]

const INCIDENT_TYPES = [
  'Accident',
  'Vehicle breakdown',
  'Unauthorized trip',
  'Excessive idling',
  'Vehicle returned late',
  'New vehicle damage',
  'Maintenance overdue',
  'Vehicle used outside authorized area',
  'Other',
]

const todayStr = () => new Date().toISOString().slice(0, 10)
const idOf = (d) => d._id || d.id
const esc = (v) => v ?? ''

/* ---------- shared UI ---------- */
function Card({ title, sub, children, style }) {
  return (
    <div className="card" style={style}>
      {title && <h3>{title}</h3>}
      {sub && <p className="mut">{sub}</p>}
      {children}
    </div>
  )
}

function Loading({ what = 'Loading…' }) {
  return <p className="mut">{what}</p>
}

function Err({ e, onRetry }) {
  if (!e) return null
  return (
    <div className="alert red">
      <b>Error:</b> {String(e.message || e)}{' '}
      {onRetry && (
        <button className="btn ghost sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

function Tbl({ headers, children }) {
  return (
    <div style={{ overflow: 'auto' }}>
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children || (
            <tr>
              <td colSpan={headers.length} className="mut">
                Nothing here yet — add the first entry using the form above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function statusBadge(s) {
  const v = String(s ?? '')
  let kind = 'b-grey'
  if (/avail|good|complete|closed|ok/i.test(v)) kind = 'b-green'
  else if (/trip|progress|transit|pending/i.test(v)) kind = 'b-blue'
  else if (/maint|attention|overdue|defect|open/i.test(v)) kind = 'b-amber'
  else if (/damage|accident|breakdown|unavail/i.test(v)) kind = 'b-red'
  return (
    <span className={`badge ${kind}`}>{v || '—'}</span>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  )
}

/* useList: GET collection (optionally ?date=), returns {items, loading, error, reload} */
function useList(path, date) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const url = date ? `${path}?date=${date}` : path
  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await get(url)
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])
  return { items, loading, error, reload, setItems }
}

/* ---------- Dashboard ---------- */
function Dashboard({ date }) {
  const [report, setReport] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [rep, vehs] = await Promise.all([
        get(`/api/report?date=${date}`),
        get('/api/vehicles'),
      ])
      setReport(rep)
      setVehicles(Array.isArray(vehs) ? vehs : [])
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  if (loading) return <Loading what="Loading dashboard…" />
  if (error) return <Err e={error} onRetry={load} />
  const k = report?.kpis || {}
  const cards = [
    ['Vehicles in operation', k.vehiclesInOperation ?? '—', 'checked out today'],
    ['Drivers active', k.driversActive ?? '—', 'signed in today'],
    ['Total KM', `${Number(k.totalKm ?? 0).toLocaleString()} km`, `${k.completedTrips ?? 0} completed trips`],
    ['Fuel used', `${k.totalFuelL ?? 0} L`, `KSh ${Number(k.totalFuelCost ?? 0).toLocaleString()}`],
    ['Avg consumption', k.avgKmPerL == null ? '— km/L' : `${Number(k.avgKmPerL).toFixed(2)} km/L`, 'km per litre'],
    ['Fuel cost', `KSh ${Number(k.totalFuelCost ?? 0).toLocaleString()}`, `${k.totalFuelL ?? 0} L uplifted`],
    ['Maintenance issues', k.maintenanceIssues ?? '—', 'today'],
    ['Completed trips', k.completedTrips ?? '—', `uncompleted: ${k.uncompletedTrips ?? 0}`],
  ]
  const dueSvc = vehicles.filter(
    (x) => x.nextServiceKm && Number(x.mileage || 0) >= Number(x.nextServiceKm) - 1000
  )
  const expiring = vehicles.filter((x) => x.insuranceExpiry && x.insuranceExpiry < date)
  const exc = report?.exceptions || []

  return (
    <div>
      <h2>Today at SAC (K) Ltd — {date}</h2>
      <p className="mut">Your whole fleet today: vehicles out, kilometres, fuel, costs and problems.</p>
      <div className="grid g4">
        {cards.map(([t, v, s]) => (
          <div className="card" key={t}>
            <div className="mut">{t}</div>
            <div className="kpi">{v}</div>
            <div className="kpi-sub">{s}</div>
          </div>
        ))}
      </div>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <Card title="⚠ Service warnings">
          {dueSvc.length
            ? dueSvc.map((x) => (
                <div className="alert" key={x.reg || idOf(x)}>
                  🛠 <b>{x.reg}</b> approaching service mileage ({esc(x.nextServiceKm)} km)
                </div>
              ))
            : <p className="mut">No vehicles within 1,000 km of service.</p>}
          {expiring.map((x) => (
            <div className="alert red" key={`exp-${x.reg || idOf(x)}`}>
              📄 <b>{x.reg}</b> insurance/inspection expires {esc(x.insuranceExpiry)}
            </div>
          ))}
        </Card>
        <Card title={`🚨 Exceptions today (${exc.length})`}>
          {exc.slice(0, 8).map((e, i) => (
            <div className={`alert ${e.sev === 'High' ? 'red' : ''}`} key={i}>
              <b>{e.type}</b> — {e.detail}
            </div>
          )) || <p className="mut">No exceptions. Clean day.</p>}
        </Card>
      </div>
    </div>
  )
}

/* ---------- Sign-In / Out ---------- */
function SigninView({ date, drivers, vehicles, refreshFleet }) {
  const { items, loading, error, reload } = useList('/api/signins', date)
  const [form, setForm] = useState({ driverId: '', vehicle: '', startTime: '07:00', openKm: '', fuelStart: '', condition: 'Good', sig: '' })
  const [checks, setChecks] = useState(PRETRIP.map((item) => ({ item, pass: true, note: '' })))
  const [ret, setRet] = useState(null)
  const [retForm, setRetForm] = useState({ returnTime: '17:30', closeKm: '', fuelEnd: '', condition: 'Good', newDefects: '', supervisor: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const doSignin = async () => {
    setErr(null)
    const drv = drivers.find((d) => d.driverId === form.driverId) || drivers[0]
    const driverId = form.driverId || drv?.driverId || ''
    const driverName = drv && (form.driverId === drv.driverId || !form.driverId) ? drv.name : (drivers.find((d) => d.driverId === form.driverId)?.name || '')
    if (!form.openKm || !form.sig) {
      setErr(new Error('Odometer + signature are mandatory'))
      return
    }
    setSaving(true)
    try {
      await post('/api/signins', {
        date,
        driverId,
        driverName,
        vehicle: form.vehicle || vehicles[0]?.reg || '',
        startTime: form.startTime,
        openKm: form.openKm,
        fuelStart: form.fuelStart,
        condition: form.condition,
        sig: form.sig,
        checks: checks.map((c) => ({ item: c.item, st: c.pass ? 'Pass' : 'Fail', note: c.note })),
      })
      setForm({ driverId: '', vehicle: '', startTime: '07:00', openKm: '', fuelStart: '', condition: 'Good', sig: '' })
      setChecks(PRETRIP.map((item) => ({ item, pass: true, note: '' })))
      await reload()
      refreshFleet?.()
    } catch (e) {
      setErr(e)
    } finally {
      setSaving(false)
    }
  }

  const openReturn = (s) => {
    setRet(s)
    setRetForm({ returnTime: '17:30', closeKm: s.openKm || '', fuelEnd: '', condition: 'Good', newDefects: '', supervisor: '' })
  }

  const doReturn = async () => {
    if (!ret) return
    setSaving(true)
    setErr(null)
    try {
      const km = Number(retForm.closeKm) - Number(ret.openKm)
      await put(`/api/signins/${idOf(ret)}`, { ...retForm, closeKm: retForm.closeKm })
      setRet(null)
      await reload()
      refreshFleet?.()
      alert(`Returned. KM done: ${(isNaN(km) ? 0 : km).toLocaleString()}`)
    } catch (e) {
      setErr(e)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (s) => {
    if (!window.confirm('Delete this sign-in?')) return
    await del(`/api/signins/${idOf(s)}`)
    await reload()
  }

  return (
    <div>
      <div className="sec-title">
        <h2>Driver Sign In & Vehicle Return — {date}</h2>
        <span className="mut">Morning check-out at the top, end-of-day return below</span>
      </div>
      <Err e={err} />
      <Card title="1 · Morning sign-in + pre-trip inspection">
        <div className="formgrid">
          <Field label="Driver">
            <select value={form.driverId} onChange={set('driverId')}>
              <option value="">— select —</option>
              {drivers.filter((x) => x.status === 'Active' || !x.status).map((x) => (
                <option key={x.driverId || idOf(x)} value={x.driverId}>{x.name} ({x.driverId})</option>
              ))}
            </select>
          </Field>
          <Field label="Vehicle">
            <select value={form.vehicle} onChange={set('vehicle')}>
              <option value="">— select —</option>
              {vehicles.filter((x) => x.status !== 'Maintenance').map((x) => (
                <option key={x.reg || idOf(x)} value={x.reg}>{x.reg}</option>
              ))}
            </select>
          </Field>
          <Field label="Start time"><input type="time" value={form.startTime} onChange={set('startTime')} /></Field>
          <Field label="Starting odometer (km)"><input type="number" value={form.openKm} onChange={set('openKm')} placeholder="45210" /></Field>
          <Field label="Fuel level"><input value={form.fuelStart} onChange={set('fuelStart')} placeholder="60% / 30L" /></Field>
          <Field label="Overall condition">
            <select value={form.condition} onChange={set('condition')}>
              <option>Good</option>
              <option>Requires Attention</option>
            </select>
          </Field>
          <Field label="Driver signature (type name)"><input value={form.sig} onChange={set('sig')} placeholder="Sign to accept responsibility" /></Field>
        </div>
        <label>Mandatory pre-trip inspection — tick = PASS, unticked = FAIL</label>
        <div className="checks">
          {checks.map((c, i) => (
            <label key={c.item} className={`check ${c.pass ? '' : 'bad'}`}>
              <input
                type="checkbox"
                checked={c.pass}
                onChange={(e) =>
                  setChecks((arr) => arr.map((x, j) => (j === i ? { ...x, pass: e.target.checked } : x)))
                }
              />{' '}
              {c.item}
              <input
                value={c.note}
                placeholder="defect note…"
                style={{ marginLeft: 'auto', maxWidth: 120, padding: 4 }}
                onChange={(e) =>
                  setChecks((arr) => arr.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))
                }
              />
            </label>
          ))}
        </div>
        <button className="btn primary" onClick={doSignin} disabled={saving}>
          {saving ? 'Saving…' : 'Sign in & check out vehicle (supervisor release)'}
        </button>
      </Card>

      <Card title="2 · End-of-day returns" style={{ marginTop: 12 }}>
        {ret && (
          <div className="card" style={{ background: '#0e1526', marginBottom: 10 }}>
            <h3>Return {ret.vehicle} — {ret.driverName}</h3>
            <div className="formgrid">
              <Field label="Return time"><input type="time" value={retForm.returnTime} onChange={(e) => setRetForm({ ...retForm, returnTime: e.target.value })} /></Field>
              <Field label="Closing odometer"><input type="number" value={retForm.closeKm} onChange={(e) => setRetForm({ ...retForm, closeKm: e.target.value })} /></Field>
              <Field label="Fuel level"><input value={retForm.fuelEnd} placeholder="e.g. 25%" onChange={(e) => setRetForm({ ...retForm, fuelEnd: e.target.value })} /></Field>
              <Field label="Condition">
                <select value={retForm.condition} onChange={(e) => setRetForm({ ...retForm, condition: e.target.value })}>
                  <option>Good</option>
                  <option>Damaged</option>
                </select>
              </Field>
              <Field label="New defects / damage"><input value={retForm.newDefects} placeholder="Any new damage?" onChange={(e) => setRetForm({ ...retForm, newDefects: e.target.value })} /></Field>
              <Field label="Supervisor approval"><input value={retForm.supervisor} placeholder="Supervisor name" onChange={(e) => setRetForm({ ...retForm, supervisor: e.target.value })} /></Field>
            </div>
            <p className="mut">Total KM &amp; fuel used auto-calculate on save.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn ok" onClick={doReturn} disabled={saving}>Complete return</button>
              <button className="btn ghost" onClick={() => setRet(null)}>Cancel</button>
            </div>
          </div>
        )}
        {loading ? <Loading /> : (
          <Tbl headers={['Driver', 'Vehicle / times', 'Odometer / KM done', 'Fuel', 'Condition', '']}>
            {items.map((s) => {
              const km = s.closeKm && s.openKm ? Number(s.closeKm) - Number(s.openKm) : '—'
              return (
                <tr key={idOf(s)}>
                  <td>{s.driverName}<br /><span className="mut">{s.driverId}</span></td>
                  <td><b>{s.vehicle}</b><br /><span className="mut">{s.startTime} → {s.returnTime || 'out'}</span></td>
                  <td>{esc(s.openKm)} → {esc(s.closeKm || '—')}<br /><b>{km}</b></td>
                  <td>{esc(s.fuelStart)} → {esc(s.fuelEnd || '—')}</td>
                  <td>{statusBadge(s.returnTime ? (s.newDefects ? 'Damaged' : 'Good') : s.condition || 'Checked')}</td>
                  <td className="row-actions">
                    {!s.returnTime && <button className="btn ok" onClick={() => openReturn(s)}>Return</button>}
                    <button className="btn danger" onClick={() => remove(s)}>✕</button>
                  </td>
                </tr>
              )
            })}
          </Tbl>
        )}
        <Err e={error} onRetry={reload} />
      </Card>
    </div>
  )
}

/* ---------- Trips ---------- */
function TripsView({ date, drivers, vehicles }) {
  const { items, loading, error, reload } = useList('/api/trips', date)
  const [f, setF] = useState({ vehicle: '', driver: '', timeOut: '08:00', from: '', to: '', purpose: '', kmOut: '', timeIn: '', kmIn: '' })
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const add = async () => {
    setErr(null)
    if (!f.from || !f.to || !f.kmOut) {
      setErr(new Error('From, To and KM-out required'))
      return
    }
    try {
      await post('/api/trips', {
        date,
        vehicle: f.vehicle || vehicles[0]?.reg || '',
        driver: f.driver || drivers[0]?.name || '',
        timeOut: f.timeOut, from: f.from, to: f.to, purpose: f.purpose,
        kmOut: f.kmOut, timeIn: f.timeIn, kmIn: f.kmIn,
      })
      setF({ vehicle: '', driver: '', timeOut: '08:00', from: '', to: '', purpose: '', kmOut: '', timeIn: '', kmIn: '' })
      await reload()
    } catch (e) {
      setErr(e)
    }
  }
  const remove = async (t) => {
    if (!window.confirm('Delete this trip?')) return
    await del(`/api/trips/${idOf(t)}`)
    await reload()
  }

  return (
    <div>
      <h2>Trips — {date}</h2>
      <p className="mut">Log each journey separately: who drove, which vehicle, from where to where, and why.</p>
      <Err e={err} />
      <Card>
        <div className="formgrid">
          <Field label="Vehicle">
            <select value={f.vehicle} onChange={set('vehicle')}>
              <option value="">— select —</option>
              {vehicles.map((x) => <option key={x.reg || idOf(x)} value={x.reg}>{x.reg}</option>)}
            </select>
          </Field>
          <Field label="Driver">
            <select value={f.driver} onChange={set('driver')}>
              <option value="">— select —</option>
              {drivers.map((x) => <option key={x.driverId || idOf(x)} value={x.name}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="Time out"><input type="time" value={f.timeOut} onChange={set('timeOut')} /></Field>
          <Field label="From"><input value={f.from} placeholder="Office" onChange={set('from')} /></Field>
          <Field label="To"><input value={f.to} placeholder="Client Site A" onChange={set('to')} /></Field>
          <Field label="Purpose"><input value={f.purpose} placeholder="Delivery" onChange={set('purpose')} /></Field>
          <Field label="KM out"><input type="number" value={f.kmOut} onChange={set('kmOut')} /></Field>
          <Field label="Time in"><input type="time" value={f.timeIn} onChange={set('timeIn')} /></Field>
          <Field label="KM in"><input type="number" value={f.kmIn} onChange={set('kmIn')} /></Field>
        </div>
        <div style={{ marginTop: 8 }}><button className="btn primary" onClick={add}>Log trip</button></div>
      </Card>
      <Card style={{ marginTop: 12 }}>
        {loading ? <Loading /> : (
          <Tbl headers={['Time', 'Vehicle / Driver', 'Route / Purpose', 'KM', '']}>
            {items.map((t) => (
              <tr key={idOf(t)}>
                <td>{t.timeOut}→{t.timeIn || '…'}</td>
                <td><b>{t.vehicle}</b><br />{t.driver}</td>
                <td>{t.from} → {t.to}<br /><span className="mut">{t.purpose}</span></td>
                <td>{esc(t.kmOut)}→{esc(t.kmIn || '…')}<br /><b>{t.kmIn ? `${Number(t.kmIn) - Number(t.kmOut)} km` : ''}</b></td>
                <td className="row-actions"><button className="btn danger" onClick={() => remove(t)}>✕</button></td>
              </tr>
            ))}
          </Tbl>
        )}
        <Err e={error} onRetry={reload} />
      </Card>
    </div>
  )
}

/* ---------- Time Log ---------- */
function TimeView({ date, drivers }) {
  const { items, loading, error, reload } = useList('/api/timelogs', date)
  const [f, setF] = useState({ driver: '', event: 'Departure', time: '', note: '' })
  const [err, setErr] = useState(null)

  const add = async () => {
    setErr(null)
    try {
      await post('/api/timelogs', {
        date,
        driver: f.driver || drivers[0]?.name || '',
        event: f.event,
        time: f.time || new Date().toTimeString().slice(0, 5),
        note: f.note,
      })
      setF({ driver: '', event: 'Departure', time: '', note: '' })
      await reload()
    } catch (e) {
      setErr(e)
    }
  }
  const remove = async (t) => {
    await del(`/api/timelogs/${idOf(t)}`)
    await reload()
  }

  return (
    <div>
      <h2>Time Log — {date}</h2>
      <p className="mut">Record the key moments of the day: departures, arrivals, waiting, breaks and sign-out.</p>
      <Err e={err} />
      <Card>
        <div className="formgrid">
          <Field label="Driver">
            <select value={f.driver} onChange={(e) => setF({ ...f, driver: e.target.value })}>
              <option value="">— select —</option>
              {drivers.map((x) => <option key={x.driverId || idOf(x)} value={x.name}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="Event">
            <select value={f.event} onChange={(e) => setF({ ...f, event: e.target.value })}>
              {TIME_EVENTS.map((e) => <option key={e}>{e}</option>)}
            </select>
          </Field>
          <Field label="Time"><input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
          <Field label="Note"><input value={f.note} placeholder="e.g. waiting 45 min at client" onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        </div>
        <div style={{ marginTop: 8 }}><button className="btn primary" onClick={add}>Add entry</button></div>
      </Card>
      <Card style={{ marginTop: 12 }}>
        {loading ? <Loading /> : (
          <Tbl headers={['Driver', 'Event', 'Time', 'Note', '']}>
            {items.map((t) => (
              <tr key={idOf(t)}>
                <td>{t.driver}</td><td>{t.event}</td><td>{t.time}</td><td>{t.note}</td>
                <td className="row-actions"><button className="btn danger" onClick={() => remove(t)}>✕</button></td>
              </tr>
            ))}
          </Tbl>
        )}
        <Err e={error} onRetry={reload} />
      </Card>
    </div>
  )
}

/* ---------- Fuel ---------- */
function FuelView({ date, drivers, vehicles }) {
  const { items, loading, error, reload } = useList('/api/fuels', date)
  const [f, setF] = useState({ vehicle: '', driver: '', odoBefore: '', odoAfter: '', station: '', litres: '', price: '', total: '', fuelType: 'Diesel', receipt: '', time: '' })
  const [err, setErr] = useState(null)
  const set = (k) => (e) => {
    const v = e.target.value
    setF((x) => {
      const n = { ...x, [k]: v }
      if (k === 'litres' || k === 'price') n.total = String((Number(n.litres) || 0) * (Number(n.price) || 0))
      return n
    })
  }

  const add = async () => {
    setErr(null)
    if (!Number(f.litres)) {
      setErr(new Error('Litres required'))
      return
    }
    try {
      const l = Number(f.litres), p = Number(f.price) || 0
      await post('/api/fuels', {
        date,
        time: new Date().toTimeString().slice(0, 5),
        vehicle: f.vehicle || vehicles[0]?.reg || '',
        driver: f.driver || drivers[0]?.name || '',
        odoBefore: f.odoBefore, odoAfter: f.odoAfter, station: f.station,
        litres: l, price: p, total: f.total === '' ? l * p : Number(f.total),
        fuelType: f.fuelType, receipt: f.receipt,
      })
      setF({ vehicle: '', driver: '', odoBefore: '', odoAfter: '', station: '', litres: '', price: '', total: '', fuelType: 'Diesel', receipt: '', time: '' })
      await reload()
    } catch (e) {
      setErr(e)
    }
  }
  const remove = async (x) => {
    await del(`/api/fuels/${idOf(x)}`)
    await reload()
  }

  return (
    <div>
      <h2>Fuel — {date}</h2>
      <p className="mut">Record every refuel. The system works out kilometres per litre automatically.</p>
      <Err e={err} />
      <Card>
        <div className="formgrid">
          <Field label="Vehicle">
            <select value={f.vehicle} onChange={set('vehicle')}>
              <option value="">— select —</option>
              {vehicles.map((x) => <option key={x.reg || idOf(x)} value={x.reg}>{x.reg}</option>)}
            </select>
          </Field>
          <Field label="Driver">
            <select value={f.driver} onChange={set('driver')}>
              <option value="">— select —</option>
              {drivers.map((x) => <option key={x.driverId || idOf(x)} value={x.name}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="Odometer before">
            <input type="number" value={f.odoBefore} placeholder="45250" onChange={set('odoBefore')} />
          </Field>
          <Field label="Odometer after">
            <input type="number" value={f.odoAfter} placeholder="45290" onChange={set('odoAfter')} />
          </Field>
          <Field label="Station"><input value={f.station} placeholder="Station A" onChange={set('station')} /></Field>
          <Field label="Litres"><input type="number" value={f.litres} placeholder="40" onChange={set('litres')} /></Field>
          <Field label="Price / litre"><input type="number" value={f.price} placeholder="180" onChange={set('price')} /></Field>
          <Field label="Total"><input type="number" value={f.total} onChange={set('total')} /></Field>
          <Field label="Fuel type">
            <select value={f.fuelType} onChange={set('fuelType')}><option>Diesel</option><option>Petrol</option></select>
          </Field>
          <Field label="Receipt no."><input value={f.receipt} placeholder="00125" onChange={set('receipt')} /></Field>
        </div>
        <div style={{ marginTop: 8 }}><button className="btn primary" onClick={add}>Record uplift</button></div>
      </Card>
      <Card style={{ marginTop: 12 }}>
        {loading ? <Loading /> : (
          <Tbl headers={['Vehicle / Driver', 'Odometer', 'Station / Receipt', 'Litres @ Price', 'Total', 'Check', '']}>
            {items.map((x) => (
              <tr key={idOf(x)}>
                <td>{x.vehicle}<br /><span className="mut">{x.driver}</span></td>
                <td>{esc(x.odoBefore)}→{esc(x.odoAfter)}</td>
                <td>{esc(x.station)}<br /><span className="mut">{esc(x.fuelType)} · #{esc(x.receipt || '—')}</span></td>
                <td>{esc(x.litres)} L @ {esc(x.price)}</td>
                <td>KSh {esc(x.total)}</td>
                <td>{x.receipt
                  ? <span className="badge b-green">receipt ✓</span>
                  : <span className="badge b-red">NO RECEIPT</span>}</td>
                <td className="row-actions"><button className="btn danger" onClick={() => remove(x)}>✕</button></td>
              </tr>
            ))}
          </Tbl>
        )}
        <Err e={error} onRetry={reload} />
      </Card>
    </div>
  )
}

/* ---------- Maintenance ---------- */
function MaintView({ vehicles }) {
  const { items, loading, error, reload } = useList('/api/maintenance')
  const [f, setF] = useState({ vehicle: '', date: todayStr(), odo: '', issue: '', action: '', cost: '', nextSvc: '', status: 'Complete' })
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const add = async () => {
    setErr(null)
    try {
      await post('/api/maintenance', {
        date: f.date, vehicle: f.vehicle || vehicles[0]?.reg || '', odo: f.odo,
        issue: f.issue, action: f.action, cost: f.cost === '' ? 0 : Number(f.cost),
        nextSvc: f.nextSvc, status: f.status,
      })
      setF({ vehicle: '', date: todayStr(), odo: '', issue: '', action: '', cost: '', nextSvc: '', status: 'Complete' })
      await reload()
    } catch (e) {
      setErr(e)
    }
  }
  const remove = async (m) => {
    await del(`/api/maintenance/${idOf(m)}`)
    await reload()
  }

  return (
    <div>
      <h2>Maintenance</h2>
      <p className="mut">Services, repairs and costs for every vehicle — never miss a service again.</p>
      <Err e={err} />
      <Card>
        <div className="formgrid">
          <Field label="Vehicle">
            <select value={f.vehicle} onChange={set('vehicle')}>
              <option value="">— select —</option>
              {vehicles.map((x) => <option key={x.reg || idOf(x)} value={x.reg}>{x.reg}</option>)}
            </select>
          </Field>
          <Field label="Date"><input type="date" value={f.date} onChange={set('date')} /></Field>
          <Field label="Odometer"><input type="number" value={f.odo} onChange={set('odo')} /></Field>
          <Field label="Issue / Service"><input value={f.issue} placeholder="Oil service" onChange={set('issue')} /></Field>
          <Field label="Action taken"><input value={f.action} placeholder="Oil & filter changed" onChange={set('action')} /></Field>
          <Field label="Cost (KSh)"><input type="number" value={f.cost} onChange={set('cost')} /></Field>
          <Field label="Next service (km)"><input type="number" value={f.nextSvc} onChange={set('nextSvc')} /></Field>
          <Field label="Status">
            <select value={f.status} onChange={set('status')}>
              <option>Complete</option><option>Pending</option><option>Scheduled</option>
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 8 }}><button className="btn primary" onClick={add}>Add record</button></div>
      </Card>
      <Card style={{ marginTop: 12 }}>
        {loading ? <Loading /> : (
          <Tbl headers={['Date', 'Vehicle', 'Issue / Action', 'Cost / Next', 'Status', '']}>
            {items.map((m) => (
              <tr key={idOf(m)}>
                <td>{m.date}</td>
                <td><b>{m.vehicle}</b><br /><span className="mut">{esc(m.odo)} km</span></td>
                <td>{esc(m.issue)}<br /><span className="mut">{esc(m.action)}</span></td>
                <td>KSh {esc(m.cost)}<br /><span className="mut">next: {esc(m.nextSvc)}</span></td>
                <td>{statusBadge(m.status)}</td>
                <td className="row-actions"><button className="btn danger" onClick={() => remove(m)}>✕</button></td>
              </tr>
            ))}
          </Tbl>
        )}
        <Err e={error} onRetry={reload} />
      </Card>
    </div>
  )
}

/* ---------- Exceptions ---------- */
function ExceptionsView({ date, drivers, vehicles }) {
  const inc = useList('/api/incidents')
  const [report, setReport] = useState(null)
  const [repErr, setRepErr] = useState(null)
  const [f, setF] = useState({ date, type: 'Accident', vehicle: '', driver: '', severity: 'Medium', detail: '', status: 'Open' })
  const [err, setErr] = useState(null)

  useEffect(() => {
    setF((x) => ({ ...x, date }))
  }, [date])

  const loadReport = async () => {
    setRepErr(null)
    try {
      setReport(await get(`/api/report?date=${date}`))
    } catch (e) {
      setRepErr(e)
    }
  }
  useEffect(() => {
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const add = async () => {
    setErr(null)
    try {
      await post('/api/incidents', {
        date: f.date,
        type: f.type,
        vehicle: f.vehicle || vehicles[0]?.reg || '',
        driver: f.driver || drivers[0]?.name || '',
        severity: f.severity,
        detail: f.detail,
        status: 'Open',
      })
      setF({ date, type: 'Accident', vehicle: '', driver: '', severity: 'Medium', detail: '', status: 'Open' })
      await inc.reload()
      await loadReport()
    } catch (e) {
      setErr(e)
    }
  }
  const close = async (i) => {
    await put(`/api/incidents/${idOf(i)}`, { status: 'Closed' })
    await inc.reload()
  }
  const remove = async (i) => {
    if (!window.confirm('Delete this incident?')) return
    await del(`/api/incidents/${idOf(i)}`)
    await inc.reload()
  }

  const auto = report?.exceptions || []

  return (
    <div>
      <h2>Incidents</h2>
      <p className="mut">Accidents, breakdowns, damage, late returns — anything unusual goes here.</p>
      <Err e={err} />
      <Card>
        <div className="formgrid">
          <Field label="Date"><input type="date" value={f.date} onChange={set('date')} /></Field>
          <Field label="Type">
            <select value={f.type} onChange={set('type')}>
              {INCIDENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Vehicle">
            <select value={f.vehicle} onChange={set('vehicle')}>
              <option value="">— select —</option>
              {vehicles.map((x) => <option key={x.reg || idOf(x)} value={x.reg}>{x.reg}</option>)}
            </select>
          </Field>
          <Field label="Driver">
            <select value={f.driver} onChange={set('driver')}>
              <option value="">— select —</option>
              {drivers.map((x) => <option key={x.driverId || idOf(x)} value={x.name}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="Severity">
            <select value={f.severity} onChange={set('severity')}>
              <option>High</option><option>Medium</option><option>Low</option>
            </select>
          </Field>
          <Field label="Details"><input value={f.detail} placeholder="Describe the event" onChange={set('detail')} /></Field>
        </div>
        <div style={{ marginTop: 8 }}><button className="btn primary" onClick={add}>Log incident</button></div>
      </Card>
      <Card style={{ marginTop: 12 }} title={`Auto-detected exceptions for ${date} (${auto.length})`}>
        {repErr ? <Err e={repErr} onRetry={loadReport} /> : auto.map((e, i) => (
          <div className={`alert ${e.sev === 'High' ? 'red' : ''}`} key={i}>
            <b>{e.type}</b> — {e.detail}
          </div>
        )) || <p className="mut">None.</p>}
      </Card>
      <Card style={{ marginTop: 12 }}>
        {inc.loading ? <Loading /> : (
          <Tbl headers={['Date', 'Type', 'Detail', 'Severity', 'Status', '']}>
            {inc.items.map((i) => (
              <tr key={idOf(i)}>
                <td>{i.date}</td>
                <td>{i.type}</td>
                <td><b>{i.vehicle}</b> · {i.driver}<br />{i.detail}</td>
                <td>{statusBadge(i.severity)}</td>
                <td>{statusBadge(i.status)}</td>
                <td className="row-actions">
                  {i.status !== 'Closed' && <button className="btn" onClick={() => close(i)}>Close</button>}
                  <button className="btn danger" onClick={() => remove(i)}>✕</button>
                </td>
              </tr>
            ))}
          </Tbl>
        )}
        <Err e={inc.error} onRetry={inc.reload} />
      </Card>
    </div>
  )
}

/* ---------- Drivers ---------- */
function DriversView({ drivers, reload }) {
  const [f, setF] = useState({ driverId: '', name: '', licence: '', phone: '', status: 'Active' })
  const [editing, setEditing] = useState(null)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const reset = () => {
    setF({ driverId: '', name: '', licence: '', phone: '', status: 'Active' })
    setEditing(null)
  }

  const save = async () => {
    setErr(null)
    if (!f.name) {
      setErr(new Error('Name required'))
      return
    }
    try {
      if (editing) {
        await put(`/api/drivers/${idOf(editing)}`, f)
      } else {
        await post('/api/drivers', f.driverId ? f : { ...f, driverId: f.driverId || `D-${Date.now().toString(36).toUpperCase().slice(-4)}` })
      }
      reset()
      await reload()
    } catch (e) {
      setErr(e)
    }
  }
  const edit = (d) => {
    setEditing(d)
    setF({ driverId: d.driverId || '', name: d.name || '', licence: d.licence || '', phone: d.phone || '', status: d.status || 'Active' })
  }
  const remove = async (d) => {
    if (!window.confirm('Delete this driver?')) return
    await del(`/api/drivers/${idOf(d)}`)
    await reload()
  }

  return (
    <div>
      <h2>Drivers</h2>
      <p className="mut">Everyone who drives for SAC (K) Ltd, with licence and contact details.</p>
      <Err e={err} />
      <Card title={editing ? 'Edit driver' : 'Add driver'}>
        <div className="formgrid">
          <Field label="Full name"><input value={f.name} onChange={set('name')} /></Field>
          <Field label="Driver ID"><input value={f.driverId} placeholder="D-003" onChange={set('driverId')} /></Field>
          <Field label="Licence"><input value={f.licence} onChange={set('licence')} /></Field>
          <Field label="Phone"><input value={f.phone} onChange={set('phone')} /></Field>
          <Field label="Status">
            <select value={f.status} onChange={set('status')}>
              <option>Active</option><option>Suspended</option><option>Inactive</option>
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button className="btn primary" onClick={save}>{editing ? 'Save changes' : 'Add driver'}</button>
          {editing && <button className="btn ghost" onClick={reset}>Cancel</button>}
        </div>
      </Card>
      <Card style={{ marginTop: 12 }}>
        <Tbl headers={['Driver', 'Licence', 'Phone', 'Status', '']}>
          {drivers.map((x) => (
            <tr key={idOf(x)}>
              <td><b>{x.name}</b><br /><span className="mut">{x.driverId}</span></td>
              <td>{x.licence}</td><td>{x.phone}</td><td>{statusBadge(x.status)}</td>
              <td className="row-actions">
                <button className="btn" onClick={() => edit(x)}>Edit</button>
                <button className="btn danger" onClick={() => remove(x)}>✕</button>
              </td>
            </tr>
          ))}
        </Tbl>
      </Card>
    </div>
  )
}

/* ---------- Vehicles ---------- */
const VEH_STATUSES = ['Available', 'On Trip', 'Maintenance']
function VehiclesView({ vehicles, reload }) {
  const empty = { reg: '', make: '', year: new Date().getFullYear(), fuel: 'Diesel', mileage: '', expectedKml: 10, nextServiceKm: '', nextServiceDate: '', insuranceExpiry: '', status: 'Available' }
  const [f, setF] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const reset = () => {
    setF(empty)
    setEditing(null)
  }
  const save = async () => {
    setErr(null)
    if (!f.reg && !editing) {
      setErr(new Error('Registration required'))
      return
    }
    try {
      const payload = { ...f, year: f.year === '' ? '' : Number(f.year), mileage: f.mileage === '' ? 0 : Number(f.mileage), expectedKml: f.expectedKml === '' ? 0 : Number(f.expectedKml) }
      if (editing) await put(`/api/vehicles/${idOf(editing)}`, payload)
      else await post('/api/vehicles', payload)
      reset()
      await reload()
    } catch (e) {
      setErr(e)
    }
  }
  const edit = (v) => {
    setEditing(v)
    setF({ reg: v.reg || '', make: v.make || '', year: v.year ?? '', fuel: v.fuel || 'Diesel', mileage: v.mileage ?? '', expectedKml: v.expectedKml ?? '', nextServiceKm: v.nextServiceKm ?? '', nextServiceDate: v.nextServiceDate ?? '', insuranceExpiry: v.insuranceExpiry ?? '', status: v.status || 'Available' })
  }
  const remove = async (v) => {
    if (!window.confirm(`Delete vehicle ${v.reg}?`)) return
    await del(`/api/vehicles/${idOf(v)}`)
    await reload()
  }
  const cycle = async (v) => {
    const next = v.status === 'Available' ? 'On Trip' : v.status === 'On Trip' ? 'Maintenance' : 'Available'
    await put(`/api/vehicles/${idOf(v)}`, { status: next })
    await reload()
  }

  return (
    <div>
      <h2>Vehicles</h2>
      <p className="mut">Every company vehicle, its mileage, fuel type and next service.</p>
      <Err e={err} />
      <Card title={editing ? `Edit ${editing.reg}` : 'Add vehicle'}>
        <div className="formgrid">
          <Field label="Registration"><input value={f.reg} placeholder="KXX 123A" onChange={set('reg')} /></Field>
          <Field label="Make / model"><input value={f.make} onChange={set('make')} /></Field>
          <Field label="Year"><input type="number" value={f.year} onChange={set('year')} /></Field>
          <Field label="Fuel">
            <select value={f.fuel} onChange={set('fuel')}><option>Diesel</option><option>Petrol</option></select>
          </Field>
          <Field label="Current mileage"><input type="number" value={f.mileage} onChange={set('mileage')} /></Field>
          <Field label="Expected km/L"><input type="number" value={f.expectedKml} onChange={set('expectedKml')} /></Field>
          <Field label="Next service km"><input type="number" value={f.nextServiceKm} onChange={set('nextServiceKm')} /></Field>
          <Field label="Next service date"><input type="date" value={f.nextServiceDate} onChange={set('nextServiceDate')} /></Field>
          <Field label="Insurance expiry"><input type="date" value={f.insuranceExpiry} onChange={set('insuranceExpiry')} /></Field>
          <Field label="Status">
            <select value={f.status} onChange={set('status')}>
              {VEH_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button className="btn primary" onClick={save}>{editing ? 'Save changes' : 'Add vehicle'}</button>
          {editing && <button className="btn ghost" onClick={reset}>Cancel</button>}
        </div>
      </Card>
      <Card style={{ marginTop: 12 }}>
        <Tbl headers={['Vehicle', 'Fuel / Mileage', 'Next service', 'Status', '']}>
          {vehicles.map((x) => (
            <tr key={idOf(x)}>
              <td><b>{x.reg}</b><br /><span className="mut">{x.make} {x.year || ''}</span></td>
              <td>{esc(x.fuel)}<br /><span className="mut">{Number(x.mileage || 0).toLocaleString()} km · {esc(x.expectedKml ?? '—')} km/L</span></td>
              <td>{esc(x.nextServiceKm || '—')} km<br /><span className="mut">{esc(x.nextServiceDate || '')}</span></td>
              <td>{statusBadge(x.status)}</td>
              <td className="row-actions">
                <button className="btn" onClick={() => edit(x)}>Edit</button>
                <button className="btn" onClick={() => cycle(x)}>Cycle status</button>
                <button className="btn danger" onClick={() => remove(x)}>✕</button>
              </td>
            </tr>
          ))}
        </Tbl>
      </Card>
    </div>
  )
}

/* ---------- Daily Report ---------- */
function ReportView({ date }) {
  const [report, setReport] = useState(null)
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [rep, tr] = await Promise.all([
        get(`/api/report?date=${date}`),
        get(`/api/trips?date=${date}`),
      ])
      setReport(rep)
      setTrips(Array.isArray(tr) ? tr : [])
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  if (loading) return <Loading what="Loading report…" />
  if (error) return <Err e={error} onRetry={load} />
  const k = report?.kpis || {}
  const kpis = [
    ['Vehicles in operation', k.vehiclesInOperation],
    ['Drivers active', k.driversActive],
    ['Total KM travelled', `${Number(k.totalKm ?? 0).toLocaleString()} KM`],
    ['Total fuel uplifted', `${k.totalFuelL ?? 0} L`],
    ['Total fuel cost', `KSh ${Number(k.totalFuelCost ?? 0).toLocaleString()}`],
    ['Average consumption', k.avgKmPerL == null ? '— KM/L' : `${Number(k.avgKmPerL).toFixed(2)} KM/L`],
    ['Maintenance issues', k.maintenanceIssues],
    ['Completed trips', k.completedTrips],
    ['Uncompleted trips', k.uncompletedTrips],
  ]
  const byVeh = report?.byVehicle || []
  const exc = report?.exceptions || []

  return (
    <div>
      <div className="print-head">
        <h1>SAC (K) Ltd Drivers — Daily Fleet Summary</h1>
        <p>Date: {date}</p>
      </div>
      <div className="sec-title no-print">
        <h2>Daily Report — {date}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
      <Card title="Daily Fleet Summary">
        <Tbl headers={['KPI', 'Result']}>
          {kpis.map(([a, b]) => (
            <tr key={a}><td>{a}</td><td><b>{b ?? '—'}</b></td></tr>
          ))}
        </Tbl>
      </Card>
      <Card title="Vehicle-by-vehicle report" style={{ marginTop: 12 }}>
        <Tbl headers={['Vehicle', 'Driver', 'Opening', 'Closing', 'KM', 'Fuel L', 'KM/L', 'Issues']}>
          {byVeh.map((r, i) => (
            <tr key={i}>
              <td><b>{r.vehicle}</b></td><td>{r.driver}</td><td>{r.openKm}</td>
              <td>{r.closeKm}</td><td>{r.km}</td><td>{r.fuelL}</td>
              <td>{r.kmPerL == null ? '—' : Number(r.kmPerL).toFixed(2)}</td>
              <td>—</td>
            </tr>
          ))}
        </Tbl>
      </Card>
      <Card title={`Exceptions / incidents (${exc.length})`} style={{ marginTop: 12 }}>
        {exc.map((e, i) => (
          <div className={`alert ${e.sev === 'High' ? 'red' : ''}`} key={i}>
            <b>{e.type} [{e.sev}]</b> — {e.detail}
          </div>
        )) || <div className="alert green">No exceptions recorded.</div>}
      </Card>
      <Card title="Trip detail" style={{ marginTop: 12 }}>
        <Tbl headers={['Time', 'Vehicle/Driver', 'Route', 'KM']}>
          {trips.map((t) => (
            <tr key={idOf(t)}>
              <td>{t.timeOut}→{t.timeIn || ''}</td>
              <td>{t.vehicle} / {t.driver}</td>
              <td>{t.from}→{t.to} ({t.purpose})</td>
              <td>{t.kmIn ? Number(t.kmIn) - Number(t.kmOut) : '—'}</td>
            </tr>
          ))}
        </Tbl>
      </Card>
    </div>
  )
}

/* ---------- App ---------- */
export default function App() {
  const [tab, setTab] = useState('dash')
  const [date, setDate] = useState(todayStr())
  const [menuOpen, setMenuOpen] = useState(false)
  const drv = useList('/api/drivers')
  const veh = useList('/api/vehicles')
  const [health, setHealth] = useState(null)

  useEffect(() => {
    get('/api/health').then(setHealth).catch(() => setHealth({ ok: false }))
  }, [])

  const refreshFleet = () => {
    drv.reload()
    veh.reload()
  }

  const go = (id) => {
    setTab(id)
    setMenuOpen(false)
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <button className="btn ghost menu-btn" onClick={() => setMenuOpen((o) => !o)} title="Menu">
            ☰
          </button>
          <span className="logo">🚛</span>
          <div>
            <h1>SAC (K) Ltd Drivers</h1>
            <p>Daily driver &amp; vehicle management</p>
          </div>
        </div>
        <div className="top-actions">
          <label className="day-pick">
            Working day
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} title="Working day" />
          </label>
          <button className="btn primary" onClick={() => go('signin')}>+ Sign In Driver</button>
          {health && !health.ok && <span className="badge b-red">API offline</span>}
        </div>
      </header>
      <div className="layout">
        <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
          {NAV_GROUPS.map((g) => (
            <div key={g}>
              <div className="navgrp">{g}</div>
              {TABS.filter((t) => t.grp === g).map((t) => (
                <button key={t.id} className={`navbtn ${tab === t.id ? 'active' : ''}`} onClick={() => go(t.id)}>
                  <span className="ico">{t.icon}</span>
                  <span>
                    {t.t}
                    <small>{t.s}</small>
                  </span>
                </button>
              ))}
            </div>
          ))}
          {(drv.error || veh.error) && (
            <div className="alert red" style={{ marginTop: 8 }}>
              Could not load drivers &amp; vehicles. Check your connection.
              <button className="btn ghost sm" onClick={refreshFleet}>Retry</button>
            </div>
          )}
        </nav>
        <main className="content">
          {tab === 'dash' && <Dashboard date={date} />}
          {tab === 'signin' && (
            <SigninView date={date} drivers={drv.items} vehicles={veh.items} refreshFleet={refreshFleet} />
          )}
          {tab === 'trips' && <TripsView date={date} drivers={drv.items} vehicles={veh.items} />}
          {tab === 'time' && <TimeView date={date} drivers={drv.items} />}
          {tab === 'fuel' && <FuelView date={date} drivers={drv.items} vehicles={veh.items} />}
          {tab === 'maint' && <MaintView vehicles={veh.items} />}
          {tab === 'incidents' && (
            <ExceptionsView date={date} drivers={drv.items} vehicles={veh.items} />
          )}
          {tab === 'drivers' && <DriversView drivers={drv.items} reload={drv.reload} />}
          {tab === 'vehicles' && <VehiclesView vehicles={veh.items} reload={veh.reload} />}
          {tab === 'report' && <ReportView date={date} />}
        </main>
      </div>
    </>
  )
}
