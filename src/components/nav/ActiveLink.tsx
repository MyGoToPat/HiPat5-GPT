import { NavLink } from 'react-router-dom';

export default function ActiveLink({
  to, children, hidden,
}: { to: string; children: React.ReactNode; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        padding: '6px 10px',
        borderRadius: 8,
        textDecoration: 'none',
        fontSize: 14,
        border: isActive ? '1px solid #94a3b8' : '1px solid transparent',
      })}
    >
      {children}
    </NavLink>
  );
}