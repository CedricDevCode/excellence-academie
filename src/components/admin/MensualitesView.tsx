import { useState, useEffect, useMemo } from "react";
import {
  Users, Search, Banknote, Send, CheckCircle, Clock, CalendarClock,
  AlertTriangle, X, Loader2, ChevronLeft, ChevronRight, BellRing,
} from "lucide-react";
import {
  fetchUsers, fetchPayments, sendBulkNotification,
  initCashPayment, confirmCashPayment, resendCashPaymentOtp,
} from "../../utils/api";
import OtpCountdown from "../OtpCountdown";
import { useToast } from "../Toast";
import LoadingSpinner from "./LoadingSpinner";

type FilterTab = "tous" | "retard" | "bientot" | "a_jour";
interface Row {
  key: string;
  user: any;
  sub: any;
  due: Date;
  daysUntil: number;
  status: "retard" | "bientot" | "a_jour";
}

const DUE_LABEL: Record<FilterTab, string> = {
  tous: "Tous",
  retard: "En retard",
  bientot: "≤ 7 jours",
  a_jour: "À jour",
};

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

export default function MensualitesView() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("tous");
  const [encaissCeMois, setEncaisseCeMois] = useState(0);
  const [remindingAll, setRemindingAll] = useState(false);
  const { toast } = useToast();

  // Encaissement espèces (OTP)
  const [cashPaySub, setCashPaySub] = useState<any>(null);
  const [cashPayTarget, setCashPayTarget] = useState<any>(null);
  const [cashPayMonths, setCashPayMonths] = useState(1);
  const [cashPayPaidAt, setCashPayPaidAt] = useState(() => new Date().toISOString().split("T")[0]);
  const [cashPayOtpSent, setCashPayOtpSent] = useState(false);
  const [cashPayOtp, setCashPayOtp] = useState("");
  const [cashPayExpiresAt, setCashPayExpiresAt] = useState(0);
  const [cashPayAmount, setCashPayAmount] = useState(0);
  const [cashPayLoading, setCashPayLoading] = useState(false);
  const [cashPayResending, setCashPayResending] = useState(false);
  const [cashPayError, setCashPayError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [users, payments] = await Promise.all([fetchUsers(), fetchPayments().catch(() => [])]);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const monthlySum = (payments as any[])
        .filter(p => p.status === 'SUCCESS' && (p.type === 'MENSUALITE' || p.type === 'MONTHLY') && new Date(p.createdAt) >= monthStart)
        .reduce((s, p) => s + Number(p.amount || 0), 0);
      setEncaisseCeMois(monthlySum);

      const now = startOfDay(new Date());
      const built: Row[] = [];
      for (const u of users as any[]) {
        if (u.role !== 'STUDENT') continue;
        const subs = (u.subscriptions || []).filter((s: any) => s.status === 'ACTIVE' && !s.coursParticuliers);
        for (const s of subs) {
          const due = startOfDay(new Date(s.nextPayment));
          const daysUntil = Math.round((due.getTime() - now.getTime()) / 86400000);
          const status: Row["status"] = daysUntil < 0 ? "retard" : daysUntil <= 7 ? "bientot" : "a_jour";
          built.push({ key: `${u.id}-${s.id}`, user: u, sub: s, due, daysUntil, status });
        }
      }
      built.sort((a, b) => a.due.getTime() - b.due.getTime());
      setRows(built);
    } catch (err) {
      console.error(err);
      toast('error', 'Erreur lors du chargement des mensualités');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (tab !== "tous") {
        if (tab === "retard" && r.status !== "retard") return false;
        if (tab === "bientot" && r.status !== "bientot") return false;
        if (tab === "a_jour" && r.status !== "a_jour") return false;
      }
      if (!q) return true;
      return (
        r.user.name?.toLowerCase().includes(q) ||
        r.user.email?.toLowerCase().includes(q) ||
        r.user.matricule?.toLowerCase().includes(q) ||
        r.sub.course?.title?.toLowerCase().includes(q)
      );
    });
  }, [rows, search, tab]);

  const counts = useMemo(() => ({
    retard: rows.filter(r => r.status === "retard").length,
    bientot: rows.filter(r => r.status === "bientot").length,
    a_jour: rows.filter(r => r.status === "a_jour").length,
    retardAmount: rows.filter(r => r.status === "retard").reduce((s, r) => s + Number(r.sub.amount || 0), 0),
    attenduMois: rows.reduce((s, r) => s + Number(r.sub.amount || 0), 0),
  }), [rows]);

  const remindOne = async (r: Row) => {
    try {
      await sendBulkNotification({
        userIds: [r.user.id],
        title: 'Rappel de mensualité',
        message: `Bonjour ${r.user.name || ''}, votre mensualité de ${Number(r.sub.amount || 0).toLocaleString('fr-FR')} FCFA pour ${r.sub.course?.title || 'votre formation'} est échue le 05 ${r.due.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}. Merci de régulariser au plus vite.`,
      });
      toast('success', `Rappel envoyé à ${r.user.name || r.user.email}`);
    } catch {
      toast('error', "Échec de l'envoi du rappel");
    }
  };

  const remindLate = async () => {
    const late = rows.filter(r => r.status === 'retard');
    if (late.length === 0) { toast('info', 'Aucun retardataire'); return; }
    setRemindingAll(true);
    try {
      await sendBulkNotification({
        userIds: [...new Set(late.map(r => r.user.id))],
        title: 'Rappel de mensualité',
        message: "Votre mensualité est en retard. Merci de régulariser au plus vite auprès du secrétariat ou via votre espace.",
      });
      toast('success', `Rappel envoyé à ${new Set(late.map(r => r.user.id)).size} étudiant(s)`);
    } catch {
      toast('error', "Échec de l'envoi des rappels");
    } finally {
      setRemindingAll(false);
    }
  };

  // ─── Encaissement espèces ───────────────────────────────────────────────
  const openCashPay = (row: Row) => {
    setCashPayTarget(row.user);
    setCashPaySub(row.sub);
    setCashPayMonths(1);
    setCashPayPaidAt(new Date().toISOString().split("T")[0]);
    setCashPayAmount(Number(row.sub.amount || 0));
    setCashPayOtpSent(false);
    setCashPayOtp("");
    setCashPayError(null);
  };
  const closeCashPay = () => {
    setCashPaySub(null);
    setCashPayTarget(null);
    setCashPayOtpSent(false);
    setCashPayOtp("");
    setCashPayError(null);
  };
  const startCashPay = async () => {
    if (!cashPaySub) return;
    setCashPayError(null);
    setCashPayLoading(true);
    try {
      const res = await initCashPayment({ subscriptionId: cashPaySub.id, months: cashPayMonths, paidAt: cashPayPaidAt });
      setCashPayAmount(Number(res?.amount ?? Number(cashPaySub.amount || 0) * cashPayMonths));
      setCashPayExpiresAt(typeof res?.expiresAt === 'number' ? res.expiresAt : Date.now() + 15 * 60 * 1000);
      setCashPayOtp("");
      setCashPayOtpSent(true);
    } catch (err: any) {
      setCashPayError(err?.message || "Erreur lors de l'initialisation");
    } finally {
      setCashPayLoading(false);
    }
  };
  const resendOtp = async () => {
    if (!cashPaySub) return;
    setCashPayError(null);
    setCashPayResending(true);
    try {
      const res = await resendCashPaymentOtp({ subscriptionId: cashPaySub.id });
      setCashPayExpiresAt(typeof res?.expiresAt === 'number' ? res.expiresAt : Date.now() + 15 * 60 * 1000);
      setCashPayOtp("");
    } catch (err: any) {
      setCashPayError(err?.message || "Erreur lors du renvoi");
    } finally {
      setCashPayResending(false);
    }
  };
  const confirmCashPay = async () => {
    if (!cashPaySub) return;
    if (!cashPayOtp || cashPayOtp.length < 4) { setCashPayError("Veuillez entrer le code OTP reçu par email."); return; }
    setCashPayError(null);
    setCashPayLoading(true);
    try {
      await confirmCashPayment({ subscriptionId: cashPaySub.id, otp: cashPayOtp });
      toast('success', 'Encaissement enregistré');
      closeCashPay();
      load();
    } catch (err: any) {
      setCashPayError(err?.message || "Erreur lors de la confirmation");
    } finally {
      setCashPayLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 text-xl flex items-center gap-2">
            <CalendarClock size={22} className="text-[#c97e00]" /> Mensualités
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">Échéance le 05 du mois — encaissement espèces (OTP) et relances</p>
        </div>
        <button onClick={remindLate} disabled={remindingAll || counts.retard === 0}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded font-bold text-sm hover:bg-primary-700 transition-colors whitespace-nowrap shadow-sm disabled:opacity-50">
          {remindingAll ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
          Relancer les retardataires ({counts.retard})
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Encaissé ce mois", value: `${encaissCeMois.toLocaleString('fr-FR')} F`, sub: "Paiements validés", tone: "text-accent-700 bg-accent-50", icon: <Banknote size={18} /> },
          { label: "En retard", value: String(counts.retard), sub: `${counts.retardAmount.toLocaleString('fr-FR')} FCFA dus`, tone: "text-rose-700 bg-rose-50", icon: <AlertTriangle size={18} /> },
          { label: "Échéance ≤ 7 j", value: String(counts.bientot), sub: "Proches de la date limite", tone: "text-amber-700 bg-amber-50", icon: <Clock size={18} /> },
          { label: "Attendu / mois", value: `${counts.attenduMois.toLocaleString('fr-FR')} F`, sub: `${rows.length} abonnement(s) actif(s)`, tone: "text-primary-800 bg-primary-50", icon: <CalendarClock size={18} /> },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded p-4 border border-surface-200 shadow-sm flex items-center gap-3">
            <div className={`w-11 h-11 rounded flex items-center justify-center shrink-0 ${k.tone}`}>{k.icon}</div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">{k.label}</p>
              <p className="text-lg font-black text-surface-900 tabular-nums truncate">{k.value}</p>
              <p className="text-[10px] text-surface-400 truncate">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="bg-white rounded border border-surface-200 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, email, matricule, formation..."
            className="w-full pl-9 pr-9 py-2.5 border border-surface-300 rounded text-sm focus:border-primary-600 focus:outline-none" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"><X size={14} /></button>}
        </div>
        <div className="flex rounded border border-surface-200 overflow-hidden self-start lg:self-auto">
          {(Object.keys(DUE_LABEL) as FilterTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 sm:px-4 py-2.5 text-xs font-bold transition-colors ${tab === t ? "bg-primary-600 text-white" : "bg-surface-50 text-surface-500 hover:text-surface-800"}`}>
              {DUE_LABEL[t]}{t !== "tous" && <> ({counts[t as keyof typeof counts] as number})</>}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded border border-surface-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-left">
                {["Étudiant", "Formation", "Mensualité", "Échéance", "Statut", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-surface-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-surface-400 text-sm">Aucune échéance</td></tr>
              ) : filtered.map(r => (
                <tr key={r.key} className="hover:bg-surface-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#c97e00] text-white flex items-center justify-center text-xs font-black shrink-0">
                        {r.user.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-surface-900 text-sm truncate max-w-[180px]">{r.user.name || '—'}</p>
                        <p className="text-[10px] text-surface-400 truncate max-w-[180px]">{r.user.matricule ? `Matr. ${r.user.matricule} · ` : ''}{r.user.telephone || r.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-surface-600 max-w-[200px] truncate">{r.sub.course?.title || '—'}</td>
                  <td className="px-5 py-3.5 text-sm font-bold text-surface-900 tabular-nums whitespace-nowrap">{Number(r.sub.amount || 0).toLocaleString('fr-FR')} F</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <p className="text-xs font-bold text-surface-800">{r.due.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    <p className="text-[10px] text-surface-400">05 {r.due.toLocaleDateString('fr-FR', { month: 'long' })}</p>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {r.status === "retard" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"><AlertTriangle size={10} /> En retard · {Math.abs(r.daysUntil)} j</span>
                    ) : r.status === "bientot" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><Clock size={10} /> {r.daysUntil === 0 ? "Échéance aujourd'hui" : `Dans ${r.daysUntil} j`}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200"><CheckCircle size={10} /> À jour</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openCashPay(r)} title="Encaisser en espèces"
                        className="flex items-center gap-1.5 px-3 py-2 rounded bg-primary-600 text-white text-[11px] font-bold hover:bg-primary-700 transition-colors">
                        <Banknote size={13} /> Encaisser
                      </button>
                      {r.status === "retard" && (
                        <button onClick={() => remindOne(r)} title="Envoyer un rappel"
                          className="p-2 rounded border border-surface-200 text-surface-500 hover:text-primary-700 hover:border-primary-300 transition-colors">
                          <Send size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-surface-100 flex items-center justify-between text-[11px] text-surface-400">
          <span>{filtered.length} échéance(s)</span>
          <span>Total affiché : {filtered.reduce((s, r) => s + Number(r.sub.amount || 0), 0).toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>

      {/* Encaissement modal */}
      {cashPaySub && (
        <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4 modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeCashPay(); }}>
          <div className="bg-white rounded w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh] modal-content" role="dialog" aria-modal="true">
            <div className="p-5 bg-gradient-to-r from-primary-700 via-[#c97e00] to-primary-800 text-white flex items-center gap-3 shrink-0">
              <div className="w-11 h-11 rounded bg-white/15 flex items-center justify-center shrink-0"><Banknote size={22} /></div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-base leading-tight">Encaissement en espèces</h3>
                <p className="text-amber-100/90 text-[11px] mt-0.5 truncate">{cashPayTarget?.name || cashPayTarget?.email} — {cashPaySub.course?.title}</p>
              </div>
              <button onClick={closeCashPay} className="text-amber-100 hover:text-white bg-white/10 hover:bg-white/20 rounded p-2 transition-colors shrink-0" aria-label="Fermer"><X size={17} /></button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {cashPayError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700 flex items-start gap-2">
                  <X size={14} className="shrink-0 mt-0.5" /> <span>{cashPayError}</span>
                </div>
              )}
              {!cashPayOtpSent ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5" htmlFor="mp-months">Mensualités</label>
                      <select id="mp-months" value={cashPayMonths} onChange={e => { const m = Number(e.target.value); setCashPayMonths(m); setCashPayAmount(Number(cashPaySub.amount || 0) * m); }} className="w-full px-3 py-2.5 bg-surface-50/60 border border-surface-300 rounded text-sm focus:bg-white focus:border-primary-600 focus:outline-none">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m} mois</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5" htmlFor="mp-paidat">Date de paiement *</label>
                      <input id="mp-paidat" type="date" value={cashPayPaidAt} max={new Date().toISOString().split("T")[0]} onChange={e => setCashPayPaidAt(e.target.value)} className="w-full px-3 py-2.5 bg-surface-50/60 border border-surface-300 rounded text-sm focus:bg-white focus:border-primary-600 focus:outline-none" />
                    </div>
                  </div>
                  <div className="rounded border border-primary-200 bg-gradient-to-br from-primary-50 to-amber-50/50 p-4 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-surface-500">Montant</span>
                    <span className="text-2xl font-black text-primary-800 tabular-nums">{Number(cashPayAmount || 0).toLocaleString('fr-FR')} <span className="text-xs">FCFA</span></span>
                  </div>
                  <p className="text-[11px] text-surface-400">Prochaine mensualité recalculée à partir de cette date (+{cashPayMonths} mois), échéance le 05.</p>
                  <button type="button" onClick={startCashPay} disabled={cashPayLoading}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded transition-all disabled:opacity-60">
                    {cashPayLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {cashPayLoading ? 'Envoi du code…' : 'Envoyer le code OTP'}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded p-4 text-xs text-blue-800">
                    Un code à 6 chiffres a été envoyé à la boîte mail de l'établissement — encaissement de <strong>{cashPayAmount.toLocaleString('fr-FR')} FCFA</strong>.
                  </div>
                  <div className="flex items-center justify-between gap-3 px-1">
                    <OtpCountdown expiresAt={cashPayExpiresAt} />
                    <button type="button" onClick={resendOtp} disabled={cashPayResending}
                      className="text-xs font-bold text-primary-800 hover:text-primary-900 hover:underline disabled:opacity-50 transition-colors">
                      {cashPayResending ? 'Envoi…' : 'Renvoyer le code'}
                    </button>
                  </div>
                  <input type="text" inputMode="numeric" autoComplete="one-time-code" value={cashPayOtp} onChange={e => setCashPayOtp(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmCashPay(); } }}
                    placeholder="Code reçu par email" maxLength={8} autoFocus
                    className="w-full px-4 py-3 border-2 border-surface-300 rounded text-center text-lg tracking-widest font-black tabular-nums focus:border-primary-600 focus:outline-none" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setCashPayOtpSent(false); setCashPayOtp(""); setCashPayError(null); }}
                      className="flex-1 px-4 py-2.5 border border-surface-300 text-surface-600 rounded text-xs font-semibold hover:bg-surface-100 transition-colors">
                      Retour
                    </button>
                    <button type="button" onClick={confirmCashPay} disabled={cashPayLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded transition-all disabled:opacity-60">
                      {cashPayLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      {cashPayLoading ? 'Confirmation…' : 'Confirmer'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
