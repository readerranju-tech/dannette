import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Bank,
  TransactionRecord,
  SavedBeneficiary,
  UserSecurityProfile,
  TransferRail,
  TrackingStage
} from '../types/banking';
import { INITIAL_TRANSACTIONS, INITIAL_SAVED_BENEFICIARIES } from '../data/mockTransactions';
import { INDONESIAN_BANKS } from '../data/indonesianBanks';
import {
  generateBiFastRef,
  generateTransactionId,
  generateSTAN,
  formatDateWIB
} from '../utils/formatters';
import { generateSecurityAudit, evaluateTransactionRisk } from '../utils/security';

interface UserAccount {
  name: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  balance: number;
}

interface BankingContextType {
  activeTab: 'transfer' | 'tracking' | 'history' | 'security' | 'banks';
  setActiveTab: (tab: 'transfer' | 'tracking' | 'history' | 'security' | 'banks') => void;
  userAccount: UserAccount;
  securityProfile: UserSecurityProfile;
  transactions: TransactionRecord[];
  savedBeneficiaries: SavedBeneficiary[];
  activeTrackingTx: TransactionRecord | null;
  isTrackingModalOpen: boolean;
  selectedReceiptTx: TransactionRecord | null;
  
  // Actions
  initiateTransfer: (data: {
    destinationBank: Bank;
    destinationAccountNumber: string;
    destinationAccountHolder: string;
    amount: number;
    fee: number;
    rail: TransferRail;
    purpose: string;
    note: string;
    authMethod: 'PIN_6_DIGIT' | 'BIOMETRIC_FACE_ID' | 'BIOMETRIC_FINGERPRINT';
  }) => Promise<TransactionRecord>;
  
  updateSecurityProfile: (profile: Partial<UserSecurityProfile>) => void;
  freezeAccount: (reason: string) => void;
  unfreezeAccount: (pin: string) => boolean;
  topUpBalance: (amount: number) => void;
  addBeneficiary: (beneficiary: Omit<SavedBeneficiary, 'id' | 'transferCount'>) => void;
  removeBeneficiary: (id: string) => void;
  openTrackingFor: (tx: TransactionRecord) => void;
  closeTracking: () => void;
  openReceipt: (tx: TransactionRecord) => void;
  closeReceipt: () => void;
  findTransactionByRef: (query: string) => TransactionRecord | undefined;
}

const BankingContext = createContext<BankingContextType | undefined>(undefined);

const LOCAL_STORAGE_TX_KEY = 'nusantara_pay_tx_records_v2';
const LOCAL_STORAGE_BENEFICIARIES_KEY = 'bank_beneficiaries_v1';
const LOCAL_STORAGE_BALANCE_KEY = 'bank_balance_v4';
const LOCAL_STORAGE_SECURITY_KEY = 'bank_security_v4';

