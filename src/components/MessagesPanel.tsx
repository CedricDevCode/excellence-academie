import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, MessageCircle, SquarePen, Paperclip, X, Search, ChevronLeft, FileText,
  Image as ImageIcon, Check, Heart, Smile, Info, Users, ArrowLeft, RefreshCw,
  CheckCheck, ImagePlus, UserPlus, EllipsisVertical, Pencil, Trash2, Copy,
} from "lucide-react";
import {
  fetchConversations, fetchContactableUsers, createConversation,
  fetchConversationMessages, postConversationMessage, uploadConversationAttachment,
  conversationAttachmentUrl, getMe, editConversationMessage, deleteConversationMessage,
  deleteConversation,
} from "../utils/api";
import SEOHead from "./SEOHead";
import Container from "./ui/Container";
import { useToast } from "./Toast";

interface MessagesPanelProps {
  embedded?: boolean;
}

const EMOJIS = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "🙏", "👏", "😮", "✨", "✅", "👋"];
const EDIT_WINDOW_MS = 15 * 60 * 1000;

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

const formatListTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return formatTime(value);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};

function Avatar({ name, image, size = 42, gold = false }: { name?: string; image?: string; size?: number; gold?: boolean }) {
  const initials = (name || "?").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  if (image) {
    return <img src={image} alt={name || ""} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />;
  }
  return (
    <div style={{ width: size, height: size, fontSize: Math.max(10, size / 3) }}
      className={`rounded-full flex items-center justify-center font-black shrink-0 ${gold ? "bg-ink-900 text-gold-400" : "bg-gradient-to-br from-primary-400 to-primary-700 text-white"}`}>
      {initials}
    </div>
  );
}

