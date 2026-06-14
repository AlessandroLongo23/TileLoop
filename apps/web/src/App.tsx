import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Splash from './routes/Splash';
import Menu from './routes/Menu';
import Campaign from './routes/Campaign';
import Play from './routes/Play';
import LevelEditor from './routes/LevelEditor';
import TileEditor from './routes/TileEditor';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Splash /> },
      { path: '/menu', element: <Menu /> },
      { path: '/campaign', element: <Campaign /> },
      { path: '/play', element: <Play /> },
      { path: '/editor/level', element: <LevelEditor /> },
      { path: '/editor/tile', element: <TileEditor /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
