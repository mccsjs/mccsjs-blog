import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import PostEditor from './pages/PostEditor';
import Categories from './pages/Categories';
import Tags from './pages/Tags';
import Comments from './pages/Comments';
import Menus from './pages/Menus';
import Settings from './pages/Settings';
import Friends from './pages/Friends';
import VisitorLogs from './pages/VisitorLogs';
import Visitors from './pages/Visitors';
import Scratchpad from './pages/Scratchpad';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/new" element={<PostEditor />} />
          <Route path="posts/:slug/edit" element={<PostEditor />} />
          <Route path="categories" element={<Categories />} />
          <Route path="tags" element={<Tags />} />
          <Route path="comments" element={<Comments />} />
          <Route path="menus" element={<Menus />} />
          <Route path="friends" element={<Friends />} />
          <Route path="visitor-logs" element={<VisitorLogs />} />
          <Route path="guests" element={<Visitors />} />
          <Route path="scratchpad" element={<Scratchpad />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
