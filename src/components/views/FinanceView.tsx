import React, { useMemo, useState } from 'react';
import {
  Download,
  Edit3,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDayflow } from '../../context/DayflowContext';
import {
  exportTransactionsToCSV,
  formatCurrency,
  formatDateDisplay,
  getTodayISO,
} from '../../lib/formatters';
import { CurrencyCode, Transaction } from '../../types/dayflow';

const PIE_COLORS = ['#8B7CFF', '#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA'];

export function FinanceView() {
  const {
    profile,
    updateProfileSettings,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    budgets,
    upsertBudget,
    deleteBudget,
    savingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    pushToast,
  } = useDayflow();

  const today = getTodayISO();
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  // Transaction Modal
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [date, setDate] = useState(today);

  // Budget Modal
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetCat, setBudgetCat] = useState('Groceries');
  const [budgetLimit, setBudgetLimit] = useState('10000');

  // Savings Goal Modal
  const [savModalOpen, setSavModalOpen] = useState(false);
  const [savTitle, setSavTitle] = useState('');
  const [savTarget, setSavTarget] = useState('');
  const [savCurrent, setSavCurrent] = useState('0');
  const [savDate, setSavDate] = useState('');

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(selectedMonth)),
    [transactions, selectedMonth]
  );

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((t) => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (dateFrom && t.date < dateFrom) return false;
        if (dateTo && t.date > dateTo) return false;
        if (q) {
          return (
            t.category.toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q) ||
            t.paymentMethod.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, typeFilter, dateFrom, dateTo, search]);

  const summary = useMemo(() => {
    const income = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((a, b) => a + b.amount, 0);
    const expense = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((a, b) => a + b.amount, 0);
    const netSavings = income - expense;
    const monthBudgets = budgets.filter((b) => b.month === selectedMonth);
    const totalBudget = monthBudgets.reduce((a, b) => a + b.limit, 0);
    const utilization = totalBudget > 0 ? Math.round((expense / totalBudget) * 100) : 0;
    return { income, expense, netSavings, totalBudget, utilization };
  }, [monthTransactions, budgets, selectedMonth]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map.set(t.category, (map.get(t.category) || 0) + t.amount);
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  const monthlyTrendData = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expense: number }>();
    transactions.forEach((t) => {
      const m = t.date.slice(0, 7);
      const cur = map.get(m) || { month: m, income: 0, expense: 0 };
      if (t.type === 'income') cur.income += t.amount;
      else cur.expense += t.amount;
      map.set(m, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const openNewTx = () => {
    setEditingTx(null);
    setTxType('expense');
    setAmount('');
    setCategory('Groceries');
    setDescription('');
    setPaymentMethod('UPI');
    setDate(today);
    setTxModalOpen(true);
  };

  const openEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setTxType(tx.type);
    setAmount(String(tx.amount));
    setCategory(tx.category);
    setDescription(tx.description || '');
    setPaymentMethod(tx.paymentMethod);
    setDate(tx.date);
    setTxModalOpen(true);
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) {
      pushToast({ title: 'Enter a valid amount greater than zero', variant: 'warning' });
      return;
    }
    if (editingTx) {
      await updateTransaction(editingTx.id, {
        type: txType,
        amount: num,
        category,
        description,
        paymentMethod,
        date,
      });
      pushToast({ title: 'Transaction updated', variant: 'success' });
    } else {
      await addTransaction({
        type: txType,
        amount: num,
        category,
        description,
        paymentMethod,
        date,
      });
      pushToast({ title: 'Transaction recorded', variant: 'success' });
    }
    setTxModalOpen(false);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(budgetLimit);
    if (!num || num <= 0) return;
    await upsertBudget(budgetCat.trim() || 'General', selectedMonth, num);
    setBudgetModalOpen(false);
    pushToast({ title: 'Monthly budget saved', variant: 'success' });
  };

  const handleSaveSavingsGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(savTarget);
    const current = Number(savCurrent || 0);
    if (!savTitle.trim() || !target || target <= 0) return;
    await addSavingsGoal({
      title: savTitle.trim(),
      targetAmount: target,
      currentAmount: current,
      targetDate: savDate,
    });
    setSavTitle('');
    setSavTarget('');
    setSavCurrent('0');
    setSavModalOpen(false);
    pushToast({ title: 'Savings goal added', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Personal Finance Manager</h2>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
            Manual income, expenditure, monthly budgets, and savings goal tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Select month"
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29]"
          />
          <select
            value={profile.currency}
            onChange={(e) => updateProfileSettings({ currency: e.target.value as CurrencyCode })}
            aria-label="Currency preference"
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29]"
          >
            {(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'] as const).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setReportOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] text-xs font-medium cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Monthly Report
          </button>
          <button
            type="button"
            onClick={() => {
              exportTransactionsToCSV(filteredTransactions, profile.currency);
              pushToast({ title: 'Exported CSV', variant: 'success' });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] text-xs font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            type="button"
            onClick={openNewTx}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Monthly Income ({selectedMonth})</p>
          <p className="font-mono-tabular text-2xl font-bold text-emerald-500 dark:text-[#34D399] mt-1">
            {formatCurrency(summary.income, profile.currency)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Monthly Expenses</p>
          <p className="font-mono-tabular text-2xl font-bold mt-1">
            {formatCurrency(summary.expense, profile.currency)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Net Savings</p>
          <p
            className={`font-mono-tabular text-2xl font-bold mt-1 ${
              summary.netSavings >= 0 ? 'text-[#60A5FA]' : 'text-rose-500'
            }`}
          >
            {formatCurrency(summary.netSavings, profile.currency)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Budget Utilisation</p>
          <p className="font-mono-tabular text-2xl font-bold mt-1">
            {summary.totalBudget > 0 ? `${summary.utilization}%` : 'No Budget'}
          </p>
          {summary.totalBudget > 0 && (
            <p className="text-xs text-slate-400 mt-0.5 font-mono-tabular">
              of {formatCurrency(summary.totalBudget, profile.currency)}
            </p>
          )}
        </div>
      </div>

      {/* Monthly Report Panel */}
      {reportOpen && (
        <div className="rounded-xl border border-[#8B7CFF]/30 bg-white dark:bg-[#121620] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-base">
              Monthly Report · {selectedMonth}
            </h3>
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
            You recorded <strong className="font-mono-tabular text-slate-900 dark:text-white">{monthTransactions.length}</strong> transactions in {selectedMonth}, with{' '}
            <strong className="font-mono-tabular text-[#34D399]">{formatCurrency(summary.income, profile.currency)}</strong> in income and{' '}
            <strong className="font-mono-tabular text-slate-900 dark:text-white">{formatCurrency(summary.expense, profile.currency)}</strong> in expenses. Top spending category:{' '}
            <strong>{categoryBreakdown[0]?.name || 'N/A'}</strong>{' '}
            {categoryBreakdown[0] ? `(${formatCurrency(categoryBreakdown[0].value, profile.currency)})` : ''}.
          </p>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Income vs Expenditure</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Income', amount: summary.income },
                  { name: 'Expenses', amount: summary.expense },
                ]}
              >
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121620',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  <Cell fill="#34D399" />
                  <Cell fill="#8B7CFF" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Expense Distribution</h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-20 text-center">No expenses in {selectedMonth}</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {categoryBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121620',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Monthly Financial Trends</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121620',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="income" stroke="#34D399" fill="#34D399" fillOpacity={0.18} />
                <Area type="monotone" dataKey="expense" stroke="#8B7CFF" fill="#8B7CFF" fillOpacity={0.22} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Budgets & Savings Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-base">Monthly Budgets ({selectedMonth})</h3>
            <button
              type="button"
              onClick={() => setBudgetModalOpen(true)}
              className="text-xs font-medium text-[#8B7CFF] hover:underline cursor-pointer"
            >
              + Set Budget
            </button>
          </div>
          <div className="space-y-3">
            {budgets.filter((b) => b.month === selectedMonth).length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] py-6 text-center">
                No category budgets configured for {selectedMonth}.
              </p>
            ) : (
              budgets
                .filter((b) => b.month === selectedMonth)
                .map((b) => {
                  const spent = monthTransactions
                    .filter((t) => t.type === 'expense' && t.category === b.category)
                    .reduce((acc, t) => acc + t.amount, 0);
                  const pct = Math.min(100, Math.round((spent / b.limit) * 100));
                  return (
                    <div key={b.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{b.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular">
                            {formatCurrency(spent, profile.currency)} / {formatCurrency(b.limit, profile.currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteBudget(b.id)}
                            aria-label={`Delete budget ${b.category}`}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-[#121620] overflow-hidden">
                        <div
                          className={`h-full ${pct >= 90 ? 'bg-amber-500' : 'bg-[#8B7CFF]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-base">Savings Goals</h3>
            <button
              type="button"
              onClick={() => setSavModalOpen(true)}
              className="text-xs font-medium text-[#8B7CFF] hover:underline cursor-pointer"
            >
              + New Savings Goal
            </button>
          </div>
          <div className="space-y-3">
            {savingsGoals.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] py-6 text-center">
                No savings goals yet.
              </p>
            ) : (
              savingsGoals.map((sg) => {
                const pct = Math.min(100, Math.round((sg.currentAmount / sg.targetAmount) * 100));
                return (
                  <div key={sg.id} className="p-3 rounded-lg bg-slate-50 dark:bg-[#121620] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-sm">{sg.title}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateSavingsGoal(sg.id, {
                              currentAmount: sg.currentAmount + 1000,
                            })
                          }
                          className="px-2 py-0.5 rounded bg-[#34D399]/15 text-[#34D399] font-medium cursor-pointer"
                        >
                          +1,000
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSavingsGoal(sg.id)}
                          aria-label={`Delete ${sg.title}`}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8] font-mono-tabular">
                      <span>
                        {formatCurrency(sg.currentAmount, profile.currency)} /{' '}
                        {formatCurrency(sg.targetAmount, profile.currency)}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-[#0B0D12] overflow-hidden">
                      <div className="h-full bg-[#34D399]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h3 className="font-display font-semibold text-base">Transaction History</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Filter start date"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Filter end date"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/[0.06] text-xs text-slate-500 dark:text-[#94A3B8]">
                <th className="py-2.5 pr-4 font-medium">Date</th>
                <th className="py-2.5 px-3 font-medium">Category</th>
                <th className="py-2.5 px-3 font-medium">Description</th>
                <th className="py-2.5 px-3 font-medium">Method</th>
                <th className="py-2.5 px-3 font-medium text-right">Amount</th>
                <th className="py-2.5 pl-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-500">
                    No transactions match your filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono-tabular text-xs text-slate-500 dark:text-[#94A3B8] whitespace-nowrap">
                      {formatDateDisplay(tx.date, profile.dateFormat)}
                    </td>
                    <td className="py-3 px-3 font-medium">{tx.category}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-[#94A3B8] max-w-[240px] truncate">
                      {tx.description || '—'}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 dark:text-[#94A3B8]">
                      {tx.paymentMethod}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono-tabular font-semibold whitespace-nowrap ${
                        tx.type === 'income'
                          ? 'text-emerald-500 dark:text-[#34D399]'
                          : 'text-slate-900 dark:text-[#F8FAFC]'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount, profile.currency)}
                    </td>
                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditTx(tx)}
                        aria-label="Edit transaction"
                        className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteTransaction(tx.id);
                          pushToast({ title: 'Transaction deleted', variant: 'info' });
                        }}
                        aria-label="Delete transaction"
                        className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Transaction Modal */}
      {txModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">
                {editingTx ? 'Edit Transaction' : 'Record Transaction'}
              </h3>
              <button
                type="button"
                onClick={() => setTxModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTx} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Type
                  </label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as 'income' | 'expense')}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Amount ({profile.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] font-mono-tabular"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional note..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setTxModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-sm font-medium cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Budget Modal */}
      {budgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-6 shadow-2xl">
            <h3 className="font-display text-lg font-semibold mb-4">Set Category Budget</h3>
            <form onSubmit={handleSaveBudget} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={budgetCat}
                  onChange={(e) => setBudgetCat(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Monthly Limit ({profile.currency})
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] font-mono-tabular"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#8B7CFF] text-white text-sm font-medium cursor-pointer"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Savings Goal Modal */}
      {savModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-6 shadow-2xl">
            <h3 className="font-display text-lg font-semibold mb-4">New Savings Goal</h3>
            <form onSubmit={handleSaveSavingsGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  value={savTitle}
                  onChange={(e) => setSavTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Target Amount</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={savTarget}
                    onChange={(e) => setSavTarget(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Saved So Far</label>
                  <input
                    type="number"
                    min={0}
                    value={savCurrent}
                    onChange={(e) => setSavCurrent(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] font-mono-tabular"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Target Date</label>
                <input
                  type="date"
                  value={savDate}
                  onChange={(e) => setSavDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSavModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#8B7CFF] text-white text-sm font-medium cursor-pointer"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
