import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return <>
    <header className="site-header">
      <Link className="brand" to="/" aria-label="SongCollector home"><span className="brand-mark">SC</span><span>SongCollector</span></Link>
      <nav aria-label="Main navigation"><Link to="/discover">Discover</Link><Link to="/admin">Coach admin</Link></nav>
    </header>
    <main><Outlet /></main>
    <footer><span>SongCollector</span><span>No audio is downloaded, stored, or redistributed.</span></footer>
  </>;
}
