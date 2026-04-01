import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { incidentAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';

const roleIncidentCodes = {
  hospital_admin: ['MEDICAL', 'ACCIDENT', 'INJURY'],
  police_admin:   ['SECURITY', 'ROBBERY', 'ASSAULT', 'THEFT'],
  fire_admin:     ['FIRE', 'FLOOD', 'EXPLOSION'],
  system_admin:   null,
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

export default function Incidents() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const allowedCodes = roleIncidentCodes[user?.role];

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'open' ? '/open' : '';
      const res = await incidentAPI.get(url);
      let data = res.data?.items ?? [];
      if (allowedCodes) data = data.filter(i => matchesRole(i, allowedCodes));
      setIncidents(data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, allowedCodes]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await incidentAPI.put(`/${id}/status`, { status });
      fetchIncidents();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Incidents &amp; Dispatch Status</h1>
          <p className="page-subtitle">
            {allowedCodes ? `Showing only ${user?.role?.replace('_', ' ')} incidents` : 'All emergency incidents'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={fetchIncidents}><FiRefreshCw size={14} /> Refresh</button>
          <Link to="/incidents/new" className="btn btn-primary"><FiPlus size={14} /> New Incident</Link>
        </div>
      </div>

      <div className="card">
        <div className="filter-tabs">
          <button type="button" className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Incidents</button>
          <button type="button" className={`filter-tab ${filter === 'open' ? 'active' : ''}`} onClick={() => setFilter('open')}>Open Only</button>
        </div>

        {loading ? (
          <div className="loading" style={{ height: 200 }}>Loading incidents...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Caller</th><th>Type</th>
                  <th>Location</th><th>Status</th><th>Operator</th>
                  <th>Reported</th><th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan="8">
                      <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <p>No incidents found</p>
                      </div>
                    </td>
                  </tr>
                ) : incidents.map(inc => (
                  <tr key={inc.id}>
                    <td><span className="incident-id">#{inc.id}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1A252F' }}>{inc.metadata?.callerName ?? '—'}</div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>{inc.metadata?.callerContact ?? ''}</div>
                    </td>
                    <td>{getTypeChip(inc.type?.code)}</td>
                    <td style={{ fontSize: 12, color: '#888' }}>
                      {inc.location?.address ?? (
                        inc.location?.center
                          ? `${inc.location.center[0].toFixed(4)}, ${inc.location.center[1].toFixed(4)}`
                          : '—'
                      )}
                    </td>
                    <td><span className={`badge badge-${inc.status}`}>{formatStatus(inc.status)}</span></td>
                    <td>
                      {inc.operatorId
                        ? <span style={{ fontWeight: 600, color: '#1A252F' }}>{inc.operatorId}</span>
                        : <span style={{ color: '#ccc' }}>Not assigned</span>}
                    </td>
                    <td style={{ fontSize: 12, color: '#888' }}>{new Date(inc.createdAt).toLocaleString()}</td>
                    <td>
                      {inc.status !== 'resolved' && inc.status !== 'cancelled' ? (
                        <select
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e8e8e8', fontSize: 12, background: '#fafafa', cursor: 'pointer' }}
                          value={inc.status}
                          disabled={updating === inc.id}
                          onChange={(e) => updateStatus(inc.id, e.target.value)}
                        >
                          <option value="created">Created</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <span style={{ color: '#bbb', fontSize: 12, fontStyle: 'italic' }}>Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
