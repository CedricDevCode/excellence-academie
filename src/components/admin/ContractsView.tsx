import { useState, useEffect } from "react";
import { FileText, X } from "lucide-react";
import { fetchAllContracts, getSignedContractPdfUrl } from "../../utils/api";
import LoadingSpinner from "./LoadingSpinner";

export default function ContractsView() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  const loadContracts = () => {
    setLoading(true);
    fetchAllContracts()
      .then(setContracts)
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadContracts(); }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <FileText size={18} className="text-[#c97e00]" /> Contrats signés
          </h2>
          <p className="text-gray-500 text-sm mt-1">{contracts.length} contrat(s) signé(s)</p>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white rounded border border-gray-100 p-8 text-center shadow-sm">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Aucun contrat signé pour le moment</p>
        </div>
      ) : (
        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Étudiant", "Matricule", "Email", "Téléphone", "Pays", "Signé le", ""].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-900 text-sm">{c.user?.name || "—"}</td>
                    <td className="py-3 px-4 text-xs text-gray-500 font-mono">{c.user?.matricule || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{c.user?.email || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{c.user?.telephone || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{c.user?.pays || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(c.signedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedContract(selectedContract?.id === c.id ? null : c)}
                        className="px-3 py-1.5 bg-[#c97e00] text-white rounded-lg text-xs font-semibold hover:bg-[#6b4500] whitespace-nowrap"
                      >
                        {selectedContract?.id === c.id ? 'Masquer' : 'Voir le contrat'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedContract && (
        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#c97e00]" />
              <span className="font-bold text-gray-900 text-sm">
                Contrat de {selectedContract.user?.name || "l'étudiant"}
              </span>
              <span className="text-xs text-gray-500">
                — Signé le {new Date(selectedContract.signedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <button onClick={() => setSelectedContract(null)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Contrat de formation signé</h3>
            <div className="h-[600px] border border-gray-200 rounded overflow-hidden">
              <iframe
                src={getSignedContractPdfUrl(selectedContract.id)}
                className="w-full h-full"
                title="Contrat signé"
              />
            </div>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-primary-50 rounded p-4 text-sm text-primary-800">
                <p><strong>Étudiant :</strong> {selectedContract.user?.name || "—"}</p>
                <p><strong>Email :</strong> {selectedContract.user?.email || "—"}</p>
                <p><strong>Matricule :</strong> {selectedContract.user?.matricule || "—"}</p>
                <p><strong>Téléphone :</strong> {selectedContract.user?.telephone || "—"}</p>
              </div>
              <div className="bg-primary-50 rounded p-4 text-sm text-primary-800">
                <p><strong>Pays :</strong> {selectedContract.user?.pays || "—"}</p>
                <p><strong>Ville :</strong> {selectedContract.user?.ville || "—"}</p>
                <p><strong>Signé le :</strong> {new Date(selectedContract.signedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                <p><strong>Adresse IP :</strong> {selectedContract.ipAddress || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
