import React, { useState, useMemo } from 'react';
import { useBanking } from '../context/BankingContext';
import { TransactionRecord, TransactionStatus } from '../types/banking';
import { formatRupiah, formatDateShort } from '../utils/formatters';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileText,
  Download,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';

export const TransactionHistoryView: React.FC = () => {
  const { transactions, openTrackingFor, openReceipt } = useBanking();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesStatus =
        statusFilter === 'ALL' || tx.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tx.destinationAccountHolder.toLowerCase().includes(q) ||
        tx.destinationAccountNumber.includes(q) ||
        tx.destinationBank.shortName.toLowerCase().includes(q) ||
        tx.id.toLowerCase().includes(q) ||
        tx.biFastRef.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [transactions, statusFilter, searchQuery]);

  const handleExportCSV = () => {
    const headers = ['ID Transaksi', 'No Ref BI-FAST', 'Tanggal (WIB)', 'Penerima', 'Bank Tujuan', 'No Rekening', 'Nominal', 'Biaya', 'Total', 'Jalur', 'Status'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      tx.biFastRef,
      new Date(tx.date).toLocaleString('id-ID'),
      `"${tx.destinationAccountHolder}"`,
      `"${tx.destinationBank.name}"`,
      tx.destinationAccountNumber,
      tx.amount,
      tx.fee,
      tx.total,
      tx.rail,
      tx.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mutasi_transfer_bank_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      
      {/* Header and Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Riwayat Mutasi & Transaksi
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Daftar lengkap transaksi transfer dana antar bank dengan audit trace BI-FAST resmi.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-800 shadow-sm transition-colors shrink-0"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Export Laporan (.CSV)</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama penerima, no rekening, bank, atau no referensi..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              Semua Mutasi
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              Berhasil
            </button>
            <button
              onClick={() => setStatusFilter('CLEARING_SETTLEMENT')}
              className={`px-3 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'CLEARING_SETTLEMENT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              Diproses Real-time
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden divide-y divide-slate-800/60">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white">Tidak Ada Transaksi</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
              Tidak ditemukan data transaksi yang sesuai dengan filter pencarian.
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isDone = tx.status === 'COMPLETED';

            return (
              <div
                key={tx.id}
                className="p-4 sm:p-5 hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left side info */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md"
                    style={{ backgroundColor: tx.destinationBank.color }}
                  >
                    {tx.destinationBank.logoText}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white truncate">
                        {tx.destinationAccountHolder}
                      </h3>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400">
                        {tx.destinationBank.shortName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono tabular-nums">{tx.destinationAccountNumber}</span>
                      <span>·</span>
                      <span>{formatDateShort(tx.date)}</span>
                      <span>·</span>
                      <span className="text-teal-400 font-semibold">{tx.rail}</span>
                    </div>

                    {tx.note && (
                      <p className="text-[11px] text-slate-500 truncate max-w-sm mt-0.5 italic">
                        &quot;{tx.note}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side amount and actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
                  <div className="text-left sm:text-right">
                    <p className="text-sm sm:text-base font-bold text-white font-mono tabular-nums">
                      - {formatRupiah(tx.amount)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Biaya: {formatRupiah(tx.fee)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Live status badge */}
                    <button
                      onClick={() => openTrackingFor(tx)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Klik untuk melacak perjalanan dana secara real-time"
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Sukses</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                          <span className="text-teal-400">Lacak</span>
                        </>
                      )}
                    </button>

                    {/* Receipt button */}
                    {isDone && (
                      <button
                        onClick={() => openReceipt(tx)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Lihat Bukti Transfer Sah"
                      >
                        <FileText className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