export const BankingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'transfer' | 'tracking' | 'history' | 'security' | 'banks'>('transfer');

  // User Core Account State (Saldo Rp 5.002.452.456)
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_BALANCE_KEY);
    return saved ? Number(saved) : 5002452456;
  });

  const [securityProfile, setSecurityProfile] = useState<UserSecurityProfile>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_SECURITY_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          pin: parsed.pin === '123456' ? '080808' : parsed.pin
        };
      } catch {
        // fallback
      }
    }
    return {
      pin: '080808',
      isScrambledKeypad: true,
      isBiometricEnabled: true,
      biometricType: 'FACE_ID',
      dailyTransferLimit: 5000000000, // Rp 5 Miliar untuk nasabah prioritas
      usedTodayLimit: 4705000,
      requireOtpForLargeTx: true,
      largeTxThreshold: 50000000,
      isAccountFrozen: false,
    };
  });

  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_TX_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  const [savedBeneficiaries, setSavedBeneficiaries] = useState<SavedBeneficiary[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_BENEFICIARIES_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_SAVED_BENEFICIARIES;
  });

  const [activeTrackingTx, setActiveTrackingTx] = useState<TransactionRecord | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<TransactionRecord | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_BALANCE_KEY, balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_SECURITY_KEY, JSON.stringify(securityProfile));
  }, [securityProfile]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_BENEFICIARIES_KEY, JSON.stringify(savedBeneficiaries));
  }, [savedBeneficiaries]);

  const userAccount: UserAccount = {
    name: 'Barlianto Surono Hadi',
    accountNumber: '1680001627122',
    bankName: 'PT Bank Mandiri (Persero) Tbk',
    bankCode: '008',
    balance
  };

  const updateSecurityProfile = (profile: Partial<UserSecurityProfile>) => {
    setSecurityProfile((prev) => ({ ...prev, ...profile }));
  };

  const freezeAccount = (reason: string) => {
    setSecurityProfile((prev) => ({
      ...prev,
      isAccountFrozen: true,
      frozenAt: new Date().toISOString(),
      freezeReason: reason
    }));
  };

  const unfreezeAccount = (pin: string): boolean => {
    if (pin === securityProfile.pin) {
      setSecurityProfile((prev) => ({
        ...prev,
        isAccountFrozen: false,
        frozenAt: undefined,
        freezeReason: undefined
      }));
      return true;
    }
    return false;
  };

  const topUpBalance = (amount: number) => {
    setBalance((prev) => prev + amount);
  };

  const addBeneficiary = (beneficiary: Omit<SavedBeneficiary, 'id' | 'transferCount'>) => {
    const newBeneficiary: SavedBeneficiary = {
      ...beneficiary,
      id: `fav-${Date.now()}`,
      transferCount: 1,
      lastTransferDate: new Date().toISOString()
    };
    setSavedBeneficiaries((prev) => [newBeneficiary, ...prev]);
  };

  const removeBeneficiary = (id: string) => {
    setSavedBeneficiaries((prev) => prev.filter((b) => b.id !== id));
  };

  const openTrackingFor = (tx: TransactionRecord) => {
    setActiveTrackingTx(tx);
    setIsTrackingModalOpen(true);
  };

  const closeTracking = () => {
    setIsTrackingModalOpen(false);
  };

  const openReceipt = (tx: TransactionRecord) => {
    setSelectedReceiptTx(tx);
  };

  const closeReceipt = () => {
    setSelectedReceiptTx(null);
  };

  const findTransactionByRef = (query: string): TransactionRecord | undefined => {
    const clean = query.trim().toUpperCase();
    return transactions.find(
      (tx) =>
        tx.id.toUpperCase() === clean ||
        tx.biFastRef.toUpperCase() === clean ||
        tx.stan === clean ||
        tx.destinationAccountNumber.includes(clean)
    );
  };

  /**
   * INITIATE REAL-TIME TRANSFER LIFECYCLE
   * Creates the transaction record and simulates the real-time stage progression:
   * 1. Validasi Enkripsi & Biometrik (0s)
   * 2. Switching Jaringan Bank Indonesia (0.8s)
   * 3. Kliring & Settlement Bank Tujuan (1.8s)
   * 4. Dana Berhasil Diterima (2.8s)
   */
  const initiateTransfer = async (data: {
    destinationBank: Bank;
    destinationAccountNumber: string;
    destinationAccountHolder: string;
    amount: number;
    fee: number;
    rail: TransferRail;
    purpose: string;
    note: string;
    authMethod: 'PIN_6_DIGIT' | 'BIOMETRIC_FACE_ID' | 'BIOMETRIC_FINGERPRINT';
  }): Promise<TransactionRecord> => {
    const totalDeduction = data.amount + data.fee;

    // Check balance & account lock
    if (securityProfile.isAccountFrozen) {
      throw new Error('Rekening saat ini dalam status terkunci demi alasan keamanan.');
    }
    if (balance < totalDeduction) {
      throw new Error('Saldo Anda tidak mencukupi untuk melakukan transfer ini.');
    }

    // Check daily limit
    if (securityProfile.usedTodayLimit + totalDeduction > securityProfile.dailyTransferLimit) {
      throw new Error('Transfer melebihi sisa limit transfer harian Anda.');
    }

    const txId = generateTransactionId();
    const biFastRef = generateBiFastRef();
    const stan = generateSTAN();
    const now = new Date();

    const isKnown = savedBeneficiaries.some(
      (b) =>
        b.bankId === data.destinationBank.id &&
        b.accountNumber === data.destinationAccountNumber
    );

    const riskEvaluation = evaluateTransactionRisk(
      data.amount,
      data.destinationAccountNumber,
      isKnown,
      securityProfile.usedTodayLimit,
      securityProfile.dailyTransferLimit
    );

    const initialStages: TrackingStage[] = [
      {
        id: 'stage-1',
        title: 'Validasi Enkripsi & Biometrik',
        subtitle: `Verifikasi otorisasi ${data.authMethod === 'PIN_6_DIGIT' ? 'PIN 6-Digit' : 'Sensor Biometrik'} & tanda tangan enkripsi TLS 1.3`,
        networkEntity: 'Mandiri Security Core',
        timestamp: formatDateWIB(now),
        status: 'completed',
        technicalCode: 'SEC_AUTH_APPROVED_200'
      },
      {
        id: 'stage-2',
        title:
          data.rail === 'BI-FAST'
            ? 'Switching Jaringan Bank Indonesia (BI-FAST)'
            : data.rail === 'RTGS'
            ? 'Penyelesaian RTGS (Real Time Gross Settlement) Bank Indonesia'
            : data.rail === 'SKNBI'
            ? 'Kliring Terjadwal SKNBI (Sistem Kliring Nasional Bank Indonesia)'
            : 'Switching Jaringan Interkoneksi Online Nasional',
        subtitle:
          data.rail === 'BI-FAST'
            ? 'Pengiriman pesan ISO 20022 Financial Switch ke Bank Indonesia Hub'
            : data.rail === 'RTGS'
            ? 'Penyelesaian seketika dana bruto antarbank melalui rekening giro BI'
            : data.rail === 'SKNBI'
            ? 'Pengelompokan siklus transfer terjadwal Bank Indonesia'
            : 'Pengiriman switching real-time ATM Bersama / PRIMA / ALTO',
        networkEntity:
          data.rail === 'BI-FAST'
            ? 'Bank Indonesia Fast Central Hub'
            : data.rail === 'RTGS'
            ? 'Bank Indonesia RTGS Central Settlement'
            : data.rail === 'SKNBI'
            ? 'Bank Indonesia SKNBI Clearing House'
            : 'Jaringan PRIMA / ALTO Hub',
        status: 'processing',
        technicalCode:
          data.rail === 'BI-FAST'
            ? 'BIF_ACTC_ACCEPTED'
            : data.rail === 'RTGS'
            ? 'BI_RTGS_SETTLED_200'
            : data.rail === 'SKNBI'
            ? 'SKNBI_BATCH_QUEUED_100'
            : 'SWT_ONLINE_200'
      },
      {
        id: 'stage-3',
        title: `Kliring & Settlement ${data.destinationBank.shortName}`,
        subtitle: `Validasi ledger & posting mutasi kredit pada core banking ${data.destinationBank.name}`,
        networkEntity: `${data.destinationBank.name} Core Switch`,
        status: 'pending',
        technicalCode: 'CORE_POST_PENDING'
      },
      {
        id: 'stage-4',
        title: 'Dana Masuk Rekening Penerima',
        subtitle: `Dana efektif sebesar ${data.amount} IDR berhasil dikreditkan ke ${data.destinationAccountHolder}`,
        networkEntity: `${data.destinationBank.shortName} Endpoint`,
        status: 'pending',
        technicalCode: 'RC_00_SUCCESS'
      }
    ];

    const newTx: TransactionRecord = {
      id: txId,
      biFastRef,
      stan,
      date: now.toISOString(),
      timestamp: Date.now(),
      sourceAccount: {
        accountNumber: userAccount.accountNumber,
        accountHolder: userAccount.name,
        bankName: userAccount.bankName
      },
      destinationBank: data.destinationBank,
      destinationAccountNumber: data.destinationAccountNumber,
      destinationAccountHolder: data.destinationAccountHolder,
      amount: data.amount,
      fee: data.fee,
      total: totalDeduction,
      rail: data.rail,
      purpose: data.purpose,
      note: data.note || 'Transfer Dana Antar Bank',
      status: 'SWITCHING_NETWORK',
      currentStageIndex: 1,
      stages: initialStages,
      security: generateSecurityAudit(data.authMethod, riskEvaluation.riskScore)
    };

    // Deduct balance and increment used limit
    setBalance((prev) => prev - totalDeduction);
    setSecurityProfile((prev) => ({
      ...prev,
      usedTodayLimit: prev.usedTodayLimit + totalDeduction
    }));

    // Add transaction to state
    setTransactions((prev) => [newTx, ...prev]);
    setActiveTrackingTx(newTx);
    setIsTrackingModalOpen(true);

    // Auto update beneficiary transfer count or prompt
    if (isKnown) {
      setSavedBeneficiaries((prev) =>
        prev.map((b) =>
          b.bankId === data.destinationBank.id && b.accountNumber === data.destinationAccountNumber
            ? { ...b, transferCount: b.transferCount + 1, lastTransferDate: new Date().toISOString() }
            : b
        )
      );
    }

    // ASYNC REAL-TIME STAGE PROGRESSION SIMULATION
    // Stage 2 completion -> Move to Stage 3
    setTimeout(() => {
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id !== newTx.id) return tx;
          const updatedStages = [...tx.stages];
          updatedStages[1] = {
            ...updatedStages[1],
            status: 'completed',
            timestamp: formatDateWIB(new Date())
          };
          updatedStages[2] = {
            ...updatedStages[2],
            status: 'processing'
          };
          const updated = {
            ...tx,
            status: 'CLEARING_SETTLEMENT' as const,
            currentStageIndex: 2,
            stages: updatedStages
          };
          setActiveTrackingTx((current) => (current?.id === tx.id ? updated : current));
          return updated;
        })
      );
    }, 1100);

    // Stage 3 completion -> Move to Stage 4 (Completed)
    setTimeout(() => {
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id !== newTx.id) return tx;
          const updatedStages = [...tx.stages];
          updatedStages[2] = {
            ...updatedStages[2],
            status: 'completed',
            timestamp: formatDateWIB(new Date()),
            technicalCode: 'CORE_POST_SUCCESS'
          };
          updatedStages[3] = {
            ...updatedStages[3],
            status: 'completed',
            timestamp: formatDateWIB(new Date()),
            technicalCode: 'RC_00_SUCCESS'
          };
          const updated = {
            ...tx,
            status: 'COMPLETED' as const,
            currentStageIndex: 3,
            stages: updatedStages
          };
          setActiveTrackingTx((current) => (current?.id === tx.id ? updated : current));
          return updated;
        })
      );
    }, 2400);

    return newTx;
  };

  return (
    <BankingContext.Provider
      value={{
        activeTab,
        setActiveTab,
        userAccount,
        securityProfile,
        transactions,
        savedBeneficiaries,
        activeTrackingTx,
        isTrackingModalOpen,
        selectedReceiptTx,
        initiateTransfer,
        updateSecurityProfile,
        freezeAccount,
        unfreezeAccount,
        topUpBalance,
        addBeneficiary,
        removeBeneficiary,
        openTrackingFor,
        closeTracking,
        openReceipt,
        closeReceipt,
        findTransactionByRef
      }}
    >
      {children}
    </BankingContext.Provider>
  );
};

export const useBanking = () => {
  const context = useContext(BankingContext);
  if (!context) {
    throw new Error('useBanking must be used within a BankingProvider');
  }
  return context;
};
