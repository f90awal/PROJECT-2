import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { dispatchAPI, incidentAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FiRefreshCw, FiWifi } from 'react-icons/fi';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// ── icons ────────────────────────────────────────────────────────────────────

const makeVehicleIcon = (color, emoji, active) => L.divIcon({
  html: `<div style="
    position:relative;
    width:38px;height:38px;
    display:flex;align-items:center;justify-content:center;
  ">
    ${active ? `<div style="
      position:absolute;inset:0;border-radius:50%;
      background:${color}55;
      animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;
      transform:scale(1.6);
    "></div>` : ''}
    <div style="
      position:relative;
      background:${color};
      width:36px;height:36px;border-radius:50%;
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.3);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
    ">${emoji}</div>
  </div>`,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const makeStationIcon = (color, emoji) => L.divIcon({
  html: `<div style="
    background:${color};
    width:34px;height:34px;border-radius:10px;
    border:2px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,.25);
    display:flex;align-items:center;justify-content:center;
    font-size:16px;
  ">${emoji}</div>`,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const makeIncidentIcon = (color, emoji) => L.divIcon({
  html: `<div style="
    background:${color};
    width:30px;height:30px;border-radius:8px;
    border:2px solid #fff;
    box-shadow:0 2px 6px rgba(0,0,0,.25);
    display:flex;align-items:center;justify-content:center;
    font-size:13px;
  ">${emoji}</div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const vehicleIconBase = {
  fire_truck: { color: '#e74c3c', emoji: '🚒' },
  ambulance:  { color: '#2980b9', emoji: '🚑' },
  police_car: { color: '#1D9E75', emoji: '🚔' },
};

const stationIconMap = {
  fire:      makeStationIcon('#e74c3c88', '👨🏾‍🚒'),
  ambulance: makeStationIcon('#2980b988', '🏥'),
  police:    makeStationIcon('#1D9E7588', '👮🏽'),
};

function incidentIcon(code) {
  const c = (code ?? '').toUpperCase();
  if (['FIRE', 'FLOOD', 'EXPLOSION'].some(k => c.includes(k)))
    return makeIncidentIcon('#e74c3c', '🔥');
  if (['MEDICAL', 'ACCIDENT', 'INJURY'].some(k => c.includes(k)))
    return makeIncidentIcon('#2980b9', '🏥');
  return makeIncidentIcon('#8e44ad', '🚨');
}

// ── helpers ──────────────────────────────────────────────────────────────────

function stationLatLng(s) {
  // station endpoint: s.lat/s.lng  OR  s.location.lat/s.location.lng
  const lat = parseFloat(s.location?.lat ?? s.lat);
  const lng = parseFloat(s.location?.lng ?? s.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function vehicleLatLng(v) {
  // 1. actual GPS fix
  const loc = v.locations?.[0];
  if (loc) {
    const lat = parseFloat(loc.lat);
    const lng = parseFloat(loc.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }
  // 2. fall back to the vehicle's station coords (so it's always shown)
  return stationLatLng(v.station ?? {});
}

function incidentLatLng(inc) {
  const center = inc.location?.center;
  if (Array.isArray(center) && center.length >= 2) {
    const lat = parseFloat(center[1]);
    const lng = parseFloat(center[0]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }
  return null;
}

function formatStatus(status) {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const roleVehicleType = {
  hospital_admin: 'ambulance',
  police_admin:   'police_car',
  fire_admin:     'fire_truck',
  system_admin:   null,
};

const POLL_INTERVAL_MS = 5000;

// ── RecenterMap ───────────────────────────────────────────────────────────────

function RecenterMap({ vehicles, stations }) {
  const map = useMap();
  const didCenter = useRef(false);

  useEffect(() => {
    if (didCenter.current) return; // only auto-center once on first load

    const pts = [
      ...vehicles.map(vehicleLatLng),
      ...stations.map(stationLatLng),
    ].filter(Boolean);

    if (pts.length > 0) {
      map.fitBounds(pts, { padding: [60, 60], maxZoom: 14 });
      didCenter.current = true;
    } else {
      map.setView([5.6037, -0.1870], 12);
    }
  }, [vehicles, stations, map]);

  return null;
}

// ── ping keyframe injected once ───────────────────────────────────────────────
if (!document.getElementById('leaflet-ping-style')) {
  const style = document.createElement('style');
  style.id = 'leaflet-ping-style';
  style.textContent = `@keyframes ping { 0%{transform:scale(1.6);opacity:.7} 75%,100%{transform:scale(2.4);opacity:0} }`;
  document.head.appendChild(style);
}

// ── Tracking page ─────────────────────────────────────────────────────────────

export default function Tracking() {
  const { user } = useAuth();
  const [vehicles, setVehicles]               = useState([]);
  const [stations, setStations]               = useState([]);
  const [activeDispatches, setActiveDispatches] = useState([]);
  const [incidents, setIncidents]             = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [lastUpdate, setLastUpdate]           = useState(null);
  const intervalRef = useRef(null);

  const vehicleType = roleVehicleType[user?.role];

  const fetchAll = useCallback(async () => {
    try {
      const [vRes, sRes, dRes, iRes] = await Promise.all([
        dispatchAPI.get('/vehicles'),
        dispatchAPI.get('/stations'),
        dispatchAPI.get('/dispatches/active'),
        incidentAPI.get('').catch(() => ({ data: { items: [] } })),
      ]);

      let all = vRes.data ?? [];
      if (vehicleType) all = all.filter(v => v.type === vehicleType);

      setVehicles(all);
      setStations(sRes.data ?? []);
      setActiveDispatches(dRes.data ?? []);

      // only show open/active incidents on the map (skip resolved/cancelled)
      const allInc = iRes.data?.items ?? [];
      setIncidents(allInc.filter(i => !['resolved', 'cancelled'].includes(i.status)));

      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Tracking fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [vehicleType]);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  const activeByVehicleId = new Map(activeDispatches.map(d => [d.vehicleId, d]));

  if (loading) return <div className="loading">Loading tracking data...</div>;

  const mappedVehicles  = vehicles.filter(v => vehicleLatLng(v));
  const mappedStations  = stations.filter(s => stationLatLng(s));
  const mappedIncidents = incidents.filter(i => incidentLatLng(i));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Vehicle Tracking</h1>
          <p className="page-subtitle">
            Vehicles · Stations · Active Incidents — polled every 5 s
            <span style={{ marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#1D9E75', fontWeight: 600 }}>
              <FiWifi size={12} /> Live
            </span>
            {lastUpdate && <span style={{ marginLeft: 8, fontSize: 12, color: '#aaa' }}>Last update: {lastUpdate}</span>}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchAll}><FiRefreshCw size={14} /> Refresh</button>
      </div>

      {/* legend */}
      <div className="map-legend">
        {(!vehicleType || vehicleType === 'fire_truck') && <div className="legend-item"><span className="legend-dot" style={{ background: '#e74c3c' }} />🚒 Fire Truck</div>}
        {(!vehicleType || vehicleType === 'ambulance')  && <div className="legend-item"><span className="legend-dot" style={{ background: '#2980b9' }} />🚑 Ambulance</div>}
        {(!vehicleType || vehicleType === 'police_car') && <div className="legend-item"><span className="legend-dot" style={{ background: '#1D9E75' }} />🚔 Police Car</div>}
        <div className="legend-item"><span className="legend-dot" style={{ background: '#e74c3c88', borderRadius: 4 }} />🏢 Station</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#8e44ad88', borderRadius: 4 }} />🚨 Incident</div>
        <div className="legend-item" style={{ marginLeft: 'auto', color: '#aaa', fontSize: 12 }}>
          {mappedVehicles.length} vehicle{mappedVehicles.length !== 1 ? 's' : ''} ·{' '}
          {mappedStations.length} station{mappedStations.length !== 1 ? 's' : ''} ·{' '}
          {activeDispatches.length} dispatched
        </div>
      </div>

      {/* map */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div className="tracking-map">
          <MapContainer center={[5.6037, -0.1870]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <RecenterMap vehicles={mappedVehicles} stations={mappedStations} />

            {/* station markers */}
            {mappedStations.map(s => {
              const pos = stationLatLng(s);
              const stationVehicles = vehicles.filter(v => v.stationId === s.id);
              const activeCnt = stationVehicles.filter(v => activeByVehicleId.has(v.id)).length;
              return (
                <Marker key={`station-${s.id}`} position={pos} icon={stationIconMap[s.type] ?? stationIconMap.police}>
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                        <div>🏢 Type: <strong style={{ textTransform: 'capitalize' }}>{s.type}</strong></div>
                        <div>🚗 Responders: <strong>{stationVehicles.length}</strong></div>
                        <div>📡 Active dispatches: <strong>{activeCnt}</strong></div>
                        {(s.location?.address || s.address) && (
                          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{s.location?.address ?? s.address}</div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* incident markers */}
            {mappedIncidents.map(inc => {
              const pos = incidentLatLng(inc);
              return (
                <Marker key={`inc-${inc.id}`} position={pos} icon={incidentIcon(inc.type?.code)}>
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
                        Incident #{inc.id}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                        <div>🏷 Type: <strong>{inc.type?.code ?? '—'}</strong></div>
                        <div>📊 Status: <strong>{formatStatus(inc.status)}</strong></div>
                        {inc.metadata?.callerName && <div>👤 Caller: <strong>{inc.metadata.callerName}</strong></div>}
                        {inc.location?.address && <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{inc.location.address}</div>}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* vehicle markers */}
            {mappedVehicles.map(v => {
              const pos = vehicleLatLng(v);
              const active = activeByVehicleId.has(v.id);
              const { color, emoji } = vehicleIconBase[v.type] ?? vehicleIconBase.ambulance;
              return (
                <Marker key={v.id} position={pos} icon={makeVehicleIcon(color, emoji, active)}>
                  <Popup>
                    <div style={{ minWidth: 190 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
                        {v.callSign}
                        {active && <span style={{ marginLeft: 8, fontSize: 11, color: '#e74c3c', fontWeight: 700 }}>● DISPATCHED</span>}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                        <div>🚗 Type: <strong style={{ textTransform: 'capitalize' }}>{v.type?.replace('_', ' ')}</strong></div>
                        <div>🏢 Station: <strong>{v.station?.name ?? v.stationId ?? '—'}</strong></div>
                        <div>📊 Status: <strong>{formatStatus(v.status)}</strong></div>
                        <div>👤 Driver: <strong>{v.driver?.name ?? '—'}</strong></div>
                        {v.locations?.[0]?.speed != null && (
                          <div>⚡ Speed: <strong>{v.locations[0].speed} km/h</strong></div>
                        )}
                        {active && (
                          <div>🚨 Incident: <strong>#{activeByVehicleId.get(v.id)?.incidentId}</strong></div>
                        )}
                        {!v.locations?.[0] && (
                          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>📍 At station (no GPS fix)</div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* vehicle table */}
      <div className="card">
        <h2 className="card-title">Vehicle Status ({vehicles.length})</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Call Sign</th><th>Type</th><th>Status</th><th>Driver</th>
                <th>Active Dispatch</th><th>Speed</th><th>Coordinates</th><th>Last Update</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr><td colSpan="8" className="table-empty">No vehicles registered yet. Seed demo stations from Dispatch.</td></tr>
              ) : vehicles.map(v => {
                const loc = v.locations?.[0];
                const active = activeByVehicleId.get(v.id);
                return (
                  <tr key={v.id}>
                    <td><span className="incident-id">{v.callSign}</span></td>
                    <td style={{ textTransform: 'capitalize' }}>{v.type?.replace('_', ' ')}</td>
                    <td><span className={`badge badge-${v.status}`}>{formatStatus(v.status)}</span></td>
                    <td>{v.driver?.name ?? <span style={{ color: '#ccc' }}>—</span>}</td>
                    <td>
                      {active
                        ? <span className="incident-id">Incident #{active.incidentId}</span>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    <td><strong>{loc?.speed ?? 0}</strong> km/h</td>
                    <td style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
                      {loc
                        ? `${parseFloat(loc.lat).toFixed(5)}, ${parseFloat(loc.lng).toFixed(5)}`
                        : <span style={{ color: '#ccc', fontStyle: 'italic' }}>at station</span>}
                    </td>
                    <td style={{ fontSize: 12, color: '#888' }}>{new Date(v.updatedAt).toLocaleTimeString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* stations table */}
      {stations.length > 0 && (
        <div className="card">
          <h2 className="card-title">Stations ({stations.length})</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Type</th><th>Vehicles</th><th>Deployed</th><th>Available</th><th>Coordinates</th></tr>
              </thead>
              <tbody>
                {stations.map(s => {
                  const sv = vehicles.filter(v => v.stationId === s.id);
                  const deployed = sv.filter(v => activeByVehicleId.has(v.id)).length;
                  const available = sv.filter(v => v.status === 'available').length;
                  const pos = stationLatLng(s);
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td style={{ textTransform: 'capitalize' }}>{s.type}</td>
                      <td>{sv.length}</td>
                      <td>{deployed > 0 ? <span style={{ color: '#e74c3c', fontWeight: 700 }}>{deployed}</span> : <span style={{ color: '#aaa' }}>0</span>}</td>
                      <td>{available > 0 ? <span style={{ color: '#1D9E75', fontWeight: 700 }}>{available}</span> : <span style={{ color: '#aaa' }}>0</span>}</td>
                      <td style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
                        {pos ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
