export function Spinner({ message }: { message?: string }) {
  return (
    <div className="spinner-wrap">
      <div>
        <div className="spinner" />
        {message ? <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>{message}</p> : null}
      </div>
    </div>
  );
}

export function LoadingOverlay({ visible, message }: { visible: boolean; message?: string }) {
  if (!visible) return null;
  return (
    <div className="overlay">
      <div className="overlay-box">
        <div className="spinner" style={{ margin: '0 auto' }} />
        {message ? <p style={{ marginTop: 12 }}>{message}</p> : null}
      </div>
    </div>
  );
}
