import { useState, useEffect } from "react";
import { Users, Plus, Edit, Shield, GraduationCap, BookOpen, Heart, Eye, EyeOff } from "lucide-react";
import { fetchUsers, createUser, updateUser } from "../../utils/api";
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

  const USER_TABS = [
    { id: 'admin', label: 'Administration', icon: <Shield size={15} />, roles: ['ADMIN', 'ACCOUNTANT', 'SECRETARY'] },
    { id: 'teachers', label: 'Enseignants', icon: <GraduationCap size={15} />, roles: ['TEACHER'] },
    { id: 'students', label: '\u00c9tudiants', icon: <BookOpen size={15} />, roles: ['STUDENT'] },
    { id: 'parents', label: 'Parents', icon: <Heart size={15} />, roles: ['PARENT'] },
  ];

  const loadUsers = () => {
    setLoading(true);
    fetchUsers()
      .then(data => setUsers(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => { localStorage.setItem('adminUserTab', userTab); }, [userTab]);

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
      setMessage('Laissez le mot de passe vide pour le conserver.');
      setShowPassword(false);
    } else {
      const tempPwd = generateTempPassword();
      setEditingUserId(null);
      setUserForm({ prenom: '', nom: '', email: '', password: tempPwd, role: 'TEACHER', telephone: '', ville: '', hourlyRate: '' });
      setMessage('Mot de passe provisoire : ' + tempPwd);
      setShowPassword(true);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUserId(null);
    setMessage(null);
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
        });
        setUsers(users.map((user) => (user.id === updated.id ? updated : user)));
        setMessage('Compte utilisateur mis à jour.');
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
        });
        setUsers([created, ...users]);
        setMessage('Compte utilisateur créé avec succès.');
      }
      closeModal();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'Erreur lors de l\'enregistrement du compte.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.08)] border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-black text-gray-900 text-lg">Gestion des utilisateurs</h2>
            <p className="text-gray-500 text-sm mt-1">Cliquez sur l\u2019icône au bout de la ligne pour modifier un compte.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-primary-50 text-primary-700 px-3 py-1 text-xs font-semibold">{users.length} comptes</span>
            <button type="button" onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-full bg-[#c97e00] text-white text-sm font-semibold px-4 py-2 hover:bg-[#6b4500] focus:outline-none">
              <Plus size={14} /> Ajouter
            </button>
          </div>
        </div>
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

      <div className="bg-white rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.08)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-3">
            <thead className="bg-gray-50">
              <tr>
                {['Nom', 'Email', 'Rôle', 'Taux horaire', 'Ville', 'Téléphone', 'Actions'].map(header => (
                  <th key={header} className="px-4 py-4 text-left text-gray-500 text-xs font-semibold uppercase tracking-wide">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm">Chargement...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm">Aucun utilisateur dans cette catégorie</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border border-gray-100 rounded bg-white shadow-sm hover:shadow-md transition-all duration-200">
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">{user.name || user.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.role}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.role === 'TEACHER' ? (user.hourlyRate ? `${user.hourlyRate.toLocaleString('fr-FR')} FCFA/h` : 'Défaut 5000') : '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.ville || '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.telephone || '—'}</td>
                    <td className="px-4 py-4 text-right">
                      <button type="button" onClick={() => openModal(user)} className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors">
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 modal-overlay">
          <div className="w-full max-w-xl bg-white rounded shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900">{editingUserId ? 'Modifier l\u2019utilisateur' : 'Ajouter un utilisateur'}</h3>
                <p className="text-gray-500 text-sm mt-1">Formulaire compact et rapide.</p>
              </div>
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-700 focus:outline-none">Annuler</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
              <div className="space-y-4 px-6 py-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-600">Prénom</label>
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
                <label className="block text-xs font-semibold text-gray-600">Rôle</label>
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none">
                  <option value="ADMIN">Administrateur</option>
                  <option value="ACCOUNTANT">Comptable</option>
                  <option value="SECRETARY">Secrétaire</option>
                  <option value="TEACHER">Enseignant</option>
                  <option value="STUDENT">Étudiant</option>
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
                <label className="block text-xs font-semibold text-gray-600">Téléphone</label>
                <input value={userForm.telephone} onChange={e => setUserForm({ ...userForm, telephone: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
              </div>
              {message && <p className="text-sm text-gray-600">{message}</p>}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 bg-white">Annuler</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded bg-[#c97e00] text-white text-sm font-semibold hover:bg-[#6b4500] disabled:opacity-70">
                  {submitting ? '...' : editingUserId ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
