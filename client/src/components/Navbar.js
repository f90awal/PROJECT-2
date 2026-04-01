import {
  FiActivity, FiAlertOctagon, FiBarChart2, FiGrid,
  FiHexagon, FiLogOut, FiMap, FiPlusCircle, FiTruck,
} from 'react-icons/fi';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleLabel = {
  system_admin:    'System Admin',
  hospital_admin:  'Hospital Admin',
  police_admin:    'Police Admin',
  fire_admin:      'Fire Admin',
  ambulance_driver:'Ambulance Driver',
};

const navItems = [
  { to: '/',             label: 'Dashboard',     icon: FiGrid,         end: true },
  { to: '/incidents',    label: 'Incidents',      icon: FiAlertOctagon  },
  { to: '/incidents/new',label: 'New Incident',   icon: FiPlusCircle    },
  { to: '/hospitals',    label: 'Hospitals',      icon: FiActivity      },
  { to: '/dispatch',     label: 'Dispatch',       icon: FiTruck         },
  { to: '/tracking',     label: 'Live Tracking',  icon: FiMap           },
  { to: '/analytics',    label: 'Analytics',      icon: FiBarChart2     },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand">
        <div className="brand-icon">
          <FiHexagon size={18} color="#fff" />
        </div>
        <div className="brand-text">
          <span className="brand-name">AXIOM</span>
          <span className="brand-sub">Crisis Command</span>
        </div>
      </a>

      <div className="sidebar-section-label">Navigation</div>

      <div className="navbar-links">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </div>

      <div className="navbar-user">
        <div className="navbar-user-info">
          <span className="navbar-user-name">{user?.name ?? 'Operator'}</span>
          <span className="navbar-user-role">{roleLabel[user?.role] ?? user?.role}</span>
        </div>
        <button className="btn-logout" type="button" onClick={handleLogout}>
          <FiLogOut size={13} />
          Sign Out
        </button>
      </div>
    </nav>
  );
}
