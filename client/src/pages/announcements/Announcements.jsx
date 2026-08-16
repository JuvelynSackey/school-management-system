import { useAuth } from '../../context/AuthContext';
import AnnouncementComposer from './AnnouncementComposer';
import NoticeBoard from './NoticeBoard';

export default function Announcements() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AnnouncementComposer /> : <NoticeBoard />;
}
