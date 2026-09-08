import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Home, CreditCard, Bell, LogOut, Menu, X, User,
  CheckCircle, Clock, Download, GraduationCap,
  Calendar, ChevronRight, BookOpen, Phone, AlertCircle, Loader2, Camera, Save, Printer, Eye, FileText, ShoppingCart
} from "lucide-react";
import { getMe, logout as apiLogout, fetchMyPayments, fetchNotifications, markNotificationRead, fetchEvents, updateMyProfile, fetchMySubscriptions, fetchOverdueItems, paySubscription, fetchMyContract, signContract, getSignedContractPdfUrl, fetchBlogPosts } from "../utils/api";
import { generatePaymentReceipt, generatePaymentsReport } from "../utils/pdf";
import StudentSessionsView from "../components/StudentSessionsView";
import ContractView from "../components/ContractView";
import StudentPurchasesView from "../components/StudentPurchasesView";

const NAV_ITEMS = [
  { icon: <Home size={18} />, label: "Tableau de bord", id: "dashboard" },
  { icon: <CreditCard size={18} />, label: "Mes paiements", id: "payments" },
  { icon: <BookOpen size={18} />, label: "Mes cours", id: "courses" },
  { icon: <Calendar size={18} />, label: "Calendrier", id: "calendar" },
  { icon: <ShoppingCart size={18} />, label: "Mes achats", id: "purchases" },
  { icon: <FileText size={18} />, label: "Mon contrat", id: "contract" },
  { icon: <Bell size={18} />, label: "Notifications", id: "notifs" },
  { icon: <User size={18} />, label: "Profil", id: "profile" },
  { icon: <BookOpen size={18} />, label: "Blog", id: "blog" },
];

function formatPrice(amount: number) {
  return Number(amount).toLocaleString("fr-FR");
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-linear-to-r from-[#0056B3] to-[#003375] rounded-2xl p-6 h-32" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl p-5 h-28 border border-gray-100" />)}
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-3">
      <AlertCircle size={20} className="text-red-500 shrink-0" />
      <p className="text-red-700 text-sm flex-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-red-600 text-sm font-semibold hover:underline shrink-0">
          Réessayer
        </button>
      )}
    </div>
  );
}

