import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, MessageCircle, PenSquare, Users, Send, Paperclip, X, Search, ChevronLeft, FileText, Image as ImageIcon, Plus, Check,
} from "lucide-react";
import {
  fetchConversations, fetchContactableUsers, createConversation,
  fetchConversationMessages, postConversationMessage, uploadConversationAttachment,
  conversationAttachmentUrl, getMe,
} from "../utils/api";
import SEOHead from "../components/SEOHead";
import Container from "../components/ui/Container";
import { useToast } from "../components/Toast";

export default function Messages() {
  const { toast } = useToast();
  const [me, setMe] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMe = async () => { getMe().then(setMe).catch(() => setMe(null)); };
  const loadConversations = async () => {
    setLoadingConvs(true);
    try {
      const list = await fetchConversations();
      setConversations(list);
      if (!active && list.length > 0) setActive(list[0]);
    } catch { toast('error', 'Impossible de charger les discussions'); }
    finally { setLoadingConvs(false); }
  };
  const loadMessages = async (id: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const list = await fetchConversationMessages(id);
      setMessages(list);
    } catch { if (!silent) toast('error', 'Impossible de charger les messages'); }
    finally { setLoadingMsgs(false); }
  };

  useEffect(() => { loadMe(); loadConversations(); }, []);
  useEffect(() => { if (active) loadMessages(active.id); }, [active?.id]);

  // Rafraîchissement léger toutes les 4 s
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => loadMessages(active.id, true), 4000);
    return () => window.clearInterval(id);
  }, [active?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const openNew = async () => {
    setShowNew(true);
    try { setContacts(await fetchContactableUsers()); } catch {}
  };

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter(c => !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
  }, [contacts, query]);

  const toggle = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const startConversation = async (type: 'DIRECT' | 'PROJECT') => {
    if (type === 'PROJECT' && selectedIds.length === 0) { toast('error', 'Sélectionnez au moins un membre'); return; }
    setCreating(true);
    try {
      const target = type === 'DIRECT' ? selectedIds[0] : undefined;
      const memberIds = type === 'DIRECT' ? [target!] : selectedIds;
      const conv = await createConversation({ type, title: type === 'PROJECT' ? projectTitle.trim() : undefined, memberIds });
      toast('success', type === 'PROJECT' ? 'Projet créé' : 'Discussion ouverte');
      setShowNew(false);
      setProjectTitle("");
      setSelectedIds([]);
      await loadConversations();
      setActive(conv);
    } catch (err: any) {
      toast('error', err?.message || 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const send = async () => {
    const content = text.trim();
    if (!content || !active || sending) return;
    setSending(true);
    try {
      await postConversationMessage(active.id, content);
      setText("");
      await loadMessages(active.id);
    } catch (err: any) {
      toast('error', err?.message || 'Échec de l’envoi');
    } finally { setSending(false); }
  };

  const attach = async (file: File) => {
    if (!active) return;
    setSending(true);
    try {
      await uploadConversationAttachment(active.id, file);
      await loadMessages(active.id);
      toast('success', 'Fichier envoyé');
    } catch (err: any) {
      toast('error', err?.message || 'Échec de l’envoi du fichier');
    } finally { setSending(false); }
  };

  const convTitle = (c: any) => c.title || c.members?.filter((m: any) => m.id !== me?.id).map((m: any) => m.name?.split(' ')[0]).join(', ') || 'Discussion';
  const convSubtitle = (c: any) => c.type === 'PROJECT' ? 'Projet' : c.members?.length > 2 ? `${c.members.length} membres` : '';

  return (
    <div className="min-h-screen bg-surface-50">
      <SEOHead title="Messages" description="Discussions privées et projets entre formateurs, étudiants et administration." url="/messages" />
      <Container className="py-6">
        <div className="grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-7rem)] min-h-[560px]">
          {/* Sidebar */}
          <aside className="bg-white rounded-2xl border border-surface-200 flex flex-col min-h-0">
            <div className="p-4 border-b border-surface-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-primary-600" />
                <h1 className="font-display font-bold text-ink-900">Messages</h1>
              </div>
              <button onClick={openNew} className="p-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors" title="Nouvelle discussion" aria-label="Nouvelle discussion">
                <PenSquare size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {loadingConvs ? (
                <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-primary-600" /></div>
              ) : conversations.length === 0 ? (
                <div className="text-center px-4 py-10">
                  <MessageCircle size={30} className="mx-auto text-surface-300 mb-2" />
                  <p className="text-xs text-surface-500">Aucune discussion.<br/>Démarrez-en une avec l'équipe ou vos camarades.</p>
                </div>
              ) : conversations.map(c => (
                <button key={c.id} onClick={() => setActive(c)}
                  className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${active?.id === c.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-surface-50 border border-transparent'}`}>
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 text-white flex items-center justify-center text-sm font-black shrink-0">
                    {(c.title || c.members?.[0]?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-ink-900 truncate">{convTitle(c)}</p>
                    <p className="text-[10px] text-surface-400 truncate">{c.lastMessage || (c.type === 'PROJECT' ? 'Projet' : 'Nouvelle discussion')}</p>
                  </div>
                  {c.type === 'PROJECT' && <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full shrink-0">Projet</span>}
                </button>
              ))}
            </div>
          </aside>

          {/* Conversation */}
          <section className="bg-white rounded-2xl border border-surface-200 flex flex-col min-h-0">
            {!active ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <MessageCircle size={40} className="text-surface-300 mb-3" />
                <p className="font-display font-bold text-ink-900">Vos conversations</p>
                <p className="text-xs text-surface-500 mt-1 max-w-xs">Partagez fichiers, travaillez sur des projets, échangez en sécurité avec l'équipe et vos camarades.</p>
                <button onClick={openNew} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors">
                  <Plus size={15}/> Nouvelle discussion
                </button>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-surface-100 flex items-center gap-3 shrink-0">
                  <button onClick={() => setActive(null)} className="lg:hidden p-1.5 text-surface-500"><ChevronLeft size={19} /></button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 text-white flex items-center justify-center text-xs font-black shrink-0">
                    {(active.title || active.members?.[0]?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-ink-900 text-sm truncate">{convTitle(active)}</p>
                    <p className="text-[10px] text-surface-400">{convSubtitle(active) || 'Discussion privée'}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-surface-50/50">
                  {loadingMsgs ? (
                    <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-primary-600" /></div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-xs text-surface-400 py-10">Aucun message. Dites bonjour.</p>
                  ) : messages.map((m: any) => {
                    const mine = m.sender?.id === me?.id;
                    const initials = (m.sender?.name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <div key={m.id} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                        {!mine && (
                          <div className="w-8 h-8 rounded-full bg-ink-900 text-gold-400 flex items-center justify-center text-[10px] font-black shrink-0 self-end">{initials}</div>
                        )}
                        <div className={`max-w-[75%] sm:max-w-[65%] rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-primary-600 text-white rounded-br-md' : 'bg-white border border-surface-200 text-ink-900 rounded-bl-md'}`}>
                          {!mine && <p className="text-[9px] font-bold opacity-60 mb-0.5">{m.sender?.name}</p>}
                          {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                          {m.attachments?.length > 0 && (
                            <div className="mt-1.5 space-y-1">
                              {m.attachments.map((a: any) => (
                                <a key={a.id} href={conversationAttachmentUrl(a.id)} target="_blank" rel="noreferrer"
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${mine ? 'bg-primary-700/60 hover:bg-primary-700' : 'bg-surface-50 hover:bg-surface-100 border border-surface-200'} transition-colors`}>
                                  {a.mimeType?.startsWith('image/') ? <ImageIcon size={13} /> : <FileText size={13} />}
                                  <span className="truncate max-w-[180px]">{a.fileName}</span>
                                  <span className="opacity-60">{(a.size / 1024).toFixed(0)} KB</span>
                                </a>
                              ))}
                            </div>
                          )}
                          <p className={`text-[9px] mt-1 ${mine ? 'text-primary-100/70' : 'text-surface-400'}`}>{new Date(m.createdAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Composer */}
                <div className="p-3 sm:p-4 border-t border-surface-100 shrink-0">
                  <div className="flex items-end gap-2">
                    <label className="p-2.5 rounded-xl border border-surface-300 text-surface-500 hover:text-ink-900 hover:border-surface-400 cursor-pointer transition-colors shrink-0" title="Joindre un fichier">
                      <Paperclip size={17} />
                      <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" onChange={e => { const f = e.target.files?.[0]; if (f) attach(f); e.target.value = ''; }} />
                    </label>
                    <textarea value={text} onChange={e => setText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                      placeholder="Écrivez votre message…" rows={1}
                      className="flex-1 resize-none px-4 py-2.5 border border-surface-300 rounded-xl text-sm focus:border-primary-600 focus:outline-none max-h-32" />
                    <button onClick={send} disabled={sending || !text.trim()}
                      className="p-3 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-colors shrink-0" aria-label="Envoyer">
                      {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Modal nouveau */}
        {showNew && (
          <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-[2px] z-[80] flex items-center justify-center p-4 modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}>
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl modal-content flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-surface-100 flex items-center justify-between">
                <h3 className="font-display font-bold text-ink-900">Nouvelle discussion</h3>
                <button onClick={() => setShowNew(false)} className="text-surface-400 hover:text-surface-700"><X size={18} /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setSelectedIds([])} className={`px-3 py-3 rounded-xl text-xs font-bold border transition-all ${selectedIds.length === 0 ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-surface-300 text-surface-500'}`}>
                    Discussion directe
                  </button>
                  <button className={`px-3 py-3 rounded-xl text-xs font-bold border transition-all ${projectTitle || selectedIds.length > 0 ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-surface-300 text-surface-500'}`}>
                    Projet (groupe)
                  </button>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1">Nom du projet (optionnel)</label>
                  <input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="Ex: Concours blanc 2026"
                    className="w-full px-3 py-2.5 border border-surface-300 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1">Membres *</label>
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un membre…"
                      className="w-full pl-9 pr-3 py-2 border border-surface-300 rounded-lg text-xs focus:outline-none" />
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-surface-200 rounded-xl divide-y divide-gray-100">
                    {filteredContacts.length === 0 ? <p className="text-xs text-surface-400 text-center py-4">Aucun contact</p> : filteredContacts.map(c => {
                      const checked = selectedIds.includes(c.id);
                      return (
                        <button key={c.id} onClick={() => toggle(c.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${checked ? 'bg-primary-50' : 'hover:bg-surface-50'}`}>
                          <div className="w-8 h-8 rounded-full bg-ink-900 text-gold-400 flex items-center justify-center text-[10px] font-black shrink-0">{(c.name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold truncate">{c.name}</p>
                            <p className="text-[9px] text-surface-400">{c.role === 'STUDENT' ? 'Étudiant' : c.role === 'TEACHER' ? 'Enseignant' : c.role}</p>
                          </div>
                          <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${checked ? 'bg-primary-600 border-primary-600 text-white' : 'border-surface-300'}`}>{checked && <Check size={12} />}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startConversation('DIRECT')} disabled={creating || selectedIds.length !== 1}
                    className="flex-1 px-4 py-2.5 border border-surface-300 rounded-xl text-xs font-bold text-surface-700 hover:bg-surface-50 disabled:opacity-40 transition-colors">Discussion directe</button>
                  <button onClick={() => startConversation('PROJECT')} disabled={creating || selectedIds.length === 0}
                    className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 disabled:opacity-40 transition-colors">
                    {creating ? 'Création…' : `Créer le projet (${selectedIds.length})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
