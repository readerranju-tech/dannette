import React, { useState } from 'react';
import { useBanking } from '../context/BankingContext';
import { TransactionRecord, TrackingStage } from '../types/banking';
import { formatRupiah, formatDateWIB } from '../utils/formatters';
import {
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  Building2,
  Cpu,
  RefreshCw,
  ExternalLink,
  Zap,
  Radio
} from 'lucide-react';

interface RealtimeTrackingViewProps {
  initialTx?: TransactionRecord | null;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const RealtimeTrackingView: React.FC<RealtimeTrackingViewProps> = ({
  initialTx,
  isModal = false,
  onCloseModal
}) => {
  const { transactions, activeTrackingTx, openReceipt, findTransactionByRef } = useBanking();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  // Priority: initialTx -> activeTrackingTx -> most recent transaction
  const [currentTx, setCurrentTx] = useState<TransactionRecord | null>(() => {
    return initialTx || activeTrackingTx || transactions[0] || null;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    if (!searchQuery.trim()) return;

    const found = findTransactionByRef(searchQuery);
    if (found) {
      setCurrentTx(found);
      setSearchError('');
    } else {
      setSearchError('Nomor referensi atau ID transaksi tidak ditemukan di sistem.');
    }
  };

  const isCompleted = currentTx?.status === 'COMPLETED';

  return (
    <div className={`space-y-6 ${isModal ? 'p-1 sm:p-2' : 'max-w-5xl mx-auto py-6 px-4'}`}>
      
      {/* Header section (if not in modal) */}
      {!isModal && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Pelacakan Transaksi Real-Time
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Pantau siklus perpindahan dana antar bank melalui jaringan switching BI-FAST secara transparan & instan.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Node BI-FAST Gateway:</span>
            <span className="text-emerald-400 font-mono font-semibold">ONLINE (0.4s Latency)</span>
          </div>
        </div>
      )}

      {/* Real-time Reference Search Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Masukkan ID Transaksi (misal: TRX-2026...) atau No. Referensi BI-FAST (BIF...)"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors shrink-0 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
          >
            <Search className="w-4 h-4" />
            <span>Lacak Status</span>
          </button>
        </form>

        {searchError && (
          <p className="text-xs text-rose-400 font-medium mt-2">{searchError}</p>
        )}

        {/* Quick Recent Selection */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          <span className="text-slate-500 shrink-0 text-[11px]">Transaksi Terakhir:</span>
          {transactions.slice(0, 3).map((tx) => (
            <button
              key={tx.id}
              onClick={() => {
                setCurrentTx(tx);
                setSearchError('');
              }}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] whitespace-nowrap transition-colors ${
                currentTx?.id === tx.id
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800/70 text-slate-400 hover:text-white'
              }`}
            >
              {tx.destinationBank.shortName} · {formatRupiah(tx.amount)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tracking Details Canvas */}
      {currentTx ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
          
          {/* Top Overview Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">ID: {currentTx.id}</span>
                <span className="text-slate-600">·</span>
                <span className="text-xs font-semibold text-teal-400">{currentTx.rail}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                {formatRupiah(currentTx.amount)}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ke {currentTx.destinationAccountHolder} ({currentTx.destinationBank.name})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Status Transaksi
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 bg-slate-950 border border-slate-800">
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">SUKSES / LUNAS</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                      <span className="text-teal-400">SEDANG BERJALAN</span>
                    </>
                  )}
                </div>
              </div>

              {isCompleted && (
                <button
                  onClick={() => openReceipt(currentTx)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lihat Bukti</span>
                </button>
              )}
            </div>
          </div>

          {/* Visual Routing Map: Source -> Central Switch -> Destination */}
          <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-3">
              Visualisasi Rute Jaringan Pembayaran
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              
              {/* Origin Hop */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-600/40 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                  MDR
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block">Bank Asal Pengirim</span>
                  <p className="text-xs font-bold text-white truncate">
                    {currentTx.sourceAccount.bankName}
                  </p>
                  <p className="text-[10px] font-mono text-emerald-400 mt-0.5">
                    Mutasi Debet: OK
                  </p>
                </div>
              </div>

              {/* Central Switch Hop */}
              <div className="p-3 rounded-xl bg-slate-900 border border-teal-500/30 flex items-center gap-3 relative">
                <div className="w-10 h-10 rounded-xl bg-teal-950/80 border border-teal-500/50 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <Zap className="w-5 h-5 text-teal-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-teal-400 block font-semibold">Central Switching Hub</span>
                  <p className="text-xs font-bold text-white truncate">
                    {currentTx.rail === 'BI-FAST'
                      ? 'BI-FAST (Bank Indonesia)'
                      : currentTx.rail === 'RTGS'
                      ? 'BI-RTGS (Bank Indonesia)'
                      : currentTx.rail === 'SKNBI'
                      ? 'SKNBI Clearing House (Bank Indonesia)'
                      : 'Jaringan PRIMA / ALTO Hub'}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Protokol:{' '}
                    {currentTx.rail === 'RTGS'
                      ? 'BI-RTGS Gross Settlement'
                      : currentTx.rail === 'SKNBI'
                      ? 'SKNBI Batch Gen-2'
                      : currentTx.rail === 'BI-FAST'
                      ? 'ISO 20022 MX'
                      : 'ISO 8583 Online Switch'}
                  </p>
                </div>
              </div>

              {/* Destination Hop */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow"
                  style={{ backgroundColor: currentTx.destinationBank.color }}
                >
                  {currentTx.destinationBank.logoText}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block">Bank Tujuan Penerima</span>
                  <p className="text-xs font-bold text-white truncate">
                    {currentTx.destinationBank.name}
                  </p>
                  <p className="text-[10px] font-mono text-emerald-400 mt-0.5">
                    {isCompleted ? 'Kredit Terposting: OK' : 'Menunggu Settlement'}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Real-time 4-Stage Lifecycle Progression */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Rangkaian Tahapan Audit & Pelacakan
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Tahap {currentTx.currentStageIndex + 1} dari 4 Selesai
              </span>
            </div>

            {/* Stage Timeline */}
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {currentTx.stages.map((stage: TrackingStage, idx: number) => {
                const isStageDone = stage.status === 'completed';
                const isStageActive = stage.status === 'processing';
                const isStagePending = stage.status === 'pending';

                return (
                  <div key={stage.id} className="relative group">
                    {/* Stage Bullet */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-0.5 w-6 sm:w-8 h-6 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                        isStageDone
                          ? 'bg-emerald-950 border-2 border-emerald-400 text-emerald-400 shadow-md shadow-emerald-900/40'
                          : isStageActive
                          ? 'bg-teal-950 border-2 border-teal-400 text-teal-400 animate-pulse'
                          : 'bg-slate-900 border-2 border-slate-700 text-slate-600'
                      }`}
                    >
                      {isStageDone ? (
                        <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 stroke-[2.5]" />
                      ) : isStageActive ? (
                        <RefreshCw className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin text-teal-400" />
                      ) : (
                        <span className="text-[11px] font-mono font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Stage Content */}
                    <div
                      className={`p-4 rounded-2xl border transition-all ${
                        isStageActive
                          ? 'bg-teal-950/30 border-teal-500/40 shadow-lg'
                          : isStageDone
                          ? 'bg-slate-950/40 border-slate-800/80'
                          : 'bg-slate-950/20 border-slate-800/40 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            {stage.title}
                          </h4>
                          {isStageActive && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-400 animate-pulse">
                              PROSES REAL-TIME
                            </span>
                          )}
                        </div>

                        {stage.timestamp && (
                          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                            {stage.timestamp}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mt-1">
                        {stage.subtitle}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-slate-400" />
                          Node: {stage.networkEntity}
                        </span>
                        {stage.technicalCode && (
                          <span className="font-mono text-slate-400">
                            Respon: {stage.technicalCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Technical Trace Audit Information Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Data Teknis Audit BI-FAST (ISO 20022)
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                End-to-End TLS 1.3
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">No. Ref BI-FAST</span>
                <span className="text-slate-300 truncate block">{currentTx.biFastRef}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">STAN</span>
                <span className="text-slate-300 block">{currentTx.stan}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Perangkat Audit</span>
                <span className="text-slate-300 block">{currentTx.security.deviceFingerprint}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Skor Risiko</span>
                <span className="text-emerald-400 block font-bold">
                  {currentTx.security.riskScore}/100 ({currentTx.security.riskLevel})
                </span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Belum Ada Transaksi Dipilih</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Gunakan kotak pencarian di atas untuk memasukkan nomor referensi BI-FAST atau pilih transaksi dari riwayat Anda.
          </p>
        </div>
      )}

    </div>
  );
};
