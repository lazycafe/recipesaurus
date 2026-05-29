import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { DinoMascot } from './DinoMascot';

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <DinoMascot size={96} className="not-found-mascot" />
      <p className="not-found-code">404</p>
      <h1>This page does not exist</h1>
      <p className="not-found-message">
        The URL may be mistyped, or the page may have moved.
      </p>
      <Link to="/" className="btn-primary">
        <Home size={18} strokeWidth={2.5} />
        <span>Return Home</span>
      </Link>
    </div>
  );
}
