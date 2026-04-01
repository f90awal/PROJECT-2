import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dispatchAPI, incidentAPI } from '../api/axios';
import { FiActivity, FiCheckCircle, FiClock, FiPlus, FiTruck } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

// Role → incident type code prefixes and vehicle type
const roleFilters = {
  hospital_admin: { incidentCodes: ['MEDICAL', 'ACCIDENT', 'INJURY'], vehicleType: 'ambulance',  label: 'Medical' },
  police_admin:   { incidentCodes: ['SECURITY', 'ROBBERY', 'ASSAULT', 'THEFT'], vehicleType: 'police_car', label: 'Police' },
  fire_admin:     { incidentCodes: ['FIRE', 'FLOOD', 'EXPLOSION'],              vehicleType: 'fire_truck', label: 'Fire' },
  system_admin:   { incidentCodes: null, vehicleType: null, label: 'All' },
};

function matchesRole(inc, codes) {
  if (!codes) return true;
  const code = (inc.type?.code ?? '').toUpperCase();
  const cat  = (inc.type?.category ?? '').toUpperCase();
  return codes.some(c => code.includes(c) || cat.includes(c));
}

function formatStatus(status) {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getTypeChip(code) {
  const c = (code ?? '').toUpperCase();
  if (['FIRE', 'FLOOD', 'EXPLOSION'].some(k => c.includes(k)))
    return <span className="type-chip fire">🔥 {code}</span>;
  if (['MEDICAL', 'ACCIDENT', 'INJURY'].some(k => c.includes(k)))
    return <span className="type-chip ambulance">🏥 {code}</span>;
  return <span className="type-chip police">🚔 {code}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({ total: 0, dispatched: 0, resolved: 0, pending: 0 });
  const [vehicles, setVehicles] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const filter = roleFilters[user?.role] ?? roleFilters.system_admin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesRes, incidentsRes] = await Promise.all([
          dispatchAPI.get('/vehicles'),
          incidentAPI.get(''),
        ]);

        const allVehicles = vehiclesRes.data;
        let incidents = incidentsRes.data?.items ?? [];

        // Filter vehicles by role
        const filteredVehicles = filter.vehicleType
          ? allVehicles.filter(v => v.type === filter.vehicleType)
          : allVehicles;

        // Filter incidents by role
        if (filter.incidentCodes) {
          incidents = incidents.filter(i => matchesRole(i, filter.incidentCodes));
        }

        const total      = incidents.length;
        const resolved   = incidents.filter(i => i.status === 'resolved').length;
        const dispatched = incidents.filter(i => i.status === 'dispatched').length;
        const pending    = incidents.filter(i => i.status !== 'resolved').length;

        setSummary({ total, dispatched, resolved, pending });
        setVehicles(filteredVehicles);
        setRecentIncidents(incidents.slice(0, 6));
      } catch (err) {
        console.error('Dashboard error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const availableVehicles = vehicles.filter(v => v.status === 'available').length;

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {filter.label === 'All' ? 'Operations Dashboard' : `${filter.label} Operations`}
          </h1>
          <p className="page-subtitle">
            {filter.label === 'All'
              ? 'Real-time overview of all emergency operations'
              : `Showing ${filter.label.toLowerCase()} service data for your role`}
          </p>
        </div>
        <Link to="/incidents/new" className="btn btn-primary">
          <FiPlus size={16} /> Record Incident
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FiActivity size={20} /></div>
          <span className="stat-label">Total Incidents</span>
          <span className="stat-value">{summary.total}</span>
          <span className="stat-trend">All time</span>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon"><FiClock size={20} /></div>
          <span className="stat-label">Active / Pending</span>
          <span className="stat-value">{summary.pending}</span>
          <span className="stat-trend">Requires attention</span>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><FiTruck size={20} /></div>
          <span className="stat-label">Dispatched</span>
          <span className="stat-value">{summary.dispatched}</span>
          <span className="stat-trend">Units en route</span>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><FiCheckCircle size={20} /></div>
          <span className="stat-label">Resolved</span>
          <span className="stat-value">{summary.resolved}</span>
          <span className="stat-trend">Successfully closed</span>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><FiTruck size={20} /></div>
          <span className="stat-label">
            {filter.label === 'All' ? 'Available Vehicles' : `${filter.label} Vehicles Available`}
          </span>
          <span className="stat-value">{availableVehicles}</span>
          <span className="stat-trend">Ready to dispatch</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            {filter.label === 'All' ? 'Recent Incidents' : `Recent ${filter.label} Incidents`}
          </h2>
          <Link to="/incidents" className="btn btn-secondary btn-icon">View All →</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Caller</th><th>Type</th>
                <th>Status</th><th>Operator</th><th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {recentIncidents.length === 0 ? (
                <tr><td colSpan="6" className="table-empty">No incidents recorded yet</td></tr>
              ) : recentIncidents.map(inc => (
                <tr key={inc.id}>
                  <td><span className="incident-id">#{inc.id}</span></td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1A252F' }}>{inc.metadata?.callerName ?? '—'}</div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>{inc.metadata?.callerContact ?? ''}</div>
                  </td>
                  <td>{getTypeChip(inc.type?.code)}</td>
                  <td><span className={`badge badge-${inc.status}`}>{formatStatus(inc.status)}</span></td>
                  <td>
                    {inc.operatorId
                      ? <span style={{ fontWeight: 600, color: '#1A252F' }}>{inc.operatorId}</span>
                      : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12, color: '#888' }}>{new Date(inc.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">
          {filter.label === 'All' ? 'Fleet Status' : `${filter.label} Fleet`}
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Call Sign</th><th>Type</th><th>Station</th><th>Status</th><th>Last Updated</th></tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr><td colSpan="5" className="table-empty">No vehicles registered</td></tr>
              ) : vehicles.map(v => (
                <tr key={v.id}>
                  <td><span className="incident-id">{v.callSign}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{v.type?.replace('_', ' ')}</td>
                  <td>{v.station?.name ?? v.stationId}</td>
                  <td><span className={`badge badge-${v.status}`}>{formatStatus(v.status)}</span></td>
                  <td style={{ fontSize: 12, color: '#888' }}>{new Date(v.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
