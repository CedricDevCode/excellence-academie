import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Edit, Trash2, Shield, GraduationCap, BookOpen, Heart,
  Eye, EyeOff, CheckCircle, XCircle, Loader2, Clock, Wifi, WifiOff
} from "lucide-react";
import {
  fetchUsers, createUser, updateUser, deleteUser, fetchStudents, fetchOnlineUsers, sendHeartbeat
} from "../../utils/api";
import { useToast } from "../Toast";
import { generateTempPassword } from "./helpers";

export default function UsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userTab, setUserTab] = useState(() => localStorage.getItem('adminUserTab') || 'admin');
  const [userForm, setUserForm] = useState({ prenom: '', nom: '', email: '', password: '', role: 'TEACHER', telephone: '', ville: '', hourlyRate: '' });
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast, confirm } = useToast();

  const USER_TABS = [
    { id: 'admin', label: 'Administration', icon: <Shield size={15} />, roles: ['ADMIN', 'ACCOUNTANT', 'SECRETARY'] },
    { id: 'teachers', label: 'Enseignants', icon: <GraduationCap size={15} />, roles: ['TEACHER'] },
    { id: 'students', label: 'Etudiants', icon: <BookOpen size={15} />, roles: ['STUDENT'] },
    { id: 'parents', label: 'Parents', icon: <Heart size={15} />, roles: ['PARENT'] },
  ];

  const loadUsers = () => {
    setLoading(true);
    fetchUsers()
      .then(data => setUsers(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const loadOnline = useCallback(() => {
    fetchOnlineUsers().then(ids => setOnlineIds(new Set(ids))).catch(() => {});
  }, []);

  useEffect(() => {
    loadUsers();
    loadOnline();
    // Heartbeat every 30s + refresh online list
    const hb = setInterval(() => { sendHeartbeat(); loadOnline(); }, 30000);
    return () => clearInterval(hb);
  }, [loadOnline]);

  useEffect(() => { localStorage.setItem('adminUserTab', userTab); }, [userTab]);

  // Load students when opening modal with PARENT role
  useEffect(() => {
    if (showModal && userForm.role === 'PARENT') {
      fetchStudents().then(setAllStudents).catch(() => {});
    }
  }, [showModal, userForm.role]);

  const activeTab = USER_TABS.find(t => t.id === userTab) || USER_TABS[0];
  const filteredUsers = users.filter(u => activeTab.roles.includes(u.role));

  const openModal = (user?: any) => {
    if (user) {
      const [firstName, ...rest] = (user.name || '').split(' ');
      setEditingUserId(user.id);
      setUserForm({
        prenom: firstName || '',
        nom: rest.join(' ') || '',
        email: user.email || '',
        password: '',
        role: user.role || 'TEACHER',
        telephone: user.telephone || '',
        ville: user.ville || '',
        hourlyRate: user.hourlyRate ? String(user.hourlyRate) : '',
      });
      // Load current student links for parent
      if (user.role === 'PARENT' && user.parentLinks) {
        setSelectedStudentIds(user.parentLinks.map((l: any) => l.student?.id).filter(Boolean));
        fetchStudents().then(setAllStudents).catch(() => {});
      } else {
        setSelectedStudentIds([]);
      }
      setMessage('Laissez le mot de passe vide pour le conserver.');
      setShowPassword(false);
    } else {
      const tempPwd = generateTempPassword();
      setEditingUserId(null);
      setUserForm({ prenom: '', nom: '', email: '', password: tempPwd, role: 'TEACHER', telephone: '', ville: '', hourlyRate: '' });
      setSelectedStudentIds([]);
      setMessage('Mot de passe provisoire : ' + tempPwd);
      setShowPassword(true);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUserId(null);
    setMessage(null);
    setSelectedStudentIds([]);
    setStudentSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (editingUserId) {
        const updated = await updateUser(editingUserId, {
          prenom: userForm.prenom,
          nom: userForm.nom,
          email: userForm.email,
          password: userForm.password || undefined,
          role: userForm.role,
          telephone: userForm.telephone,
          ville: userForm.ville,
          hourlyRate: userForm.hourlyRate ? Number(userForm.hourlyRate) : undefined,
          studentIds: userForm.role === 'PARENT' ? selectedStudentIds : undefined,
        });
        setUsers(users.map((user) => (user.id === updated.id ? updated : user)));
        toast('success', 'Utilisateur mis a jour');
      } else {
        const created = await createUser({
          prenom: userForm.prenom,
          nom: userForm.nom,
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
          telephone: userForm.telephone,
          ville: userForm.ville,
          hourlyRate: userForm.hourlyRate ? Number(userForm.hourlyRate) : undefined,
          studentIds: userForm.role === 'PARENT' ? selectedStudentIds : undefined,
        });
        setUsers([created, ...users]);
        toast('success', 'Utilisateur cree');
      }
      closeModal();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: any) => {
    const newStatus = !(user.isActive !== false);
    try {
      const updated = await updateUser(user.id, { isActive: newStatus });
      setUsers(users.map(u => u.id === updated.id ? { ...u, ...updated } : u));
      toast('success', newStatus ? 'Compte active' : 'Compte desactive');
    } catch {
      toast('error', 'Erreur lors du changement de statut');
    }
  };

  const handleDelete = async (user: any) => {
    const ok = await confirm(`Supprimer le compte de ${user.name || user.email} ? Cette action est irreversible.`);
    if (!ok) return;
    setDeletingId(user.id);
    try {
      await deleteUser(user.id);
      setUsers(users.filter(u => u.id !== user.id));
      toast('success', 'Compte supprime');
    } catch (err: any) {
      toast('error', err?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const formatLastLogin = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Jamais connecte';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'A l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffJ = Math.floor(diffH / 24);
    if (diffJ < 7) return `Il y a ${diffJ}j`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const toggleStudent = (sid: string) => {
    setSelectedStudentIds(prev => prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.08)] border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-black text-gray-900 text-lg">Gestion des utilisateurs</h2>
            <p className="text-gray-500 text-sm mt-1">Statut en temps reel, activation/desactivation, suppression.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-primary-50 text-primary-700 px-3 py-1 text-xs font-semibold">{users.length} comptes</span>
            <button type="button" onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-full bg-[#c97e00] text-white text-sm font-semibold px-4 py-2 hover:bg-[#6b4500] focus:outline-none">
              <Plus size={14} /> Ajouter
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mt-4">
          {USER_TABS.map(tab => (
            <button key={tab.id} onClick={() => setUserTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-all ${userTab === tab.id
                ? 'bg-[#c97e00] text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
              {tab.icon} {tab.label}
              <span className={`ml-1 text-xs ${userTab === tab.id ? 'text-primary-200' : 'text-gray-400'}`}>
                ({users.filter(u => tab.roles.includes(u.role)).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.08)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-y-3">
            <thead className="bg-gray-50">
              <tr>
                {['Nom', 'Email', 'Role', 'Statut', 'Derniere connexion', 'Ville', 'Actions'].map(header => (
                  <th key={header} className="px-4 py-4 text-left text-gray-500 text-xs font-semibold uppercase tracking-wide">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm"><Loader2 size={20} className="animate-spin mx-auto" /></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm">Aucun utilisateur dans cette categorie</td></tr>
              ) : (
                filteredUsers.map((user) => {
                  const isOnline = onlineIds.has(user.id);
                  const isActive = user.isActive !== false;
                  return (
                    <tr key={user.id} className="border border-gray-100 rounded bg-white shadow-sm hover:shadow-md transition-all duration-200">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-full bg-[#c97e00] flex items-center justify-center text-white text-xs font-bold">
                              {user.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            {/* Online indicator */}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} title={isOnline ? 'En ligne' : 'Hors ligne'} />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-gray-900 block">{user.name || user.email}</span>
                            {user.role === 'PARENT' && user.parentLinks?.length > 0 && (
                              <span className="text-[10px] text-gray-400">
                                Parent de: {user.parentLinks.map((l: any) => l.student?.name).filter(Boolean).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' :
                          user.role === 'STUDENT' ? 'bg-green-100 text-green-700' :
                          user.role === 'PARENT' ? 'bg-pink-100 text-pink-700' :
                          user.role === 'ACCOUNTANT' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role === 'ADMIN' ? 'Admin' : user.role === 'TEACHER' ? 'Enseignant' : user.role === 'STUDENT' ? 'Etudiant' : user.role === 'PARENT' ? 'Parent' : user.role === 'ACCOUNTANT' ? 'Comptable' : user.role === 'SECRETARY' ? 'Secretaire' : user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                              <Wifi size={12} /> En ligne
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                              <WifiOff size={12} /> Hors ligne
                            </span>
                          )}
                          {!isActive && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                              <XCircle size={10} /> Desactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock size={12} />
                          <span>{formatLastLogin(user.lastLoginAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{user.ville || '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" onClick={() => openModal(user)}
                            className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors" title="Modifier">
                            <Edit size={15} />
                          </button>
                          <button type="button" onClick={() => handleToggleActive(user)}
                            className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-green-50 text-green-600'}`}
                            title={isActive ? 'Desactiver' : 'Activer'}>
                            {isActive ? <XCircle size={15} /> : <CheckCircle size={15} />}
                          </button>
                          <button type="button" onClick={() => handleDelete(user)} disabled={deletingId === user.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Supprimer">
                            {deletingId === user.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-xl bg-white rounded shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900">{editingUserId ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</h3>
                <p className="text-gray-500 text-sm mt-1">Formulaire compact et rapide.</p>
              </div>
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-700 focus:outline-none">Annuler</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
              <div className="space-y-4 px-6 py-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-gray-600">Prenom</label>
                  <input value={userForm.prenom} onChange={e => setUserForm({ ...userForm, prenom: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-gray-600">Nom</label>
                  <input value={userForm.nom} onChange={e => setUserForm({ ...userForm, nom: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-gray-600">Email</label>
                  <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-gray-600">Mot de passe</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full px-3 py-2 pr-10 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-gray-600">Role</label>
                  <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none">
                    <option value="ADMIN">Administrateur</option>
                    <option value="ACCOUNTANT">Comptable</option>
                    <option value="SECRETARY">Secretaire</option>
                    <option value="TEACHER">Enseignant</option>
                    <option value="STUDENT">Etudiant</option>
                    <option value="PARENT">Parent</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-gray-600">Ville / Centre</label>
                  <input value={userForm.ville} onChange={e => setUserForm({ ...userForm, ville: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
                </div>
                {userForm.role === 'TEACHER' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-xs font-semibold text-gray-600">Taux horaire (FCFA/h)</label>
                    <input type="number" min="0" value={userForm.hourlyRate} onChange={e => setUserForm({ ...userForm, hourlyRate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" placeholder="5000" />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-gray-600">Telephone</label>
                  <input value={userForm.telephone} onChange={e => setUserForm({ ...userForm, telephone: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
                </div>

                {/* Parent-Student linking */}
                {userForm.role === 'PARENT' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Etudiant(s) dont il est le parent</label>
                    {allStudents.length === 0 ? (
                      <p className="text-xs text-gray-400">Chargement des etudiants...</p>
                    ) : (
                      <>
                        <div className="relative mb-2">
                          <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                            placeholder="Rechercher par nom, email, matricule..."
                            className="w-full px-3 py-2 pl-8 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
                          <Users size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          {studentSearch && (
                            <button type="button" onClick={() => setStudentSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded p-2 space-y-1">
                          {allStudents.filter(s => {
                            if (!studentSearch) return true;
                            const q = studentSearch.toLowerCase();
                            return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.matricule || '').toLowerCase().includes(q);
                          }).map(s => (
                            <label key={s.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${selectedStudentIds.includes(s.id) ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'}`}>
                              <input type="checkbox" checked={selectedStudentIds.includes(s.id)} onChange={() => toggleStudent(s.id)}
                                className="w-4 h-4 rounded accent-[#c97e00]" />
                              <span className="font-medium">{s.name || s.email}</span>
                              {s.matricule && <span className="text-[10px] text-gray-400 font-mono">({s.matricule})</span>}
                            </label>
                          ))}
                          {allStudents.filter(s => {
                            if (!studentSearch) return true;
                            const q = studentSearch.toLowerCase();
                            return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.matricule || '').toLowerCase().includes(q);
                          }).length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-3">Aucun etudiant trouve</p>
                          )}
                        </div>
                      </>
                    )}
                    {selectedStudentIds.length > 0 && (
                      <p className="text-xs text-primary-600 mt-1 font-semibold">{selectedStudentIds.length} etudiant(s) selectionne(s)</p>
                    )}
                  </div>
                )}

                {message && <p className="text-sm text-gray-600">{message}</p>}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 bg-white">Annuler</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded bg-[#c97e00] text-white text-sm font-semibold hover:bg-[#6b4500] disabled:opacity-70 flex items-center gap-2">
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? '...' : editingUserId ? 'Mettre a jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
