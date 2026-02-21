import './globals.css';

export const metadata = {
  title: 'Abstract Realms',
  description: 'College event custom merchandise store',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div className="nav-container">
            <a href="/" className="nav-logo">🎨 Abstract Realms</a>
            <div className="nav-links">
              <a href="/">Home</a>
              <a href="/order/">Order</a>
              <a href="/admin/">Admin</a>
            </div>
          </div>
        </nav>
        <main className="main-content">
          {children}
        </main>
        <footer className="footer">
          <p>&copy; 2026 Abstract Realms. College Event Merch Store.</p>
        </footer>
      </body>
    </html>
  );
}
