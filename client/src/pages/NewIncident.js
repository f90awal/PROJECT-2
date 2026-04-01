import { useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { incidentAPI } from '../api/axios';
import { FiAlertTriangle, FiCheckCircle, FiMapPin } from 'react-icons/fi';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) { onLocationSelect(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// Incident types grouped by service, matching the gateway's incident service codes
const incidentTypes = [
  { code: 'FIRE',      category: 'FIRE',     label: '🔥 Fire',              group: 'Fire Service' },
  { code: 'EXPLOSION', category: 'FIRE',     label: '💥 Explosion',          group: 'Fire Service' },
  { code: 'GAS_LEAK',  category: 'FIRE',     label: '⚠️ Gas Leak',           group: 'Fire Service' },
  { code: 'FLOOD',     category: 'FIRE',     label: '🌊 Flood',              group: 'Fire Service' },
  { code: 'MEDICAL',   category: 'MEDICAL',  label: '🏥 Medical Emergency',  group: 'Medical' },
  { code: 'ACCIDENT',  category: 'MEDICAL',  label: '🚗 Accident',           group: 'Medical' },
  { code: 'INJURY',    category: 'MEDICAL',  label: '🩹 Injury',             group: 'Medical' },
  { code: 'ROBBERY',   category: 'SECURITY', label: '🚨 Robbery',            group: 'Police' },
  { code: 'ASSAULT',   category: 'SECURITY', label: '⚡ Assault',            group: 'Police' },
  { code: 'THEFT',     category: 'SECURITY', label: '🔍 Theft',              group: 'Police' },
];

const priorityLevels = [
  { value: 'low',    label: '🟢 Low' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'high',   label: '🔴 High' },
];

export default function NewIncident() {
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState(incidentTypes[0]);
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerContact, setCallerContact] = useState('');
  const [notes, setNotes] = useState('');

  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [markerPos, setMarkerPos] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLocationSelect = (latitude, longitude) => {
    setLat(latitude);
    setLng(longitude);
    setMarkerPos([latitude, longitude]);
    if (!address) setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
  };

  const handleTypeChange = (code) => {
    const found = incidentTypes.find(t => t.code === code);
    if (found) setSelectedType(found);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!markerPos) { setError('Please click on the map to select the incident location.'); return; }
    if (!callerName.trim()) { setError('Caller name is required.'); return; }
    setLoading(true);
    setError('');

    const payload = {
      type: { code: selectedType.code, category: selectedType.category },
      description: description || undefined,
      location: {
        address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        center: [lng, lat],
        radius: 0.1,
      },
      priority: { level: priority },
      metadata: {
        callerName: callerName.trim(),
        callerContact: callerContact.trim() || 'N/A',
        notes: notes || undefined,
      },
    };

    try {
      const res = await incidentAPI.post('', payload);
      setSuccess(`Incident #${res.data.id} recorded successfully. Status: ${res.data.status}.`);
      setTimeout(() => navigate('/incidents'), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to submit incident report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Record New Incident</h1>
          <p className="page-subtitle">Fill in the caller details and pin the location on the map</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error"><FiAlertTriangle size={16} />{error}</div>
      )}
      {success && (
        <div className="alert alert-success"><FiCheckCircle size={16} />{success} Redirecting...</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h2 className="card-title">Caller &amp; Incident Details</h2>
          <form onSubmit={handleSubmit}>

            <div className="form-row">
              <div className="form-group">
                <label>Caller Name *</label>
                <input
                  placeholder="Full name of caller"
                  value={callerName}
                  onChange={e => setCallerName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Caller Contact</label>
                <input
                  placeholder="Phone number"
                  value={callerContact}
                  onChange={e => setCallerContact(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Incident Type *</label>
              <select value={selectedType.code} onChange={e => handleTypeChange(e.target.value)}>
                {['Fire Service', 'Medical', 'Police'].map(group => (
                  <optgroup key={group} label={group}>
                    {incidentTypes.filter(t => t.group === group).map(t => (
                      <option key={t.code} value={t.code}>{t.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}>
                {priorityLevels.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Location Address</label>
              <input
                placeholder="Street address or landmark (auto-filled from map)"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                placeholder="Brief description of the situation"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Additional Notes</label>
              <textarea
                rows={4}
                placeholder="Number of people involved, severity, hazards..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {markerPos ? (
              <div className="coords-display">
                <FiMapPin size={16} />
                Location pinned: {lat.toFixed(6)}, {lng.toFixed(6)}
              </div>
            ) : (
              <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#e65100', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiMapPin size={14} /> Click on the map to pin the incident location
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}
              disabled={loading}
            >
              {loading ? 'Submitting...' : '🚨 Submit Incident Report'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="card-title">📍 Incident Location</h2>
          <p className="map-hint"><FiMapPin size={13} /> Click anywhere on the map to drop a pin</p>
          <div className="map-container">
            <MapContainer center={[5.6037, -0.1870]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <LocationPicker onLocationSelect={handleLocationSelect} />
              {markerPos && <Marker position={markerPos} />}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
