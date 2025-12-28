export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-ring" aria-hidden="true"></span>
      <span className="loader-text">{label}</span>
    </div>
  );
}