export default function MessagesPanel({ embedded = false }: MessagesPanelProps) {
  const { toast, confirm } = useToast();
  const [me, setMe] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [inboxQuery, setInboxQuery] = useState("");
  const [inboxFilter, setInboxFilter] = useState<"ALL" | "GROUPS">("ALL");
  const [showInfo, setShowInfo] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [seenAt, setSeenAt] = useState<Record<string, string>>({});
  const [showNew, setShowNew] = useState(false);
  const [newMode, setNewMode] = useState<"MESSAGE" | "GROUP">("MESSAGE");
  const [newStep, setNewStep] = useState<"RECIPIENTS" | "NAME">("RECIPIENTS");
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const activeIdRef = useRef<string | null>(null);
  const seenRef = useRef<Record<string, string>>({});
  const messagesBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadMessagesRef = useRef<(id: string, silent?: boolean) => Promise<void>>(async () => {});
  const loadConversationsRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});

  activeIdRef.current = activeId;

  const active = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId]);

  const setSeenMap = (next: Record<string, string>) => {
    seenRef.current = next;
    setSeenAt(next);
  };

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      const box = messagesBoxRef.current;
      if (box) box.scrollTop = box.scrollHeight;
    });
  };

  const loadConversations = async (silent = false) => {
    if (!silent) setLoadingConvs(true);
    try {
      const list = await fetchConversations();
      setConversations(Array.isArray(list) ? list : []);
      setConvError(null);
      setSeenAt((prev) => {
        const next = { ...prev };
        let changed = false;
        (Array.isArray(list) ? list : []).forEach((c: any) => {
          if (!next[c.id]) {
            next[c.id] = c.lastMessageAt || c.updatedAt || new Date().toISOString();
            changed = true;
          }
        });
        if (changed) seenRef.current = next;
        return changed ? next : prev;
      });
    } catch (error) {
      if (!silent) setConvError(messageOf(error, "Impossible de charger les discussions"));
    } finally {
      if (!silent) setLoadingConvs(false);
    }
  };

  const loadMessages = async (id: string, silent = false) => {
    if (!silent) {
      setLoadingMsgs(true);
      setMsgError(null);
    }
    try {
      const list = await fetchConversationMessages(id);
      if (activeIdRef.current !== id) return;
      setMessages(Array.isArray(list) ? list : []);
      setMsgError(null);
      scrollToBottom();
    } catch (error) {
      if (!silent) setMsgError(messageOf(error, "Impossible de charger les messages"));
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  };

  loadConversationsRef.current = loadConversations;
  loadMessagesRef.current = loadMessages;

  useEffect(() => {
    getMe().then(setMe).catch(() => setMe(null));
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    const messagesTimer = window.setInterval(() => {
      const id = activeIdRef.current;
      if (id) loadMessagesRef.current(id, true);
    }, 4000);
    const conversationsTimer = window.setInterval(() => loadConversationsRef.current(true), 12000);
    return () => {
      window.clearInterval(messagesTimer);
      window.clearInterval(conversationsTimer);
    };
  }, []);

  const openConversation = (conversation: any) => {
    setActiveId(conversation.id);
    setShowInfo(false);
    setShowEmojis(false);
    setSeenMap({ ...seenRef.current, [conversation.id]: new Date().toISOString() });
  };

  const filteredConversations = useMemo(() => {
    const query = inboxQuery.trim().toLowerCase();
    return conversations.filter((c) => {
      if (inboxFilter === "GROUPS" && c.type !== "PROJECT") return false;
      if (!query) return true;
      const names = (c.members || []).map((m: any) => m?.name || "").join(" ");
      return (c.title || "").toLowerCase().includes(query) || names.toLowerCase().includes(query) || (c.lastMessage || "").toLowerCase().includes(query);
    });
  }, [conversations, inboxQuery, inboxFilter]);

  const isUnread = (c: any) => {
    if (c.id === activeId) return false;
    const last = new Date(c.lastMessageAt || c.updatedAt || 0).getTime();
    const seen = new Date(seenAt[c.id] || 0).getTime();
    return last > seen;
  };

  const conversationName = (c: any) =>
    c.title || (c.members || []).filter((m: any) => m?.id !== me?.id).map((m: any) => m?.name?.split(" ")[0]).join(", ") || "Discussion";

  const openNew = async (mode: "MESSAGE" | "GROUP" = "MESSAGE") => {
    setShowNew(true);
    setNewMode(mode);
    setNewStep("RECIPIENTS");
    setSelectedIds([]);
    setGroupName("");
    setContactQuery("");
    setLoadingContacts(true);
    try {
      setContacts(await fetchContactableUsers());
    } catch (error) {
      toast("error", messageOf(error, "Impossible de charger les contacts"));
    } finally {
      setLoadingContacts(false);
    }
  };

  const filteredContacts = useMemo(() => {
    const query = contactQuery.trim().toLowerCase();
    return contacts.filter((c) => !query || (c.name || "").toLowerCase().includes(query) || (c.email || "").toLowerCase().includes(query));
  }, [contacts, contactQuery]);

  const toggleContact = (id: string) =>
    setSelectedIds((prev) => newMode === "MESSAGE"
      ? (prev[0] === id ? [] : [id])
      : prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const proceedNew = () => {
    if (newStep === "NAME") {
      void createNewConversation();
      return;
    }
    if (newMode === "GROUP") {
      setNewStep("NAME");
      return;
    }
    void createNewConversation();
  };

  const createNewConversation = async () => {
    if (selectedIds.length === 0) return;
    if (newMode === "GROUP" && !groupName.trim()) {
      toast("error", "Donnez un nom au groupe");
      return;
    }
    setCreating(true);
    try {
      const conversation = await createConversation({
        type: newMode === "GROUP" ? "PROJECT" : "DIRECT",
        title: newMode === "GROUP" ? groupName.trim() : undefined,
        memberIds: selectedIds,
      });
      setShowNew(false);
      await loadConversations(true);
      setSeenMap({ ...seenRef.current, [conversation.id]: new Date().toISOString() });
      setActiveId(conversation.id);
      setText("");
      toast("success", newMode === "GROUP" ? "Groupe créé" : "Discussion ouverte");
    } catch (error) {
      toast("error", messageOf(error, "Impossible de créer la discussion"));
    } finally {
      setCreating(false);
    }
  };

  const pushMessage = (created: any) => {
    if (!created) return;
    setMessages((prev) => prev.some((m) => m.id === created.id) ? prev : [...prev, created]);
    setConversations((prev) => prev
      .map((c) => c.id === created.conversationId ? {
        ...c,
        lastMessage: created.content || "Pièce jointe",
        lastMessageAt: created.createdAt || new Date().toISOString(),
        updatedAt: created.createdAt || new Date().toISOString(),
      } : c)
      .sort((a, b) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime()));
    if (created.createdAt) setSeenMap({ ...seenRef.current, [created.conversationId]: created.createdAt });
    scrollToBottom();
  };

  const sendMessage = async (override?: string) => {
    const content = (override ?? text).trim();
    if (!content || !activeId || sending) return;
    setSending(true);
    try {
      const created = await postConversationMessage(activeId, content);
      if (override === undefined) {
        setText("");
        setShowEmojis(false);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
      pushMessage(created);
    } catch (error) {
      toast("error", messageOf(error, "Échec de l'envoi"));
    } finally {
      setSending(false);
      if (override === undefined) textareaRef.current?.focus();
    }
  };

  const attachFile = async (file: File) => {
    if (!activeId || sending) return;
    setSending(true);
    try {
      const created = await uploadConversationAttachment(activeId, file);
      pushMessage(created);
      toast("success", "Fichier envoyé");
    } catch (error) {
      toast("error", messageOf(error, "Échec de l'envoi du fichier"));
    } finally {
      setSending(false);
    }
  };

  const likeMessage = (message: any) => {
    if (liked[message.id] || !activeId) return;
    setLiked((prev) => ({ ...prev, [message.id]: true }));
    void sendMessage("❤️");
    window.setTimeout(() => setLiked((prev) => {
      const next = { ...prev };
      delete next[message.id];
      return next;
    }), 1300);
  };

  const outgoing = (m: any) => Boolean(me?.id && m.sender?.id === me.id);
  const editRemainingMs = (m: any) => Math.max(0, EDIT_WINDOW_MS - (Date.now() - new Date(m.createdAt).getTime()));
  const canEdit = (m: any) => outgoing(m) && editRemainingMs(m) > 0;

  const startEdit = (m: any) => {
    setEditingId(m.id);
    setEditText(m.content || "");
    setMenuId(null);
  };

  const saveEdit = async (m: any) => {
    const content = editText.trim();
    if (!content || !activeId) return;
    setActionBusy(true);
    try {
      const updated = await editConversationMessage(activeId, m.id, content);
      setMessages((prev) => prev.map((x) => x.id === m.id ? updated : x));
      setConversations((prev) => prev.map((c) => c.id === activeId ? { ...c, lastMessage: updated.content || c.lastMessage } : c));
      setEditingId(null);
      toast("success", "Message modifié");
    } catch (error) {
      toast("error", messageOf(error, "Impossible de modifier le message"));
    } finally {
      setActionBusy(false);
    }
  };

  const removeMessage = async (m: any, mode: "me" | "everyone") => {
    if (!activeId) return;
    setMenuId(null);
    const ok = mode === "everyone"
      ? await confirm("Supprimer ce message pour tous les participants ?")
      : await confirm("Supprimer ce message uniquement pour vous ?");
    if (!ok) return;
    setActionBusy(true);
    try {
      await deleteConversationMessage(activeId, m.id, mode);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      if (editingId === m.id) setEditingId(null);
      toast("success", mode === "everyone" ? "Message supprimé pour tous" : "Message supprimé");
    } catch (error) {
      toast("error", messageOf(error, "Impossible de supprimer le message"));
    } finally {
      setActionBusy(false);
    }
  };

  const removeConversation = async (conversation: any) => {
    setMenuId(null);
    const ok = await confirm(`Supprimer la discussion « ${conversationName(conversation)} » ? Cette action est irréversible.`);
    if (!ok) return;
    setActionBusy(true);
    try {
      await deleteConversation(conversation.id);
      setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
      if (activeId === conversation.id) {
        setActiveId(null);
        setMessages([]);
      }
      toast("success", "Discussion supprimée");
    } catch (error) {
      toast("error", messageOf(error, "Impossible de supprimer la discussion"));
    } finally {
      setActionBusy(false);
    }
  };

  const attachments = useMemo(() => messages.flatMap((m) => (m.attachments || []).map((a: any) => ({ ...a, createdAt: m.createdAt }))), [messages]);
  const memberList = active?.members || [];
  const lastOutgoingId = [...messages].reverse().find((m) => outgoing(m))?.id;

  const body = (
    <div className={`grid gap-3 lg:gap-4 ${showInfo ? "xl:grid-cols-[300px_minmax(0,1fr)_250px]" : "xl:grid-cols-[300px_minmax(0,1fr)]"} lg:grid-cols-[310px_minmax(0,1fr)] ${embedded ? "h-[calc(100vh-13rem)] min-h-[560px]" : "h-[calc(100vh-7rem)] min-h-[600px]"}`}>
      {menuId && <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />}
      <aside className={`bg-white rounded-2xl border border-surface-200 flex-col min-h-0 overflow-hidden ${activeId ? "hidden lg:flex" : "flex"}`}>
        <div className="p-4 border-b border-surface-100 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center"><MessageCircle size={18} /></div>
              <div>
                <h1 className="font-display font-bold text-ink-900 leading-tight">Messages</h1>
                <p className="text-[10px] text-surface-500">Vos conversations</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => openNew("GROUP")} className="p-2.5 min-h-[42px] min-w-[42px] rounded-xl text-surface-500 hover:bg-surface-100 hover:text-ink-900 transition-colors" title="Nouveau groupe" aria-label="Nouveau groupe"><UserPlus size={17} /></button>
              <button onClick={() => openNew()} className="p-2.5 min-h-[42px] min-w-[42px] rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors" title="Nouveau message" aria-label="Nouveau message"><SquarePen size={17} /></button>
            </div>
          </div>
          <div className="relative mt-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input value={inboxQuery} onChange={(e) => setInboxQuery(e.target.value)} placeholder="Rechercher une conversation…"
              className="w-full pl-9 pr-3 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs focus:bg-white focus:border-primary-500 focus:outline-none" />
          </div>
          <div className="flex gap-1.5 mt-3">
            {(["ALL", "GROUPS"] as const).map((filter) => (
              <button key={filter} onClick={() => setInboxFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${inboxFilter === filter ? "bg-ink-900 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}>
                {filter === "ALL" ? "Tout" : "Groupes"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {loadingConvs ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
          ) : convError ? (
            <div className="text-center px-4 py-10">
              <p className="text-xs text-surface-500 mb-3">{convError}</p>
              <button onClick={() => loadConversations()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold"><RefreshCw size={13} /> Réessayer</button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center px-4 py-12">
              <div className="w-14 h-14 rounded-full bg-surface-100 text-surface-400 flex items-center justify-center mx-auto mb-3"><MessageCircle size={26} /></div>
              <p className="text-sm font-bold text-ink-900">Aucune conversation</p>
              <p className="text-[11px] text-surface-500 mt-1">Démarrez une discussion avec l'équipe ou vos camarades.</p>
              <button onClick={() => openNew()} className="mt-4 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-xs font-bold">Nouveau message</button>
            </div>
          ) : filteredConversations.map((c) => {
            const selected = c.id === activeId;
            const group = c.type === "PROJECT";
            const others = (c.members || []).filter((m: any) => m?.id !== me?.id);
            return (
              <div key={c.id} role="button" tabIndex={0} onClick={() => openConversation(c)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openConversation(c); } }}
                className={`group relative w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${selected ? "bg-primary-50 border border-primary-200" : "hover:bg-surface-50 border border-transparent"}`}>
                {group ? (
                  <div className="relative w-11 h-11 shrink-0">
                    <div className="absolute inset-0 rounded-full bg-ink-900 flex items-center justify-center text-gold-400"><Users size={19} /></div>
                    {others[0] && <span className="absolute bottom-0 right-0"><Avatar name={others[0].name} image={others[0].image} size={18} gold /></span>}
                  </div>
                ) : (
                  <div className="relative shrink-0">
                    <Avatar name={conversationName(c)} image={others[0]?.image} size={44} />
                    {others[0] && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-accent-500 border-2 border-white" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-ink-900 truncate">{conversationName(c)}</p>
                    <span className="text-[10px] text-surface-400 shrink-0 group-hover:opacity-0">{formatListTime(c.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[11px] text-surface-500 truncate">{c.lastMessage || (group ? "Nouveau groupe" : "Dites bonjour 👋")}</p>
                    {isUnread(c) && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" title="Non lu" />}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); void removeConversation(c); }} disabled={actionBusy}
                  className="absolute right-2.5 top-3 p-1.5 rounded-lg text-surface-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  title="Supprimer la discussion" aria-label="Supprimer la discussion"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      </aside>

      <section className={`bg-white rounded-2xl border border-surface-200 flex-col min-h-0 overflow-hidden ${activeId ? "flex" : "hidden lg:flex"}`}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-primary-50/40 to-white">
            <div className="w-20 h-20 rounded-full bg-white border border-primary-100 shadow-sm flex items-center justify-center text-primary-600 mb-4"><MessageCircle size={36} strokeWidth={1.5} /></div>
            <h2 className="font-display text-xl font-bold text-ink-900">Vos messages</h2>
            <p className="text-xs text-surface-500 mt-2 max-w-sm leading-relaxed">Envoyez des messages, partagez des fichiers et créez des groupes pour vos projets de préparation.</p>
            <button onClick={() => openNew()} className="mt-5 inline-flex items-center gap-2 px-5 py-3 bg-primary-600 text-white rounded-xl font-bold text-xs hover:bg-primary-700 transition-colors"><SquarePen size={15} /> Nouveau message</button>
          </div>
        ) : (
          <Fragment>
            <div className="p-3 sm:p-4 border-b border-surface-100 flex items-center gap-3 shrink-0">
              <button onClick={() => { setActiveId(null); setShowInfo(false); }} className="lg:hidden p-2 -ml-1 text-surface-500 hover:text-ink-900" aria-label="Retour"><ChevronLeft size={20} /></button>
              <button onClick={() => openConversation(active)} className="flex items-center gap-3 min-w-0 text-left">
                {active.type === "PROJECT" ? (
                  <div className="w-10 h-10 rounded-full bg-ink-900 text-gold-400 flex items-center justify-center shrink-0"><Users size={18} /></div>
                ) : (
                  <Avatar name={conversationName(active)} image={memberList.find((m: any) => m?.id !== me?.id)?.image} size={40} />
                )}
                <div className="min-w-0">
                  <p className="font-display font-bold text-ink-900 text-sm truncate">{conversationName(active)}</p>
                  <p className="text-[10px] text-surface-500">{active.type === "PROJECT" ? `${memberList.length} membres` : "Discussion privée"}</p>
                </div>
              </button>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={() => setShowInfo((v) => !v)} className={`p-2.5 min-h-[42px] min-w-[42px] rounded-xl transition-colors ${showInfo ? "bg-primary-50 text-primary-700" : "text-surface-500 hover:bg-surface-100 hover:text-ink-900"}`} title="Informations" aria-label="Informations"><Info size={17} /></button>
                <button onClick={() => void removeConversation(active)} disabled={actionBusy} className="p-2.5 min-h-[42px] min-w-[42px] rounded-xl text-surface-500 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Supprimer la discussion" aria-label="Supprimer la discussion"><Trash2 size={17} /></button>
              </div>
            </div>

            <div ref={messagesBoxRef} className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-3 bg-surface-50/60">
              {loadingMsgs ? (
                <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
              ) : msgError ? (
                <div className="text-center py-12">
                  <p className="text-xs text-surface-500 mb-3">{msgError}</p>
                  <button onClick={() => loadMessages(active.id)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold"><RefreshCw size={13} /> Réessayer</button>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <Avatar name={conversationName(active)} image={memberList.find((m: any) => m?.id !== me?.id)?.image} size={56} gold />
                  <p className="font-display font-bold text-ink-900 text-sm mt-3">Dites bonjour à {conversationName(active).split(" ")[0]}</p>
                  <p className="text-[11px] text-surface-500 mt-1">Envoyez le premier message 💬</p>
                </div>
              ) : messages.map((m: any) => {
                const mine = outgoing(m);
                return (
                  <div key={m.id} className={`group/msg flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                    {!mine && <Avatar name={m.sender?.name} image={(m.sender as any)?.image} size={28} gold />}
                    <div className="relative max-w-[80%] sm:max-w-[68%]">
                      {!mine && (
                        <button onClick={() => likeMessage(m)} onDoubleClick={() => likeMessage(m)} title="Aimer"
                          className="absolute -right-2 -top-2 z-10 w-7 h-7 rounded-full bg-white border border-surface-200 shadow-sm flex items-center justify-center text-surface-400 hover:text-rose-500 transition-colors">
                          <Heart size={13} fill={liked[m.id] ? "currentColor" : "none"} className={liked[m.id] ? "text-rose-500" : ""} />
                        </button>
                      )}
                      <button onClick={() => setMenuId(menuId === m.id ? null : m.id)}
                        className={`absolute top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-white border border-surface-200 shadow-sm text-surface-500 hover:text-ink-900 opacity-0 group-hover/msg:opacity-100 focus:opacity-100 transition-opacity ${mine ? "-left-8" : "-right-8"}`}
                        title="Actions du message" aria-label="Actions du message"><EllipsisVertical size={15} /></button>
                      {menuId === m.id && (
                        <div className={`absolute top-0 z-40 w-48 py-1 bg-white border border-surface-200 rounded-xl shadow-xl ${mine ? "right-full mr-2" : "left-full ml-2"}`}>
                          <button onClick={() => { void navigator.clipboard?.writeText(m.content || ""); setMenuId(null); toast("success", "Message copié"); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-ink-900 hover:bg-surface-50"><Copy size={14} /> Copier</button>
                          {canEdit(m) && (
                            <button onClick={() => startEdit(m)} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-ink-900 hover:bg-surface-50">
                              <Pencil size={14} /> Modifier <span className="ml-auto text-[9px] text-surface-400">{Math.ceil(editRemainingMs(m) / 60000)} min</span>
                            </button>
                          )}
                          {mine && canEdit(m) && (
                            <button onClick={() => void removeMessage(m, "everyone")} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                              <Trash2 size={14} /> Supprimer pour tous
                            </button>
                          )}
                          <button onClick={() => void removeMessage(m, "me")} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                            <Trash2 size={14} /> Supprimer pour moi
                          </button>
                        </div>
                      )}
                      <div onDoubleClick={() => !mine && likeMessage(m)}
                        className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${mine ? "bg-gradient-to-br from-primary-600 to-primary-800 text-white rounded-br-md" : "bg-white border border-surface-200 text-ink-900 rounded-bl-md"}`}>
                        {!mine && memberList.length > 2 && <p className="text-[10px] font-bold text-primary-700 mb-0.5">{m.sender?.name}</p>}
                        {editingId === m.id ? (
                          <div className="min-w-[210px]" onClick={(e) => e.stopPropagation()}>
                            <input value={editText} autoFocus onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void saveEdit(m); } if (e.key === "Escape") setEditingId(null); }}
                              className="w-full px-2.5 py-2 rounded-lg border border-primary-400 bg-white text-ink-900 text-[13px] outline-none" />
                            <div className="flex justify-end gap-2 mt-2 text-[10px] font-bold">
                              <button onClick={() => setEditingId(null)} className="px-2.5 py-1.5 rounded-lg text-surface-500 hover:bg-surface-100">Annuler</button>
                              <button onClick={() => void saveEdit(m)} disabled={actionBusy || !editText.trim()} className="px-2.5 py-1.5 rounded-lg bg-primary-600 text-white disabled:opacity-40">Enregistrer</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {m.content && <p className="whitespace-pre-wrap break-words">{m.content}{m.editedAt && <span className={`ml-1.5 text-[9px] italic ${mine ? "text-primary-100/70" : "text-surface-400"}`}>(modifié)</span>}</p>}
                            {(m.attachments || []).length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {m.attachments.map((a: any) => (
                                  <a key={a.id} href={conversationAttachmentUrl(a.id)} target="_blank" rel="noreferrer"
                                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-colors ${mine ? "bg-white/15 hover:bg-white/25" : "bg-surface-50 hover:bg-surface-100 border border-surface-200"}`}>
                                    {a.mimeType?.startsWith("image/") ? <ImageIcon size={14} /> : <FileText size={14} />}
                                    <span className="truncate max-w-[170px]">{a.fileName}</span>
                                    <span className="opacity-60 shrink-0">{(a.size / 1024).toFixed(0)} Ko</span>
                                  </a>
                                ))}
                              </div>
                            )}
                            <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${mine ? "text-primary-100/80" : "text-surface-400"}`}>
                              <span>{formatTime(m.createdAt)}</span>
                              {mine && lastOutgoingId === m.id && <span title="Vu" className="inline-flex"><CheckCheck size={12} /></span>}
                            </div>
                          </>
                        )}
                      </div>
                      {liked[m.id] && <Heart size={26} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 fill-rose-500 drop-shadow-lg animate-pulse pointer-events-none" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative p-3 border-t border-surface-100 shrink-0 bg-white">
              {showEmojis && (
                <div className="absolute bottom-20 right-6 z-20 grid grid-cols-6 gap-1 p-2 bg-white border border-surface-200 rounded-2xl shadow-xl">
                  {EMOJIS.map((emoji) => (
                    <button key={emoji} onClick={() => { setText((prev) => prev + emoji); setShowEmojis(false); textareaRef.current?.focus(); }}
                      className="w-8 h-8 rounded-lg hover:bg-surface-100 text-lg">{emoji}</button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-1.5 sm:gap-2">
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) void attachFile(file); e.target.value = ""; }} />
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl text-surface-500 hover:bg-surface-100 hover:text-ink-900 transition-colors shrink-0" title="Joindre un fichier" aria-label="Joindre un fichier"><Paperclip size={18} /></button>
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl text-surface-500 hover:bg-surface-100 hover:text-ink-900 transition-colors shrink-0" title="Envoyer une image" aria-label="Envoyer une image"><ImagePlus size={18} /></button>
                <textarea ref={textareaRef} value={text} rows={1}
                  onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`; }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                  placeholder="Écrivez un message…" aria-label="Votre message"
                  className="flex-1 resize-none px-3 sm:px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-[13px] focus:bg-white focus:border-primary-500 focus:outline-none max-h-28" />
                <button onClick={() => setShowEmojis((v) => !v)} className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl text-surface-500 hover:bg-surface-100 hover:text-ink-900 transition-colors shrink-0" title="Émojis" aria-label="Émojis"><Smile size={18} /></button>
                {text.trim() ? (
                  <button onClick={() => void sendMessage()} disabled={sending} className="px-3 sm:px-4 min-h-[44px] rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors shrink-0">
                    {sending ? <Loader2 size={16} className="animate-spin" /> : "Envoyer"}
                  </button>
                ) : (
                  <button onClick={() => void sendMessage("❤️")} disabled={sending} className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl text-rose-500 hover:bg-rose-50 transition-colors shrink-0" title="Envoyer un cœur" aria-label="Envoyer un cœur"><Heart size={19} /></button>
                )}
              </div>
            </div>
          </Fragment>
        )}
      </section>

      {active && showInfo && (
        <aside className="hidden xl:flex bg-white rounded-2xl border border-surface-200 flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between shrink-0">
            <p className="font-display font-bold text-ink-900 text-sm">Informations</p>
            <button onClick={() => setShowInfo(false)} className="p-2 rounded-lg text-surface-400 hover:bg-surface-100" aria-label="Fermer"><X size={16} /></button>
          </div>
          <div className="overflow-y-auto p-4 space-y-5 flex-1">
            <div className="text-center">
              {active.type === "PROJECT" ? (
                <div className="w-16 h-16 rounded-full bg-ink-900 text-gold-400 flex items-center justify-center mx-auto"><Users size={28} /></div>
              ) : (
                <Avatar name={conversationName(active)} image={memberList.find((m: any) => m?.id !== me?.id)?.image} size={64} gold />
              )}
              <p className="font-display font-bold text-ink-900 text-sm mt-2 break-words">{conversationName(active)}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">{active.type === "PROJECT" ? "Groupe de projet" : "Discussion privée"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-2">Membres ({memberList.length})</p>
              <div className="space-y-2">
                {memberList.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <Avatar name={m.name} image={m.image} size={30} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-ink-900 truncate">{m.name}{m.id === me?.id ? " (vous)" : ""}</p>
                      <p className="text-[9px] text-surface-400">{m.role === "STUDENT" ? "Étudiant" : m.role === "TEACHER" ? "Formateur" : m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-2">Fichiers partagés ({attachments.length})</p>
              {attachments.length === 0 ? (
                <p className="text-[11px] text-surface-400">Aucun fichier pour le moment.</p>
              ) : (
                <div className="space-y-1.5">
                  {attachments.map((a: any) => (
                    <a key={a.id} href={conversationAttachmentUrl(a.id)} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-surface-50 hover:bg-surface-100 transition-colors">
                      {a.mimeType?.startsWith("image/") ? <ImageIcon size={14} className="text-primary-600" /> : <FileText size={14} className="text-primary-600" />}
                      <span className="text-[10px] font-semibold text-ink-900 truncate flex-1">{a.fileName}</span>
                      <span className="text-[9px] text-surface-400">{formatListTime(a.createdAt)}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => void removeConversation(active)} disabled={actionBusy}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-rose-200 text-rose-600 text-[11px] font-bold hover:bg-rose-50 transition-colors">
              <Trash2 size={14} /> Supprimer la discussion
            </button>
          </div>
        </aside>
      )}
    </div>
  );

  const newMessageModal = showNew && (
    <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-[2px] z-[80] flex items-center justify-center p-3 sm:p-4 modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl modal-content flex flex-col max-h-[88vh]">
        <div className="p-4 border-b border-surface-100 flex items-center gap-2 shrink-0">
          {newStep === "NAME" && <button onClick={() => setNewStep("RECIPIENTS")} className="p-2 rounded-lg text-surface-500 hover:bg-surface-100" aria-label="Retour"><ArrowLeft size={18} /></button>}
          <h3 className="font-display font-bold text-ink-900 flex-1">{newStep === "NAME" ? "Nommer le groupe" : "Nouveau message"}</h3>
          <button onClick={() => setShowNew(false)} className="p-2 rounded-lg text-surface-400 hover:bg-surface-100" aria-label="Fermer"><X size={18} /></button>
        </div>

        {newStep === "RECIPIENTS" ? (
          <>
            <div className="p-4 border-b border-surface-100 shrink-0 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setNewMode("MESSAGE"); setSelectedIds(selectedIds.slice(0, 1)); }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${newMode === "MESSAGE" ? "border-primary-600 bg-primary-50 text-primary-800" : "border-surface-200 text-surface-500"}`}>Message</button>
                <button onClick={() => setNewMode("GROUP")}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${newMode === "GROUP" ? "border-primary-600 bg-primary-50 text-primary-800" : "border-surface-200 text-surface-500"}`}>Groupe</button>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">À :</span>
                <div className="flex flex-wrap items-center gap-1.5 mt-1 min-h-8">
                  {selectedIds.map((id) => {
                    const contact = contacts.find((c) => c.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-50 text-primary-800 text-[11px] font-bold">
                        {contact?.name?.split(" ")[0] || "Membre"}
                        <button onClick={() => toggleContact(id)} aria-label="Retirer"><X size={12} /></button>
                      </span>
                    );
                  })}
                  <input value={contactQuery} onChange={(e) => setContactQuery(e.target.value)} autoFocus placeholder={selectedIds.length ? "Ajouter…" : "Rechercher une personne…"}
                    className="flex-1 min-w-[140px] py-1 text-xs outline-none placeholder:text-surface-400" />
                </div>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {loadingContacts ? (
                <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-primary-600" /></div>
              ) : filteredContacts.length === 0 ? (
                <p className="text-center text-xs text-surface-400 py-10">Aucune personne trouvée</p>
              ) : filteredContacts.map((c) => {
                const checked = selectedIds.includes(c.id);
                return (
                  <button key={c.id} onClick={() => toggleContact(c.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${checked ? "bg-primary-50" : "hover:bg-surface-50"}`}>
                    <Avatar name={c.name} image={c.image} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink-900 truncate">{c.name}</p>
                      <p className="text-[10px] text-surface-400">{c.role === "STUDENT" ? "Étudiant" : c.role === "TEACHER" ? "Formateur" : c.role}</p>
                    </div>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? "bg-primary-600 border-primary-600 text-white" : "border-surface-300"}`}>{checked && <Check size={12} strokeWidth={3} />}</span>
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-surface-100 shrink-0">
              <button onClick={proceedNew} disabled={selectedIds.length === 0 || creating}
                className="w-full py-3 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 disabled:opacity-40 transition-colors">
                {creating ? "Création…" : newMode === "GROUP" ? "Suivant" : "Chat"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="flex flex-col items-center text-center pt-2">
                <div className="w-16 h-16 rounded-full bg-ink-900 text-gold-400 flex items-center justify-center"><Users size={28} /></div>
                <p className="text-[11px] text-surface-500 mt-2">{selectedIds.length} personne{selectedIds.length > 1 ? "s" : ""} sélectionnée{selectedIds.length > 1 ? "s" : ""} + vous</p>
              </div>
              <div>
                <label htmlFor="group-name" className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">Nom du groupe</label>
                <input id="group-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void createNewConversation(); }} autoFocus
                  placeholder="Ex : Concours blanc 2026" className="w-full px-3 py-3 border border-surface-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedIds.map((id) => {
                  const contact = contacts.find((c) => c.id === id);
                  return <span key={id} className="px-2.5 py-1.5 rounded-full bg-surface-100 text-[11px] font-semibold text-surface-700">{contact?.name || "Membre"}</span>;
                })}
              </div>
            </div>
            <div className="p-4 border-t border-surface-100 shrink-0">
              <button onClick={proceedNew} disabled={creating || !groupName.trim()}
                className="w-full py-3 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 disabled:opacity-40 transition-colors">
                {creating ? "Création…" : "Créer le groupe"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (embedded) return <div className="h-full">{body}{newMessageModal}</div>;

  return (
    <div className="min-h-screen bg-surface-50">
      <SEOHead title="Messages" description="Discussions privées et groupes entre formateurs, étudiants et administration." url="/messages" />
      <Container className="py-6">{body}{newMessageModal}</Container>
    </div>
  );
}
