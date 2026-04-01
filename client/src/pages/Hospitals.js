import { useCallback, useEffect, useState } from 'react';
import { dispatchAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FiCheckCircle, FiEdit2, FiRefreshCw } from 'react-icons/fi';

export default function Hospitals() {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [capacityEdit, setCapacityEdit] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchHospitals = useCallback(async () => {
    setLoading(true);
    try {
      // GET /api/dispatch/hospitals — lists hospitals tracked by the dispatch service
      const res = await dispatchAPI.get('/hospitals');
      setHospitals(res.data ?? []);
    } catch (err) {
      if (err.response?.status === 404) {
        setHospitals([]);
      } else {
        setError(err.response?.data?.detail || err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHospitals(); }, [fetchHospitals]);

  const handleCapacityUpdate = async (hospitalId) => {
    setError('');
    try {
      const { available_beds, total_beds } = capacityEdit[hospitalId] ?? {};
      await dispatchAPI.put(`/hospital/${hospitalId}/capacity`, {
        availableBeds: parseInt(available_beds, 10),
        totalBeds: parseInt(total_beds, 10),
      });
      setSuccess(`Capacity updated for hospital ${hospitalId}`);
      setEditingId(null);
      fetchHospitals();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update capacity');
    }
  };

  const startEdit = (hospital) => {
    setEditingId(hospital.id);
    setCapacityEdit(prev => ({
      ...prev,
      [hospital.id]: {
        available_beds: hospital.availableBeds ?? hospital.available_beds,
        total_beds: hospital.totalBeds ?? hospital.total_beds,
      },
    }));
  };

  const occupancyRate = (h) => {
    const total = h.totalBeds ?? h.total_beds ?? 0;
    const avail = h.availableBeds ?? h.available_beds ?? 0;
    if (!total) return 0;
    return (((total - avail) / total) * 100).toFixed(0);
  };

  const occupancyColor = (rate) => {
    if (rate >= 90) return '#e74c3c';
    if (rate >= 70) return '#d35400';
    return '#1D9E75';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hospital Management</h1>
          <p className="page-subtitle">Manage hospital bed capacity and availability</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchHospitals}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {success && <div className="alert alert-success"><FiCheckCircle size={16} />{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h2 className="card-title">Registered Hospitals</h2>
        {loading ? (
          <div className="loading" style={{ height: 200 }}>Loading hospitals...</div>
        ) : hospitals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏥</div>
            <p>No hospitals registered yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Total Beds</th>
                  <th>Available Beds</th>
                  <th>Occupancy</th>
                  {(user?.role === 'system_admin' || user?.role === 'hospital_admin') && (
                    <th>Update Capacity</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {hospitals.map(h => {
                  const rate = occupancyRate(h);
                  const color = occupancyColor(rate);
                  const isEditing = editingId === h.id;
                  const totalBeds = h.totalBeds ?? h.total_beds ?? 0;
                  const availBeds = h.availableBeds ?? h.available_beds ?? 0;

                  return (
                    <tr key={h.id}>
                      <td><span className="incident-id">{h.id}</span></td>
                      <td style={{ fontWeight: 600 }}>{h.name}</td>
                      <td style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
                        {h.lat != null
                          ? `${parseFloat(h.lat).toFixed(4)}, ${parseFloat(h.lng).toFixed(4)}`
                          : '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{totalBeds}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: availBeds === 0 ? '#e74c3c' : '#1D9E75' }}>
                          {availBeds}
                        </span>
                        {availBeds === 0 && (
                          <span style={{ marginLeft: 6, fontSize: 11, background: '#fdecea', color: '#e74c3c', padding: '2px 6px', borderRadius: 4 }}>FULL</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
                            <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color }}>{rate}%</span>
                        </div>
                      </td>
                      {(user?.role === 'system_admin' || user?.role === 'hospital_admin') && (
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input
                                type="number"
                                style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #1D9E75', fontSize: 13 }}
                                value={capacityEdit[h.id]?.available_beds ?? ''}
                                onChange={e => setCapacityEdit(prev => ({
                                  ...prev,
                                  [h.id]: { ...prev[h.id], available_beds: e.target.value },
                                }))}
                                placeholder="Avail"
                              />
                              <input
                                type="number"
                                style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #e0e0e0', fontSize: 13 }}
                                value={capacityEdit[h.id]?.total_beds ?? ''}
                                onChange={e => setCapacityEdit(prev => ({
                                  ...prev,
                                  [h.id]: { ...prev[h.id], total_beds: e.target.value },
                                }))}
                                placeholder="Total"
                              />
                              <button type="button" className="btn btn-primary btn-icon" style={{ padding: '5px 10px', fontSize: 12 }}
                                onClick={() => handleCapacityUpdate(h.id)}>Save</button>
                              <button type="button" className="btn btn-secondary btn-icon" style={{ padding: '5px 10px', fontSize: 12 }}
                                onClick={() => setEditingId(null)}>✕</button>
                            </div>
                          ) : (
                            <button type="button" className="btn btn-secondary btn-icon" style={{ padding: '6px 12px', fontSize: 12 }}
                              onClick={() => startEdit(h)}>
                              <FiEdit2 size={12} /> Update
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
