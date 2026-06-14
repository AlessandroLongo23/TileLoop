import { Outlet } from 'react-router-dom';
import AudioPlayer from './AudioPlayer';

/** Root layout: background music + the active route. */
export default function Layout() {
  return (
    <main className="h-screen w-full overflow-hidden">
      <AudioPlayer />
      <Outlet />
    </main>
  );
}
