import './ProfileShell.css';

interface ProfileShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ProfileShell({ title, subtitle, children }: ProfileShellProps) {
  return (
    <div className="page profile-hub">
      <div className="container">
        <main className="profile-main card">
          <header className="profile-main__header">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
