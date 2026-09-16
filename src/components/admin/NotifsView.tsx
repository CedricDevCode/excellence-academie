import { useState, useEffect } from "react";
import { Bell, Mail, Calendar, CheckCircle } from "lucide-react";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../../utils/api";
import LoadingSpinner from "./LoadingSpinner";

export default function NotifsView() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifs = () => {
    setLoading(true);
    fetchNotifications()
      .then(setNotifs)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadNotifs(); }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    loadNotifs();
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      loadNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner />;

  const unreadCount = notifs.filter((n: any) => !n.isRead).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-black text-gray-900 flex items-center gap-2">
          <Bell size={18} className="text-[#FF6B00]" /> Notifications
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-bold text-[#0056B3] hover:underline flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg"
          >
            <CheckCircle size={14} /> Tout marquer comme lu
          </button>
        )}
      </div>
      <div className="divide-y divide-gray-100">
        {notifs.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">Aucune notification</p>
          </div>
        ) : (
          notifs.map((n: any) => (
            <div key={n.id} className={`p-5 flex items-start gap-4 transition-colors ${n.isRead ? 'bg-white' : 'bg-blue-50/50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? 'bg-gray-100 text-gray-400' : 'bg-[#0056B3] text-white'}`}>
                <Mail size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900 text-sm">{n.title}</span>
                  {!n.isRead && <span className="w-2 h-2 bg-[#0056B3] rounded-full" />}
                </div>
                <p className="text-gray-600 text-sm">{n.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-gray-400 text-xs flex items-center gap-1"><Calendar size={12} /> {new Date(n.createdAt).toLocaleDateString('fr-FR')}</span>
                  {!n.isRead && (
                    <button onClick={() => handleMarkRead(n.id)} className="text-[#0056B3] text-xs font-semibold hover:underline">
                      Marquer comme lu
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
