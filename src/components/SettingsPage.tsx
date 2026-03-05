import { Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function SettingsPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Account</h2>

        <div className="settings-field">
          <label>
            <User size={16} />
            Name
          </label>
          <span className="settings-value">{user.name}</span>
        </div>

        <div className="settings-field">
          <label>
            <Mail size={16} />
            Email
          </label>
          <span className="settings-value">{user.email}</span>
        </div>
      </section>
    </div>
  );
}
