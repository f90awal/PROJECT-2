import { useCallback, useEffect, useState } from 'react';
import { dispatchAPI } from '../api/axios';
import { FiCheckCircle, FiPlus, FiRefreshCw, FiTruck } from 'react-icons/fi';

function formatStatus(s) {
  return s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const vehicleTypes  = ['ambulance', 'fire_truck', 'police_car'];
const stationTypes  = ['ambulance', 'fire', 'police'];

// ── small reusable form section ──────────────────────────────────────────────
function Section({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>{title}</h2>
        <span style={{ fontSize: 18, color: '#888' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}

export default function Dispatch() {
  const [vehicles, setVehicles]               = useState([]);
  const [stations, setStations]               = useState([]);
  const [activeDispatches, setActiveDispatches] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [success, setSuccess]                 = useState('');
  const [error, setError]                     = useState('');

  // Register vehicle
  const [vCallSign, setVCallSign] = useState('');
  const [vType, setVType]         = useState('ambulance');
  const [vStation, setVStation]   = useState('');

  // Register driver
  const [dName, setDName]       = useState('');
  const [dPhone, setDPhone]     = useState('');
  const [dVehicle, setDVehicle] = useState('');

  // Register station
  const [sName, setSName]             = useState('');
  const [sType, setSType]             = useState('ambulance');
  const [sAddress, setSAddress]       = useState('');
  const [sLat, setSLat]               = useState('');
  const [sLng, setSLng]               = useState('');
  const [sResponders, setSResponders] = useState(4);

  const flash = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setSuccess(''); setError(''); }, 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [v, s, d] = await Promise.all([
        dispatchAPI.get('/vehicles'),
        dispatchAPI.get('/stations'),
        dispatchAPI.get('/dispatches/active'),
      ]);
      setVehicles(v.data ?? []);
      setStations(s.data ?? []);
      setActiveDispatches(d.data ?? []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Group vehicles by station
  const byStation = vehicles.reduce((acc, v) => {
    const key = v.stationId ?? 'unknown';
    if (!acc[key]) acc[key] = { name: v.station?.name ?? `Station #${key}`, type: v.station?.type ?? '', vehicles: [] };
    acc[key].vehicles.push(v);
    return acc;
  }, {});

  const activeDispatchByVehicleId = new Map(activeDispatches.map(d => [d.vehicleId, d]));

  const handleRegisterVehicle = async (e) => {
    e.preventDefault();
    try {
      await dispatchAPI.post('/vehicles/register', {
        callSign: vCallSign, type: vType, stationId: parseInt(vStation, 10),
      });
      flash('Vehicle registered successfully');
      setVCallSign(''); setVType('ambulance'); setVStation('');
      fetchAll();
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to register vehicle', true);
    }
  };

  const handleRegisterDriver = async (e) => {
    e.preventDefault();
    try {
      await dispatchAPI.post('/drivers/register', {
        name: dName, phone: dPhone || undefined, vehicleId: parseInt(dVehicle, 10),
      });
      flash('Driver registered and assigned');
      setDName(''); setDPhone(''); setDVehicle('');
      fetchAll();
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to register driver', true);
    }
  };

  const handleRegisterStation = async (e) => {
    e.preventDefault();
    try {
      await dispatchAPI.post('/stations/register', {
        name: sName, type: sType,
        location: { address: sAddress, lat: parseFloat(sLat), lng: parseFloat(sLng) },
        respondersCount: parseInt(sResponders, 10),
      });
      flash('Station registered and responders provisioned');
      setSName(''); setSType('ambulance'); setSAddress(''); setSLat(''); setSLng(''); setSResponders(4);
      fetchAll();
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to register station', true);
    }
  };

  const handleSeedStations = async () => {
    try {
      await dispatchAPI.post('/stations/seed', { reset: true, profile: 'full' });
      flash('Demo stations seeded successfully');
      fetchAll();
    } catch (err) {
      flash(err.response?.data?.detail || 'Seed failed', true);
    }
  };

  const handleArrive = async (dispatchId) => {
    try {
      await dispatchAPI.post(`/dispatches/${dispatchId}/arrive`);
      flash('Marked as arrived');
      fetchAll();
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to mark arrived', true);
    }
  };

  if (loading) return <div className="loading">Loading dispatch data...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dispatch Management</h1>
          <p className="page-subtitle">Vehicles, stations, active dispatches and responder registration</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={fetchAll}><FiRefreshCw size={14} /> Refresh</button>
          <button type="button" className="btn btn-primary" onClick={handleSeedStations}><FiPlus size={14} /> Seed Demo Stations</button>
        </div>
      </div>

      {success && <div className="alert alert-success"><FiCheckCircle size={16} />{success}</div>}
      {error   && <div className="alert alert-error">{error}</div>}

      {/* ── Active Dispatches ── */}
      <div className="card">
        <h2 className="card-title">Active Dispatches ({activeDispatches.length})</h2>
        {activeDispatches.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🚨</div><p>No active dispatches</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Dispatch ID</th><th>Vehicle</th><th>Driver</th><th>Incident</th><th>Status</th><th>Dispatched At</th><th>Action</th></tr>
              </thead>
              <tbody>
                {activeDispatches.map(d => (
                  <tr key={d.id}>
                    <td><span className="incident-id">#{d.id}</span></td>
                    <td><strong>{d.vehicle?.callSign ?? `#${d.vehicleId}`}</strong><br /><span style={{ fontSize: 11, color: '#888' }}>{d.vehicle?.type?.replace('_', ' ')}</span></td>
                    <td>{d.vehicle?.driver?.name ?? <span style={{ color: '#ccc' }}>—</span>}</td>
                    <td><span className="incident-id">#{d.incidentId}</span></td>
                    <td><span className={`badge badge-${d.status}`}>{formatStatus(d.status)}</span></td>
                    <td style={{ fontSize: 12, color: '#888' }}>{new Date(d.dispatchedAt).toLocaleString()}</td>
                    <td>
                      {d.status !== 'arrived' && (
                        <button type="button" className="btn btn-primary btn-icon" style={{ fontSize: 12, padding: '5px 12px' }}
                          onClick={() => handleArrive(d.id)}>
                          Mark Arrived
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Fleet by Station ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ marginBottom: 0 }}>Fleet by Station</h2>
          <span style={{ fontSize: 13, color: '#888' }}>{vehicles.length} total vehicles</span>
        </div>
        {Object.keys(byStation).length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🚒</div><p>No vehicles registered. Seed demo stations or register manually below.</p></div>
        ) : (
          Object.entries(byStation).map(([stationId, group]) => {
            const available  = group.vehicles.filter(v => v.status === 'available').length;
            const dispatched = group.vehicles.filter(v => v.status !== 'available' && v.status !== 'offline').length;
            return (
              <div key={stationId} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <FiTruck size={16} style={{ color: '#1D9E75' }} />
                  <strong style={{ fontSize: 14 }}>{group.name}</strong>
                  <span style={{ fontSize: 12, color: '#888', textTransform: 'capitalize' }}>{group.type} station</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>
                    {available} available · {dispatched} deployed
                  </span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Call Sign</th><th>Type</th><th>Status</th><th>Driver</th><th>Active Dispatch</th><th>Last Location</th></tr>
                    </thead>
                    <tbody>
                      {group.vehicles.map(v => {
                        const activeDispatch = activeDispatchByVehicleId.get(v.id);
                        const loc = v.locations?.[0];
                        return (
                          <tr key={v.id}>
                            <td><span className="incident-id">{v.callSign}</span></td>
                            <td style={{ textTransform: 'capitalize' }}>{v.type?.replace('_', ' ')}</td>
                            <td><span className={`badge badge-${v.status}`}>{formatStatus(v.status)}</span></td>
                            <td>{v.driver?.name ?? <span style={{ color: '#ccc' }}>No driver</span>}</td>
                            <td>
                              {activeDispatch
                                ? <span className="incident-id">Incident #{activeDispatch.incidentId}</span>
                                : <span style={{ color: '#ccc' }}>—</span>}
                            </td>
                            <td style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>
                              {loc ? `${parseFloat(loc.lat).toFixed(4)}, ${parseFloat(loc.lng).toFixed(4)}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Stations list ── */}
      <div className="card">
        <h2 className="card-title">Registered Stations ({stations.length})</h2>
        {stations.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🏢</div><p>No stations registered yet</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Coordinates</th></tr></thead>
              <tbody>
                {stations.map(s => (
                  <tr key={s.id}>
                    <td><span className="incident-id">#{s.id}</span></td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.type}</td>
                    <td style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
                      {s.lat != null ? `${parseFloat(s.lat).toFixed(5)}, ${parseFloat(s.lng).toFixed(5)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Registration forms ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

        <Section title="Register Station">
          <form onSubmit={handleRegisterStation}>
            <div className="form-group"><label>Station Name *</label>
              <input placeholder="Airport Fire Station" value={sName} onChange={e => setSName(e.target.value)} required /></div>
            <div className="form-group"><label>Type *</label>
              <select value={sType} onChange={e => setSType(e.target.value)}>
                {stationTypes.map(t => <option key={t} value={t}>{formatStatus(t)}</option>)}
              </select></div>
            <div className="form-group"><label>Address *</label>
              <input placeholder="Ring Road Central, Accra" value={sAddress} onChange={e => setSAddress(e.target.value)} required /></div>
            <div className="form-row">
              <div className="form-group"><label>Latitude *</label>
                <input type="number" step="any" placeholder="5.6037" value={sLat} onChange={e => setSLat(e.target.value)} required /></div>
              <div className="form-group"><label>Longitude *</label>
                <input type="number" step="any" placeholder="-0.1870" value={sLng} onChange={e => setSLng(e.target.value)} required /></div>
            </div>
            <div className="form-group"><label>Responders Count</label>
              <select value={sResponders} onChange={e => setSResponders(e.target.value)}>
                <option value={3}>3</option><option value={4}>4</option>
              </select></div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Register Station</button>
          </form>
        </Section>

        <Section title="Register Vehicle">
          <form onSubmit={handleRegisterVehicle}>
            <div className="form-group"><label>Call Sign *</label>
              <input placeholder="AMB-001" value={vCallSign} onChange={e => setVCallSign(e.target.value)} required /></div>
            <div className="form-group"><label>Vehicle Type *</label>
              <select value={vType} onChange={e => setVType(e.target.value)}>
                {vehicleTypes.map(t => <option key={t} value={t}>{formatStatus(t)}</option>)}
              </select></div>
            <div className="form-group"><label>Station *</label>
              <select value={vStation} onChange={e => setVStation(e.target.value)} required>
                <option value="">Select station</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Register Vehicle</button>
          </form>
        </Section>

        <Section title="Assign Driver">
          <form onSubmit={handleRegisterDriver}>
            <div className="form-group"><label>Driver Name *</label>
              <input placeholder="Kwame Mensah" value={dName} onChange={e => setDName(e.target.value)} required /></div>
            <div className="form-group"><label>Phone</label>
              <input placeholder="+233 020 123 4567" value={dPhone} onChange={e => setDPhone(e.target.value)} /></div>
            <div className="form-group"><label>Assign to Vehicle *</label>
              <select value={dVehicle} onChange={e => setDVehicle(e.target.value)} required>
                <option value="">Select vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.callSign} ({v.type?.replace('_', ' ')}) {v.driver ? '— has driver' : ''}
                  </option>
                ))}
              </select></div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Assign Driver</button>
          </form>
        </Section>

      </div>
    </div>
  );
}