function DashboardOverview({ user, payments, subscriptions, onRefresh }: { user: any; payments: any[]; subscriptions: any[]; onRefresh: () => void }) {
  const initials = user?.name?.split(" ").map((s: string) => s[0]).join("").toUpperCase() || "E";
  const [paying, setPaying] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [selectedMonths, setSelectedMonths] = useState(1);

  const paySubscriptionNow = async (subId: string) => {
    setPaying(subId);
    setPayError(null);
    try {
      const result = await paySubscription({ subscriptionId: subId, months: selectedMonths });
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    } catch (e: any) {
      setPayError(e.message || 'Erreur lors du paiement.');
    } finally {
      setPaying(null);
    }
  };

  const paidCount = payments.filter((p: any) => p.status === "SUCCESS").length;
  const totalPayments = payments.length;
  const progress = totalPayments > 0 ? Math.round((paidCount / totalPayments) * 100) : 0;
  const totalPaidAmount = payments.filter((p: any) => p.status === "SUCCESS").reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  const activeSub = subscriptions.find((s: any) => s.status === 'ACTIVE');
  const nextPaymentDate = activeSub
    ? new Date(activeSub.nextPayment).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  const nextPaymentAmount = activeSub ? activeSub.amount : 0;

  // Determine subscription status
  const today = new Date();
  const nextDue = activeSub ? new Date(activeSub.nextPayment) : null;
  const hasPendingPayment = activeSub && payments.some((p: any) => p.courseId === activeSub.courseId && p.status === 'PENDING');
  const isOverdue = nextDue && today > nextDue;
  const isUpToDate = activeSub && !isOverdue && !hasPendingPayment;

  const courseNames = [...new Set(subscriptions.filter((s: any) => s.course?.title).map((s: any) => s.course.title))];

  return (
    <>
      <div className="bg-linear-to-r from-[#0056B3] to-[#003375] rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-xl mb-1">Bon retour parmi nous, {user?.name?.split(" ")[0] || "Étudiant"} !</h2>
            {user?.matricule && <p className="text-blue-200 text-[10px] font-mono mb-1">{user.matricule}</p>}
            <p className="text-blue-200 text-sm">
              {!activeSub
                ? "Bienvenue sur votre espace étudiant."
                : hasPendingPayment
                  ? "Un paiement est en cours de confirmation..."
                  : isOverdue
                    ? `⚠️ Paiement en retard - ${nextPaymentDate} • ${formatPrice(nextPaymentAmount)} FCFA`
                    : `Prochaine échéance : ${nextPaymentDate} • ${formatPrice(nextPaymentAmount)} FCFA`
              }
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-3xl font-black text-[#FF6B00]">{formatPrice(totalPaidAmount)}</div>
            <div className="text-blue-200 text-sm">FCFA payés</div>
          </div>
        </div>
      </div>

      {payError && (
        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-red-700 text-xs font-semibold">{payError}</p>
        </div>
      )}

      {payments.length === 0 && (
        <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-5 mb-6">
          <p className="text-blue-800 text-sm font-semibold">
            Aucun paiement enregistré pour le moment. Votre historique apparaîtra ici après votre première inscription.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Paiements effectués", value: `${paidCount}`, icon: <CheckCircle size={18} />, color: "text-green-500", bg: "bg-green-50" },
          { label: "Prochaine échéance", value: activeSub ? `${formatPrice(nextPaymentAmount)} FCFA` : "—", icon: <Clock size={18} />, color: "text-orange-500", bg: "bg-orange-50", sub: nextPaymentDate },
          { label: "Total payé", value: `${formatPrice(totalPaidAmount)} FCFA`, icon: <CreditCard size={18} />, color: "text-[#0056B3]", bg: "bg-blue-50" },
          { label: "Concours", value: courseNames[0] || "Non défini", icon: <GraduationCap size={18} />, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center ${s.color} mb-3`}>{s.icon}</div>
            <div className="font-black text-gray-900 text-lg leading-tight">{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
            {(s as any).sub && activeSub && (
              <div className="mt-2 space-y-1.5">
                <div className="text-gray-400 text-[10px]">Échéance : {(s as any).sub}</div>
                {hasPendingPayment ? (
                  <div className="py-1.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg text-center">
                    Paiement en cours...
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {isOverdue && (
                      <div className="flex gap-1">
                        {[1, 2, 3].map(n => (
                          <button key={n} onClick={() => setSelectedMonths(n)}
                            className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition-colors ${selectedMonths === n ? 'bg-[#0056B3] text-white border-[#0056B3]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                            {n} mois
                          </button>
                        ))}
                        <button onClick={() => setSelectedMonths(6)}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition-colors ${selectedMonths === 6 ? 'bg-[#0056B3] text-white border-[#0056B3]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                          Tout
                        </button>
                      </div>
                    )}
                    <button onClick={() => paySubscriptionNow(activeSub.id)} disabled={paying === activeSub.id}
                      className="w-full py-1.5 bg-[#FF6B00] text-white text-xs font-bold rounded-lg hover:bg-[#e05e00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {paying === activeSub.id ? 'Redirection...' : isOverdue ? `Payer ${selectedMonths > 1 ? selectedMonths + ' mois' : 'le retard'}` : 'Payer maintenant'}
                    </button>
                    {isOverdue && (
                      <div className="text-gray-400 text-[10px] text-center">
                        Total : {formatPrice((activeSub?.amount || 0) * selectedMonths)} FCFA
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-gray-900">Progression des paiements</h3>
          <span className="text-[#0056B3] font-black">{progress}%</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-linear-to-r from-[#0056B3] to-[#FF6B00] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-gray-400 text-sm">{paidCount} paiement(s) sur {totalPayments || 0}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-black text-gray-900 flex items-center gap-2"><Calendar size={18} className="text-[#0056B3]" /> Historique des paiements</h3>
        </div>
        <div className="overflow-x-auto">
          {payments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucun paiement pour le moment</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Date", "Montant", "Type", "Statut", "Référence"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((m: any, i: number) => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-900 text-sm">{new Date(m.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3 px-4 font-bold text-[#0056B3] text-sm">{formatPrice(m.amount)} FCFA</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${m.type === "INSCRIPTION" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {m.type === "INSCRIPTION" ? "Inscription" : "Mensualité"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${m.status === "SUCCESS" ? "bg-green-100 text-green-700" : m.status === "PENDING" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                        {m.status === "SUCCESS" ? "✅ Payé" : m.status === "PENDING" ? "⏳ En attente" : "❌ Échoué"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400 font-mono">{m.geniusPayReference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6">
        <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2"><Phone size={18} className="text-[#0056B3]" /> Besoin d'aide ?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="tel:+2250747439443" className="flex items-center gap-2 text-sm text-[#0056B3] font-semibold hover:underline" aria-label="Appeler le 07 47 43 94 43">
            📞 07 47 43 94 43 (WhatsApp)
          </a>
          <a href="mailto:ea@exacademie.com" className="flex items-center gap-2 text-sm text-[#0056B3] font-semibold hover:underline" aria-label="Envoyer un email à ea@exacademie.com">
            📧 ea@exacademie.com
          </a>
        </div>
      </div>
    </>
  );
}

function PaymentsPage({ payments, subscriptions, overdueItems, onRefresh }: { payments: any[]; subscriptions: any[]; overdueItems: any[]; onRefresh: () => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<any>(null);

  const toggleItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const totalSelected = overdueItems
    .filter((item: any) => selectedIds.includes(item.id))
    .reduce((sum: number, item: any) => sum + item.amount, 0);

  // Group overdue items by subscriptionId to determine months per sub
  const monthsBySub = overdueItems
    .filter((item: any) => selectedIds.includes(item.id))
    .reduce((acc: Record<string, number>, item: any) => {
      acc[item.subscriptionId] = (acc[item.subscriptionId] || 0) + 1;
      return acc;
    }, {});

  const handlePaySelected = async () => {
    setPaying(true);
    setPayError(null);
    try {
      // Pay one subscription at a time (take the first one with selected items)
      const subId = Object.keys(monthsBySub)[0];
      if (!subId) return;
      const months = monthsBySub[subId];
      const result = await paySubscription({ subscriptionId: subId, months });
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    } catch (e: any) {
      setPayError(e.message || 'Erreur lors du paiement.');
    } finally {
      setPaying(false);
    }
  };

  const handleExportCsv = () => {
    const rows = [
      ["Date", "Montant", "Type", "Statut", "Référence"],
      ...payments.map((m: any) => [
        new Date(m.createdAt).toLocaleDateString("fr-FR"),
        `${formatPrice(m.amount)} FCFA`,
        m.type === "INSCRIPTION" ? "Inscription" : "Mensualité",
        m.status === "SUCCESS" ? "Payé" : m.status,
        m.geniusPayReference || "",
      ]),
    ];
    downloadCsv("paiements.csv", rows);
  };

  const handleExportPdf = () => {
    printPaymentsPdf(payments);
  };

  const openReceipt = async (payment: any) => {
    setReceiptPayment(payment);
    setShowReceiptModal(true);
    const url = await generatePaymentReceipt(payment, payment.user?.name);
    setReceiptUrl(url);
  };

  const handleDownloadReceipt = () => {
    if (!receiptUrl) return;
    const a = document.createElement('a');
    a.href = receiptUrl;
    a.download = `recu-${new Date(receiptPayment?.createdAt).toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintReceipt = () => {
    if (!receiptUrl) return;
    window.open(receiptUrl, '_blank')?.print();
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setReceiptUrl(null);
    setReceiptPayment(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-black text-gray-900 text-xl mb-2">Mes paiements</h2>
            <p className="text-gray-500 text-sm">Suivez l'historique complet de vos paiements.</p>
          </div>
          {payments.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <button onClick={handleExportCsv} className="inline-flex items-center gap-2 bg-[#0056B3] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#003375]">
                <Download size={16} /> Exporter CSV
              </button>
              <button onClick={handleExportPdf} className="inline-flex items-center gap-2 bg-[#10B981] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0f7f5a]">
                <Download size={16} /> Exporter PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {payError && (
        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-red-700 text-xs font-semibold">{payError}</p>
        </div>
      )}

      {/* ───── Overdue items section ───── */}
      {overdueItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
          <div className="p-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
            <h3 className="font-black text-red-700 flex items-center gap-2 text-sm">
              <AlertCircle size={16} /> Échéances impayées
            </h3>
            <span className="text-red-600 text-xs font-bold">{overdueItems.length} mois</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-red-50/50">
                <tr>
                  <th className="text-left py-2.5 px-4 w-10">
                    <input type="checkbox" checked={selectedIds.length === overdueItems.length && overdueItems.length > 0}
                      onChange={() => setSelectedIds(selectedIds.length === overdueItems.length ? [] : overdueItems.map((i: any) => i.id))}
                      className="rounded border-gray-300" />
                  </th>
                  {["Mois", "Formation", "Montant"].map(h => (
                    <th key={h} className="text-left py-2.5 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdueItems.map((item: any) => (
                  <tr key={item.id} className={`border-b border-gray-50 transition-colors ${selectedIds.includes(item.id) ? 'bg-red-50/30' : ''}`}>
                    <td className="py-2.5 px-4">
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleItem(item.id)} className="rounded border-gray-300" />
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-gray-900 text-sm">{item.label}</td>
                    <td className="py-2.5 px-4 text-sm text-gray-700">{item.courseTitle || "—"}</td>
                    <td className="py-2.5 px-4 font-bold text-red-600 text-sm">{formatPrice(item.amount)} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedIds.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600">{selectedIds.length} mois sélectionné(s)</span>
                <span className="ml-3 text-lg font-black text-[#0056B3]">{formatPrice(totalSelected)} FCFA</span>
              </div>
              <button onClick={handlePaySelected} disabled={paying}
                className="px-6 py-2.5 bg-[#FF6B00] text-white font-bold text-sm rounded-xl hover:bg-[#e05e00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {paying ? 'Redirection...' : `Payer ${formatPrice(totalSelected)} FCFA`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ───── Payment history ───── */}
      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Aucun paiement enregistré</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-black text-gray-900 flex items-center gap-2 text-sm"><Calendar size={16} className="text-[#0056B3]" /> Historique des paiements</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Date", "Montant", "Formation(s) suivie(s)", "Type", "Statut", "Référence", ""].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((m: any) => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 text-sm">{new Date(m.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
                      <div className="text-gray-400 text-xs">{new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0056B3] text-sm">{formatPrice(m.amount)}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 font-medium">{m.course?.title || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${m.type === "INSCRIPTION" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {m.type === "INSCRIPTION" ? "Inscription" : "Mensualité"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${m.status === "SUCCESS" ? "bg-green-100 text-green-700" : m.status === "PENDING" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                        {m.status === "SUCCESS" ? "✅ Payé" : m.status === "PENDING" ? "⏳ En attente" : "❌ Échoué"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400 font-mono">{m.geniusPayReference || "—"}</td>
                    <td className="py-3 px-4">
                      {m.status === "SUCCESS" && (
                        <button onClick={() => openReceipt(m)} className="px-3 py-1.5 border border-[#0056B3] text-[#0056B3] rounded-lg text-xs font-semibold hover:bg-[#F1F9FF] whitespace-nowrap" aria-label="Voir le reçu">
                          <Eye size={12} className="inline mr-1" /> Reçu
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* ───── Receipt Preview Modal ───── */}
      {showReceiptModal && receiptUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={closeReceiptModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
              <div>
                <h3 className="font-black text-gray-900">Aperçu du reçu</h3>
                {receiptPayment && (
                  <p className="text-gray-400 text-xs mt-0.5">
                    {receiptPayment.type === "INSCRIPTION" ? "Inscription" : "Mensualité"} — {formatPrice(receiptPayment.amount)} FCFA
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrintReceipt} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2">
                  <Printer size={16} /> Imprimer
                </button>
                <button onClick={handleDownloadReceipt} className="px-4 py-2 bg-[#0056B3] text-white rounded-xl text-sm font-semibold hover:bg-[#004494] transition-colors flex items-center gap-2">
                  <Download size={16} /> Télécharger
                </button>
                <button onClick={closeReceiptModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Fermer">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe src={receiptUrl} className="w-full h-full" title="Aperçu du reçu" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function downloadCsv(filename: string, rows: string[][]) {
  const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.setAttribute("download", filename);
  document.body.appendChild(link); link.click();
  document.body.removeChild(link); URL.revokeObjectURL(url);
}

function printPaymentsPdf(payments: any[]) {
  generatePaymentsReport(payments, "Export des paiements", `paiements-${new Date().toISOString().slice(0, 10)}.pdf`);
}



function CoursesPage() {
  return <StudentSessionsView />;
}

function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-black text-gray-900 text-xl">Calendrier</h2>
        <p className="text-gray-500 text-sm">Vos prochaines sessions et échéances.</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#0056B3]" /></div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Aucun événement planifié pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {events.map((event: any) => (
            <div key={event.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="bg-[#0056B3]/10 rounded-xl p-3 text-center shrink-0 min-w-[60px]">
                  <div className="text-[#0056B3] text-xs font-bold uppercase">
                    {new Date(event.startTime).toLocaleDateString("fr-FR", { weekday: "short" })}
                  </div>
                  <div className="text-[#0056B3] font-black text-lg leading-tight">
                    {new Date(event.startTime).getDate()}
                  </div>
                  <div className="text-[#0056B3] text-[10px] font-semibold uppercase">
                    {new Date(event.startTime).toLocaleDateString("fr-FR", { month: "short" })}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${event.type === "EXAM" ? "bg-red-500" : event.type === "EVENT" ? "bg-purple-500" : "bg-green-500"}`} />
                    <h3 className="font-bold text-gray-900 text-sm">{event.title}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      event.type === "EXAM" ? "bg-red-100 text-red-700" :
                      event.type === "EVENT" ? "bg-purple-100 text-purple-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {event.type === "EXAM" ? "Examen" : event.type === "EVENT" ? "Événement" : "Cours"}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    {new Date(event.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    {event.endTime ? ` - ${new Date(event.endTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                    {event.location ? ` • ${event.location}` : ""}
                  </p>
                  {event.description && <p className="text-gray-400 text-xs mt-1">{event.description}</p>}
                  {event.course && <span className="mt-1.5 inline-block text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{event.course.title}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsPage({ notifs, onRefresh }: { notifs: any[]; onRefresh: () => void }) {
  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 text-xl">Notifications</h2>
          <p className="text-gray-500 text-sm">Dernières alertes et messages reçus.</p>
        </div>
        {notifs.filter(n => !n.isRead).length > 0 && (
          <span className="bg-[#FF6B00] text-white text-xs font-bold px-2 py-1 rounded-full">
            {notifs.filter(n => !n.isRead).length} non lue(s)
          </span>
        )}
      </div>
      {notifs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <Bell size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifs.map((n: any) => (
            <div key={n.id} className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm ${!n.isRead ? "border-l-4 border-l-[#0056B3]" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{n.title}</h3>
                <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
              <p className="text-gray-500 text-sm">{n.message}</p>
              {!n.isRead && (
                <button onClick={() => handleMarkRead(n.id)} className="mt-2 text-[#0056B3] text-xs font-semibold hover:underline">
                  Marquer comme lu
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfilePage({ user, onRefresh }: { user: any; onRefresh: () => void }) {
  const [form, setForm] = useState({ name: '', telephone: '', ville: '', pays: '', image: '', oldPass: '', newPass: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (user) setForm(prev => ({
      ...prev,
      name: user.name || '',
      telephone: user.telephone || '',
      ville: user.ville || '',
      pays: user.pays || '',
      image: user.image || '',
    }));
  }, [user]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMessageType('error');
      setMessage('Le nom est requis.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const data: any = { name: form.name, telephone: form.telephone, ville: form.ville, pays: form.pays, image: form.image };
      if (form.oldPass && form.newPass) data.password = form.newPass;
      await updateMyProfile(data);
      setMessageType('success');
      setMessage('Profil mis à jour avec succès.');
      setForm(prev => ({ ...prev, oldPass: '', newPass: '' }));
      onRefresh();
    } catch {
      setMessageType('error');
      setMessage('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name?.split(" ").map((s: string) => s[0]).join("").toUpperCase() || "E";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 bg-linear-to-r from-blue-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#0056B3] flex items-center justify-center text-white"><User size={22} /></div>
          <div>
            <h2 className="font-black text-gray-900">Mon profil</h2>
            <p className="text-gray-500 text-sm">Informations personnelles et sécurité</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          {message && (
            <div className={`px-4 py-3 rounded-xl text-sm font-semibold ${messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message}
            </div>
          )}

          {/* Profile picture */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              <label className="cursor-pointer block">
                {form.image ? (
                  <img src={form.image} alt="Photo" className="w-20 h-20 rounded-full object-cover shadow-md border-2 border-white" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-linear-to-br from-[#0056B3] to-blue-400 flex items-center justify-center text-white text-2xl font-black shadow-md">
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              </label>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 border-2 border-white rounded-full" />
              <input type="file" accept="image/*" className="hidden" id="student-photo-upload"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    setMessage('Image trop volumineuse (max 2 Mo)');
                    setMessageType('error');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setForm({ ...form, image: reader.result as string });
                  reader.readAsDataURL(file);
                }} />
            </div>
            <div>
              <div className="font-bold text-gray-900">{form.name || 'Étudiant'}</div>
              <div className="text-gray-500 text-sm">{user?.email}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-blue-50 text-[#0056B3] text-xs font-semibold px-2.5 py-1 rounded-full">
                  <CheckCircle size={10} /> Étudiant
                </span>
                {user?.matricule && (
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full">
                    {user.matricule}
                  </span>
                )}
              </div>
              <label htmlFor="student-photo-upload" className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#0056B3] hover:underline cursor-pointer">
                <Camera size={12} /> Changer la photo
              </label>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Name / Email / Telephone / Ville / Pays */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom complet</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input value={user?.email || ''} disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Téléphone</label>
              <input value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ville</label>
              <input value={form.ville} onChange={e => setForm({...form, ville: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pays</label>
              <input value={form.pays} onChange={e => setForm({...form, pays: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Password change */}
          <div>
            <h3 className="font-bold text-gray-900 mb-1">Changer de mot de passe</h3>
            <p className="text-gray-500 text-xs mb-4">Laissez vides si vous ne souhaitez pas changer votre mot de passe.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe actuel</label>
                <input type="password" value={form.oldPass} onChange={e => setForm({...form, oldPass: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nouveau mot de passe</label>
                <input type="password" value={form.newPass} onChange={e => setForm({...form, newPass: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="pt-2 flex justify-end border-t border-gray-100">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-[#0056B3] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#003375] transition-all disabled:opacity-50 shadow-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractsPage({ contract, user, onRefresh }: { contract: any; user: any; onRefresh: () => void }) {
  const [signatureData, setSignatureData] = useState("");
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const handleSignContract = async () => {
    if (!signatureData) return;
    setSigning(true);
    setSignError(null);
    try {
      await signContract({ signatureData });
      setSignatureData("");
      onRefresh();
    } catch (e: any) {
      setSignError(e.message || 'Erreur lors de la signature.');
    } finally {
      setSigning(false);
    }
  };

  const signedPdfUrl = contract ? getSignedContractPdfUrl(contract.id) : undefined;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-black text-gray-900 text-xl flex items-center gap-2">
          <FileText size={18} className="text-[#0056B3]" /> Mon contrat de formation
        </h2>
        <p className="text-gray-500 text-sm mt-1">Consultez et signez votre contrat de formation.</p>
      </div>

      {signError && (
        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-red-700 text-xs font-semibold">{signError}</p>
        </div>
      )}

      {contract ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-green-50">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              <span className="font-bold text-green-800">Contrat signé le {new Date(contract.signedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Signature électronique apposée sur le contrat</p>
              <img src={contract.signatureData} alt="Signature" className="h-16" />
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Contrat de formation signé</p>
              <div className="h-[500px]">
                <iframe
                  src={signedPdfUrl}
                  className="w-full h-full rounded-lg"
                  title="Contrat de formation signé"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ContractView onSign={setSignatureData} signatureData={signatureData} studentName={user?.name} />
          {signatureData && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSignContract}
                disabled={signing}
                className="flex items-center gap-2 px-8 py-3 bg-[#0056B3] hover:bg-[#003375] text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-md"
              >
                {signing ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                {signing ? 'Signature en cours...' : 'Signer le contrat'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StudentBlogView() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchBlogPosts({ limit: 5 }).then(d => setPosts(d.posts || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><BookOpen size={18} className="text-[#0056B3]" /> Blog</h2>
          <p className="text-gray-500 text-sm">Articles récents de l'académie.</p>
        </div>
        <Link to="/blog" className="text-sm text-[#0056B3] font-semibold hover:underline">Voir tout</Link>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#0056B3]" /></div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Aucun article pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post: any) => (
            <Link key={post.id} to={`/blog/${post.slug}`}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
              <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{post.title}</h3>
              {post.excerpt && <p className="text-gray-500 text-xs line-clamp-2 mb-2">{post.excerpt}</p>}
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <span>{new Date(post.createdAt).toLocaleDateString("fr-FR")}</span>
                {post.author && <span>{post.author.name}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || localStorage.getItem('studentTab') || 'dashboard');

  const [user, setUser] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [overdueItems, setOverdueItems] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [contract, setContract] = useState<any>(null);
  const [contractLoading, setContractLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [userData, paymentsData, subsData, overdueData, notifsData] = await Promise.all([
        getMe(),
        fetchMyPayments(),
        fetchMySubscriptions(),
        fetchOverdueItems(),
        fetchNotifications()
      ]);
      if (userData.role !== 'STUDENT') {
        navigate('/');
        return;
      }
      setUser(userData);
      setPayments(paymentsData);
      setSubscriptions(subsData);
      setOverdueItems(overdueData.items || []);
      setNotifs(notifsData);
    } catch {
      navigate("/student/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (user) {
      const pendingSignature = sessionStorage.getItem('pending_contract_signature');
      const pendingEmail = sessionStorage.getItem('pending_contract_email');
      if (pendingSignature && pendingEmail === user.email) {
        setContractLoading(true);
        signContract({ signatureData: pendingSignature })
          .then(() => {
            sessionStorage.removeItem('pending_contract_signature');
            sessionStorage.removeItem('pending_contract_email');
            loadData();
          })
          .catch(() => {})
          .finally(() => setContractLoading(false));
      }
      fetchMyContract().then(setContract).catch(() => {});
    }
  }, [user]);

  useEffect(() => { localStorage.setItem('studentTab', activeTab); }, [activeTab]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifDropdown(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try { await apiLogout(); } catch { /* ignore */ }
    navigate("/student/login");
  };

  const handleRefresh = () => { loadData(); };

  const renderContent = () => {
    if (error) return <ErrorBanner message={error} onRetry={handleRefresh} />;
    switch (activeTab) {
      case "payments": return <PaymentsPage payments={payments} subscriptions={subscriptions} overdueItems={overdueItems} onRefresh={handleRefresh} />;
      case "courses": return <CoursesPage />;
      case "calendar": return <CalendarPage />;
      case "purchases": return <StudentPurchasesView />;
      case "contract": return <ContractsPage contract={contract} user={user} onRefresh={loadData} />;
      case "notifs": return <NotificationsPage notifs={notifs} onRefresh={handleRefresh} />;
      case "profile": return <ProfilePage user={user} onRefresh={handleRefresh} />;
      case "blog": return <StudentBlogView />;
      default: return <DashboardOverview user={user} payments={payments} subscriptions={subscriptions} onRefresh={handleRefresh} />;
    }
  };

  const activeTitle = NAV_ITEMS.find(item => item.id === activeTab)?.label || "Tableau de bord";
  const initials = user?.name?.split(" ").map((s: string) => s[0]).join("").toUpperCase() || "E";

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-[#0056B3] mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-[Inter,sans-serif] overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0056B3] text-white transform transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`} role="navigation" aria-label="Menu étudiant">
          <div className="flex items-center justify-between p-5 border-b border-blue-400/30">
          <div className="flex items-center gap-3">
            <img src="/images/logo%20exacademy.jpeg" alt="Excellence Académie" className="h-10 w-10 rounded-full object-cover border-2 border-white/30" />
            <div className="min-w-0">
              <div className="font-black text-sm truncate">Excellence Académie</div>
              <div className="text-blue-200 text-xs truncate">
                Étudiant
                {user?.matricule && <span className="block text-[10px] text-blue-300/80 font-mono mt-0.5">{user.matricule}</span>}
              </div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-blue-200 hover:text-white" aria-label="Fermer le menu">
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? "bg-white/20 text-white font-bold" : "text-blue-100 hover:bg-white/10"}`}
              aria-current={activeTab === item.id ? "page" : undefined}>
              {item.icon} {item.label}
              {activeTab === item.id && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-400/30">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-blue-200 hover:text-white text-sm rounded-xl hover:bg-white/10 transition-all" aria-label="Se déconnecter">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} role="presentation" />}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-2 flex flex-col shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700" aria-label="Ouvrir le menu">
                <Menu size={22} />
              </button>
              <div>
                <h1 className="font-black text-gray-900">{activeTitle}</h1>
                <p className="text-gray-400 text-xs">Excellence Académie • Espace étudiant</p>
              </div>
            </div>
            <nav className="hidden lg:flex items-center gap-5 mx-6">
              <a href="/#hero" className="text-xs font-semibold text-gray-500 hover:text-[#FF6B00] uppercase tracking-wide transition-colors">Accueil</a>
              <a href="/#actualite" className="text-xs font-semibold text-gray-500 hover:text-[#FF6B00] uppercase tracking-wide transition-colors">Actualité</a>
              <a href="/#atouts" className="text-xs font-semibold text-gray-500 hover:text-[#FF6B00] uppercase tracking-wide transition-colors">L'École</a>
              <a href="/#formations" className="text-xs font-semibold text-gray-500 hover:text-[#FF6B00] uppercase tracking-wide transition-colors">Formations</a>
              <a href="/#tarifs" className="text-xs font-semibold text-gray-500 hover:text-[#FF6B00] uppercase tracking-wide transition-colors">Tarifs</a>
              <a href="/shop" className="text-xs font-semibold text-gray-500 hover:text-[#FF6B00] uppercase tracking-wide transition-colors">Boutique</a>
              <a href="/student/login" className="text-xs font-semibold text-[#FF6B00] hover:text-[#e65c00] uppercase tracking-wide transition-colors">Espace Étudiant</a>
            </nav>
            <div className="flex items-center gap-3">
            <div className="relative" ref={notifRef}>
              <button onClick={() => { setShowNotifDropdown(!showNotifDropdown); setShowUserDropdown(false); }} className="relative p-2 text-gray-500 hover:text-gray-700" aria-label="Voir les notifications">
                <Bell size={20} />
                {notifs.filter(n => !n.isRead).length > 0 && (
                  <>
                    <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF6B00] rounded-full" />
                    <span className="absolute -top-0.5 -right-0.5 bg-[#FF6B00] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {notifs.filter(n => !n.isRead).length}
                    </span>
                  </>
                )}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                    <button onClick={() => setActiveTab("notifs")} className="text-[#0056B3] text-xs font-semibold hover:underline">Voir tout</button>
                  </div>
                  {notifs.length === 0 ? (
                    <p className="text-gray-400 text-xs text-center py-6">Aucune notification</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {notifs.slice(0, 5).map((n: any) => (
                        <div key={n.id} className={`p-4 ${!n.isRead ? "bg-blue-50/50" : ""}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-xs">{n.title}</h4>
                              <p className="text-gray-500 text-[11px] mt-0.5 line-clamp-2">{n.message}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">{new Date(n.createdAt).toLocaleDateString("fr-FR")}</span>
                          </div>
                          {!n.isRead && (
                            <button onClick={() => markNotificationRead(n.id).then(() => loadData())} className="mt-1.5 text-[#0056B3] text-[10px] font-semibold hover:underline">
                              Marquer comme lu
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => { setShowUserDropdown(!showUserDropdown); setShowNotifDropdown(false); }} className="w-9 h-9 rounded-full bg-[#FF6B00] flex items-center justify-center text-white font-black text-xs hover:ring-2 hover:ring-[#FF6B00]/50 transition-all" aria-label="Menu utilisateur">
                {initials}
              </button>
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm truncate">{user?.name || "Étudiant"}</p>
                    <p className="text-gray-400 text-xs">{user?.email || ""}</p>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { setActiveTab('profile'); setShowUserDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <User size={16} className="text-gray-400" /> Profil
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut size={16} /> Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

