import { useState, useEffect } from "react";
import { fetchMonthlySalaryReport, payTeacherSalary, updateUser, fetchPaidSalaries } from "../utils/api";
import { DollarSign, Loader2, ChevronLeft, ChevronRight, CreditCard, User, Monitor, X, Edit3, Phone, Building2, Wallet, History } from "lucide-react";
import { useToast } from "./Toast";

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const PAYMENT_METHODS = [
  { value: 'Virement', label: 'Virement bancaire', icon: <Building2 size={16} /> },
  { value: 'Mobile Money', label: 'Mobile Money (Orange Money / MTN)', icon: <Phone size={16} /> },
  { value: 'Wave', label: 'Wave', icon: <Wallet size={16} /> },
  { value: 'Espèces', label: 'Espèces', icon: <CreditCard size={16} /> },
  { value: 'Chèque', label: 'Chèque', icon: <CreditCard size={16} /> },
  { value: 'Carte bancaire', label: 'Carte bancaire', icon: <CreditCard size={16} /> },
  { value: 'GeniusPay', label: 'GeniusPay (Paiement mobile)', icon: <Phone size={16} /> },
];

export default function TeacherSalariesView() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [bonusMap, setBonusMap] = useState<Record<string, string>>({});
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [rateEditValue, setRateEditValue] = useState<string>('');
  const [savingRate, setSavingRate] = useState(false);
  const { toast } = useToast();

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<{
    teacher: any; amount: number; teacherName: string; teacherId: string;
  } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('Virement');
  const [geniusPhone, setGeniusPhone] = useState('');

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await fetchMonthlySalaryReport(month, year);
      setReport(data);
    } catch (e) {
      console.error(e);
      toast('error', 'Erreur lors du chargement du rapport');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, [month, year]);

  const openPaymentModal = (teacher: any, amount: number, teacherName: string, teacherId: string) => {
    setPaymentModal({ teacher, amount, teacherName, teacherId });
    setSelectedMethod('Virement');
    setGeniusPhone(teacher.telephone || '');
  };

  const handlePayConfirm = async () => {
    if (!paymentModal) return;
    const { teacherId, amount, teacherName } = paymentModal;
    setPaying(true);
    const bonusVal = parseFloat(bonusMap[teacherId] || '0') || 0;

    try {
      if (selectedMethod === 'GeniusPay') {
        const phone = geniusPhone.replace(/\s/g, '');
        if (!phone) {
          toast('error', 'Veuillez renseigner le numéro de téléphone de l\'enseignant');
          setPaying(false);
          return;
        }
      }

      await payTeacherSalary({
        teacherId,
        amount,
        month,
        year,
        bonus: bonusVal,
        description: `Salaire ${MONTHS[month]} ${year} - ${teacherName}`,
        paymentMethod: selectedMethod,
        geniusPhone: selectedMethod === 'GeniusPay' ? geniusPhone : undefined,
      });

      toast('success', `Salaire de ${teacherName} payé avec succès !`);
      setBonusMap(prev => ({ ...prev, [teacherId]: '' }));
      setPaymentModal(null);
      loadReport();
    } catch (err: any) {
      toast('error', err?.message || 'Erreur lors du paiement du salaire');
    } finally {
      setPaying(false);
    }
  };

  const handleSaveRate = async (teacherId: string) => {
    setSavingRate(true);
    try {
      await updateUser(teacherId, { hourlyRate: rateEditValue || null });
      toast('success', 'Taux horaire mis à jour');
      setEditingRate(null);
      loadReport();
    } catch {
      toast('error', 'Erreur lors de la mise à jour du taux');
    } finally {
      setSavingRate(false);
    }
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const isCurrentOrPastMonth = year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth());
  const [tab, setTab] = useState<'unpaid' | 'paid'>('unpaid');
  const [paidSalaries, setPaidSalaries] = useState<any[]>([]);
  const [loadingPaid, setLoadingPaid] = useState(false);

  const loadPaidSalaries = async () => {
    setLoadingPaid(true);
    try {
      const data = await fetchPaidSalaries(month, year);
      setPaidSalaries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPaid(false);
    }
  };

  useEffect(() => {
    if (tab === 'paid') loadPaidSalaries();
  }, [tab, month, year]);

  return (
    <div className="space-y-3">
      {/* Header + Month Nav */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-black text-gray-900 flex items-center gap-1.5 text-sm sm:text-base">
          <DollarSign size={16} className="text-green-500 shrink-0" /> Salaires enseignants
        </h2>
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
          <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="font-bold text-xs sm:text-sm text-gray-900 min-w-[120px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" disabled={month >= now.getMonth() && year >= now.getFullYear()}>
            <ChevronRight size={14} className={month >= now.getMonth() && year >= now.getFullYear() ? 'opacity-30' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        <button onClick={() => setTab('unpaid')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            tab === 'unpaid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <CreditCard size={12} /> À payer
        </button>
        <button onClick={() => setTab('paid')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            tab === 'paid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <History size={12} /> Payés
        </button>
      </div>

      {tab === 'unpaid' ? (
        loading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#0056B3]" /></div>
        ) : report && report.report.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <DollarSign size={28} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-xs">Aucune séance en attente pour {MONTHS[month]} {year}.</p>
          </div>
        ) : report ? (
          <>
            {/* Summary bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-black text-green-600 truncate">{report.grandTotal.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">FCFA</span></div>
                  <p className="text-gray-500 text-xs mt-0.5">{report.report.length} enseignant{report.report.length > 1 ? 's' : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-bold text-gray-900">{report.totalHours}h</div>
                  <p className="text-gray-500 text-[10px]">travaillées</p>
                </div>
              </div>
            </div>

            {/* Teacher cards */}
            <div className="space-y-2">
              {report.report.map((entry: any) => (
                <div key={entry.teacher.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                  {/* Line 1: Avatar + Name/Email/Rate + Hours/Amount */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#0056B3] flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {entry.teacher.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-xs truncate">{entry.teacher.name || 'Inconnu'}</span>
                        <span className="text-gray-400 text-[10px] hidden sm:inline truncate">{entry.teacher.email}</span>
                        {editingRate === entry.teacher.id ? (
                          <span className="flex items-center gap-1 text-[10px]">
                            <input type="number" min="0" value={rateEditValue}
                              onChange={e => setRateEditValue(e.target.value)}
                              className="w-14 px-1 py-0.5 border border-gray-300 rounded text-[10px]" autoFocus />
                            <span className="text-gray-400">FCFA/h</span>
                            <button onClick={() => handleSaveRate(entry.teacher.id)} disabled={savingRate}
                              className="text-green-600 hover:text-green-700 font-semibold">{savingRate ? '...' : 'OK'}</button>
                            <button onClick={() => setEditingRate(null)}
                              className="text-gray-400 hover:text-gray-600">Annuler</button>
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                            {entry.teacher.hourlyRate ? `${entry.teacher.hourlyRate.toLocaleString('fr-FR')} FCFA/h` : '5 000 FCFA/h (défaut)'}
                            <button onClick={() => { setEditingRate(entry.teacher.id); setRateEditValue(entry.teacher.hourlyRate ? String(entry.teacher.hourlyRate) : ''); }}
                              className="text-gray-300 hover:text-[#0056B3] transition-colors">
                              <Edit3 size={9} />
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-baseline gap-1.5">
                      <span className="text-[10px] text-gray-500">{entry.totalHours}h</span>
                      <span className="text-sm font-black text-gray-900">{entry.totalPay.toLocaleString('fr-FR')} <span className="text-[9px] font-normal text-gray-400">FCFA</span></span>
                    </div>
                  </div>

                  {/* Line 2: Bonus + Pay button + Sessions inline */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pt-1.5 border-t border-gray-50">
                    {entry.sessions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.sessions.map((s: any) => (
                          <span key={s.id} className="inline-flex items-center gap-0.5 text-[9px] text-gray-500 bg-gray-50 rounded px-1.5 py-0.5">
                            <span className="font-semibold text-gray-700">{s.hours}h</span>
                            <span>·</span>
                            <span>{new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                            <span>·</span>
                            <span>{s.course?.title ? s.course.title.substring(0, 10) : 'Sans'}</span>
                            <span className={s.status === 'PAID' ? 'text-green-600' : s.status === 'VALIDATED' ? 'text-blue-600' : s.status === 'SCHEDULED' ? 'text-yellow-600' : 'text-indigo-600'}>
                              {s.status === 'PAID' ? '✓' : s.status === 'VALIDATED' ? '✓' : s.status === 'COMPLETED' ? '◉' : '○'}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[10px] text-gray-500 font-semibold">Bonus :</span>
                      <input type="number" min="0" value={bonusMap[entry.teacher.id] || ''}
                        onChange={e => setBonusMap(prev => ({ ...prev, [entry.teacher.id]: e.target.value }))}
                        placeholder="0"
                        className="w-12 px-1 py-0.5 border border-gray-200 rounded text-[10px] text-right focus:border-green-500 focus:outline-none" />
                      <span className="text-[10px] text-gray-400">FCFA</span>
                    </div>
                    <button onClick={() => openPaymentModal(entry.teacher, entry.totalPay, entry.teacher.name || entry.teacher.email, entry.teacher.id)}
                      disabled={!isCurrentOrPastMonth}
                      className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg font-bold text-[11px] hover:bg-green-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      <CreditCard size={11} /> Payer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null
      ) : (
        loadingPaid ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#0056B3]" /></div>
        ) : paidSalaries.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <History size={28} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-xs">Aucun salaire payé pour {MONTHS[month]} {year}.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paidSalaries.map((exp: any) => (
              <div key={exp.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {exp.teacher?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-gray-900 text-xs truncate">{exp.teacher?.name || 'Inconnu'}</span>
                    <span className="text-gray-400 text-[10px] ml-2 hidden sm:inline">{exp.teacher?.email}</span>
                  </div>
                  <div className="text-right shrink-0 flex items-baseline gap-2">
                    <span className="text-xs font-black text-green-600">{exp.amount.toLocaleString('fr-FR')} <span className="text-[9px] font-normal text-gray-400">FCFA</span></span>
                    <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700">{exp.paymentMethod}</span>
                    <span className="text-[9px] text-gray-400 hidden sm:inline">
                      {new Date(exp.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                {exp.description && (
                  <p className="mt-1.5 text-[10px] text-gray-400 border-t border-gray-50 pt-1.5">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-overlay">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm">Confirmer le paiement</h3>
              <button onClick={() => setPaymentModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-[#0056B3] flex items-center justify-center text-white font-bold text-sm">
                  {paymentModal.teacherName[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 text-sm truncate">{paymentModal.teacherName}</div>
                  <div className="text-gray-500 text-[11px] truncate">{paymentModal.teacher.email || ''}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Salaire de base</span>
                  <span className="font-semibold text-gray-900">{paymentModal.amount.toLocaleString('fr-FR')} FCFA</span>
                </div>
                {bonusMap[paymentModal.teacherId] && parseFloat(bonusMap[paymentModal.teacherId]) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Bonus</span>
                    <span className="font-semibold text-green-600">+{parseFloat(bonusMap[paymentModal.teacherId]).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-gray-900 pt-1.5 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-green-600">
                    {(paymentModal.amount + (parseFloat(bonusMap[paymentModal.teacherId] || '0') || 0)).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Moyen de paiement</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PAYMENT_METHODS.map(method => (
                    <button key={method.value} type="button" onClick={() => setSelectedMethod(method.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold border transition-all ${
                        selectedMethod === method.value
                          ? 'border-[#0056B3] bg-blue-50 text-[#0056B3]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {method.icon} {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedMethod === 'GeniusPay' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone enseignant</label>
                  <input type="tel" value={geniusPhone} onChange={e => setGeniusPhone(e.target.value)}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:border-[#0056B3] focus:outline-none" />
                  <p className="text-[10px] text-gray-400 mt-1">Paiement envoyé via GeniusPay sur ce numéro</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setPaymentModal(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 font-semibold">Annuler</button>
                <button onClick={handlePayConfirm} disabled={paying}
                  className="flex items-center gap-1.5 bg-green-500 text-white px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-green-600 disabled:opacity-50 transition-all">
                  {paying ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                  {paying ? 'Paiement...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}