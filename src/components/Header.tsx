import { useStore } from '../store/useStore';
import './Header.css';

export function Header() {
  const { event, setEventName } = useStore();

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="logo">SeatOptima</h1>
        <div className="event-info">
          <input
            type="text"
            value={event.name}
            onChange={(e) => setEventName(e.target.value)}
            className="event-name-input"
          />
        </div>
      </div>
    </header>
  );
}
