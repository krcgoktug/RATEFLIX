import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Watchlist from './pages/Watchlist.jsx';
import Watched from './pages/Watched.jsx';
import Favorites from './pages/Favorites.jsx';
import Explore from './pages/Explore.jsx';
import AddTitle from './pages/AddTitle.jsx';
import TitleDetail from './pages/TitleDetail.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';

function RequireAuth({ children }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function HomeRedirect() {
  const { token } = useAuth();
  return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/watchlist"
        element={
          <RequireAuth>
            <Watchlist />
          </RequireAuth>
        }
      />
      <Route
        path="/watched"
        element={
          <RequireAuth>
            <Watched />
          </RequireAuth>
        }
      />
      <Route
        path="/favorites"
        element={
          <RequireAuth>
            <Favorites />
          </RequireAuth>
        }
      />
      <Route
        path="/explore"
        element={
          <RequireAuth>
            <Explore />
          </RequireAuth>
        }
      />
      <Route
        path="/add"
        element={
          <RequireAuth>
            <AddTitle />
          </RequireAuth>
        }
      />
      <Route
        path="/title/:id"
        element={
          <RequireAuth>
            <TitleDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}