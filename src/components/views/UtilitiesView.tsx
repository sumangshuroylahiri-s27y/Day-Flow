import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, RefreshCw, Download } from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { DocumentUtilitiesPanel } from './utilities/DocumentUtilitiesPanel';

type UtilityTab = 'calculators' | 'text' | 'converters' | 'everyday' | 'documents';

const LENGTH_TO_M: Record<string, number> = {
  m: 1,
  km: 1000,
  cm: 0.01,
  mm: 0.001,
  mi: 1609.344,
  yd: 0.9144,
  ft: 0.3048,
  in: 0.0254,
};

const WEIGHT_TO_KG: Record<string, number> = {
  kg: 1,
  g: 0.001,
  mg: 0.000001,
  lb: 0.45359237,
  oz: 0.0283495231,
  ton: 1000,
};

const DATA_TO_BYTES: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
};

const TIME_TO_SEC: Record<string, number> = {
  sec: 1,
  min: 60,
  hr: 3600,
  day: 86400,
  week: 604800,
};

export function UtilitiesView() {
  const { pushToast } = useDayflow();
  const [tab, setTab] = useState<UtilityTab>('calculators');

  // === 1. CALCULATORS ===
  const [stdExpr, setStdExpr] = useState('');
  const [stdRes, setStdRes] = useState('0');
  const [pctX, setPctX] = useState('15');
  const [pctY, setPctY] = useState('2000');
  const [discPrice, setDiscPrice] = useState('1999');
  const [discRate, setDiscRate] = useState('25');
  const [gstBase, setGstBase] = useState('10000');
  const [gstRate, setGstRate] = useState('18');
  const [gstMode, setGstMode] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [loanP, setLoanP] = useState('500000');
  const [loanRate, setLoanRate] = useState('8.5');
  const [loanMonths, setLoanMonths] = useState('60');

  const evalStdExpr = (expr: string) => {
    const safe = expr.replace(/[^0-9+\-*/().% ]/g, '');
    if (!safe.trim()) {
      setStdRes('0');
      return;
    }
    try {
      const fn = new Function(`return (${safe});`);
      const out = fn();
      setStdRes(Number.isFinite(out) ? String(Number(out.toFixed(6))) : 'Error');
    } catch {
      setStdRes('Error');
    }
  };

  const emiStats = useMemo(() => {
    const P = Number(loanP) || 0;
    const annual = Number(loanRate) || 0;
    const n = Math.max(1, Number(loanMonths) || 1);
    const r = annual / 12 / 100;
    if (P <= 0) return { emi: 0, totalInterest: 0, totalPayable: 0 };
    if (r === 0) return { emi: P / n, totalInterest: 0, totalPayable: P };
    const pow = Math.pow(1 + r, n);
    const emi = (P * r * pow) / (pow - 1);
    const totalPayable = emi * n;
    return { emi, totalInterest: totalPayable - P, totalPayable };
  }, [loanP, loanRate, loanMonths]);

  // === 2. TEXT TOOLS ===
  const [textInput, setTextInput] = useState(
    'DAYFLOW keeps your schedule, finances, and everyday utilities in one workspace.\nDAYFLOW keeps your schedule, finances, and everyday utilities in one workspace.'
  );
  const [findStr, setFindStr] = useState('');
  const [replaceStr, setReplaceStr] = useState('');

  const textStats = useMemo(() => {
    const words = textInput.trim() ? textInput.trim().split(/\s+/).length : 0;
    const chars = textInput.length;
    const charsNoSpaces = textInput.replace(/\s/g, '').length;
    const lines = textInput ? textInput.split('\n').length : 0;
    return { words, chars, charsNoSpaces, lines };
  }, [textInput]);

  // === 3. CONVERTERS ===
  const [convKind, setConvKind] = useState<'length' | 'weight' | 'temp' | 'data' | 'time'>('length');
  const [convVal, setConvVal] = useState('1');
  const [convFrom, setConvFrom] = useState('km');
  const [convTo, setConvTo] = useState('mi');

  const convUnits: Record<'length' | 'weight' | 'temp' | 'data' | 'time', string[]> = {
    length: Object.keys(LENGTH_TO_M),
    weight: Object.keys(WEIGHT_TO_KG),
    temp: ['C', 'F', 'K'],
    data: Object.keys(DATA_TO_BYTES),
    time: Object.keys(TIME_TO_SEC),
  };

  const convertedOutput = useMemo(() => {
    const v = Number(convVal);
    if (!Number.isFinite(v)) return '—';
    if (convKind === 'temp') {
      let c = v;
      if (convFrom === 'F') c = (v - 32) * (5 / 9);
      if (convFrom === 'K') c = v - 273.15;
      if (convTo === 'C') return c.toFixed(2);
      if (convTo === 'F') return (c * (9 / 5) + 32).toFixed(2);
      return (c + 273.15).toFixed(2);
    }
    const table =
      convKind === 'length'
        ? LENGTH_TO_M
        : convKind === 'weight'
        ? WEIGHT_TO_KG
        : convKind === 'data'
        ? DATA_TO_BYTES
        : TIME_TO_SEC;
    const base = v * (table[convFrom] || 1);
    return (base / (table[convTo] || 1)).toFixed(4).replace(/\.?0+$/, '');
  }, [convKind, convVal, convFrom, convTo]);

  // Live Currency Converter
  const [curAmount, setCurAmount] = useState('1000');
  const [curFrom, setCurFrom] = useState('INR');
  const [curTo, setCurTo] = useState('USD');
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesError, setRatesError] = useState('');

  useEffect(() => {
    if (tab !== 'converters') return;
    fetch(`/api/rates?base=${encodeURIComponent(curFrom)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Rates unavailable'))))
      .then((d) => {
        setRates(d.rates || null);
        setRatesError('');
      })
      .catch(() => setRatesError('Live currency rates unavailable offline.'));
  }, [tab, curFrom]);

  // === 4. EVERYDAY TOOLS ===
  // QR Code
  const [qrText, setQrText] = useState('https://dayflow.app');
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (tab !== 'everyday' || !qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, qrText || ' ', {
      width: 168,
      margin: 2,
      color: { dark: '#0B0D12', light: '#FFFFFF' },
    }).catch(() => {});
  }, [tab, qrText]);

  // Password Generator
  const [pwLen, setPwLen] = useState(16);
  const [pwUpper, setPwUpper] = useState(true);
  const [pwNums, setPwNums] = useState(true);
  const [pwSyms, setPwSyms] = useState(true);
  const [generatedPw, setGeneratedPw] = useState('');

  const generatePassword = () => {
    let charset = 'abcdefghijklmnopqrstuvwxyz';
    if (pwUpper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (pwNums) charset += '0123456789';
    if (pwSyms) charset += '!@#$%^&*()-_=+[]{}';
    const arr = new Uint32Array(pwLen);
    crypto.getRandomValues(arr);
    const out = Array.from(arr, (x) => charset[x % charset.length]).join('');
    setGeneratedPw(out);
  };

  useEffect(() => {
    if (!generatedPw) generatePassword();
  }, []);

  // Countdown Timer
  const [cdMinutes, setCdMinutes] = useState(5);
  const [cdSecondsLeft, setCdSecondsLeft] = useState(300);
  const [cdRunning, setCdRunning] = useState(false);

  useEffect(() => {
    if (!cdRunning) return;
    const t = window.setInterval(() => {
      setCdSecondsLeft((prev) => {
        if (prev <= 1) {
          setCdRunning(false);
          pushToast({ title: 'Countdown timer finished!', variant: 'success' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [cdRunning, pushToast]);

  // World Clock & Timezone
  const [worldTick, setWorldTick] = useState(() => new Date());
  const [tzFrom, setTzFrom] = useState('Asia/Kolkata');
  const [tzTo, setTzTo] = useState('America/New_York');
  const [tzTimeInput, setTzTimeInput] = useState('15:00');
  useEffect(() => {
    if (tab !== 'everyday') return;
    const t = window.setInterval(() => setWorldTick(new Date()), 1000);
    return () => window.clearInterval(t);
  }, [tab]);

  // Date & Age Calculator
  const [dateA, setDateA] = useState('2026-01-01');
  const [dateB, setDateB] = useState('2026-11-17');
  const [birthDate, setBirthDate] = useState('1998-06-15');

  const dateDiffDays = useMemo(() => {
    const a = new Date(dateA).getTime();
    const b = new Date(dateB).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return 0;
    return Math.round(Math.abs(b - a) / 86400000);
  }, [dateA, dateB]);

  const ageResult = useMemo(() => {
    const dob = new Date(birthDate);
    const now = new Date();
    if (Number.isNaN(dob.getTime())) return '—';
    let years = now.getFullYear() - dob.getFullYear();
    let months = now.getMonth() - dob.getMonth();
    let days = now.getDate() - dob.getDate();
    if (days < 0) {
      months--;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years} yrs, ${months} mos, ${days} days`;
  }, [birthDate]);

  const convertedTzString = useMemo(() => {
    try {
      const [h, m] = tzTimeInput.split(':').map(Number);
      const now = new Date();
      const baseStr = now.toLocaleString('en-US', { timeZone: tzFrom });
      const baseDate = new Date(baseStr);
      const offsetMs = now.getTime() - baseDate.getTime();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0);
      const utc = new Date(target.getTime() + offsetMs);
      return utc.toLocaleTimeString([], {
        timeZone: tzTo,
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
      });
    } catch {
      return '—';
    }
  }, [tzFrom, tzTo, tzTimeInput]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#121620] border border-slate-200 dark:border-white/[0.06] w-fit">
        {(
          [
            ['calculators', 'Calculators'],
            ['text', 'Text Tools'],
            ['converters', 'Converters'],
            ['everyday', 'QR, Password & Clocks'],
            ['documents', 'PDF & Document Tools'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              tab === id
                ? 'bg-white dark:bg-[#171D29] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-[#94A3B8]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: CALCULATORS */}
      {tab === 'calculators' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {/* Standard Calculator */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-3">
            <h3 className="font-display font-semibold text-base">Standard Calculator</h3>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#121620] text-right">
              <input
                type="text"
                value={stdExpr}
                onChange={(e) => {
                  setStdExpr(e.target.value);
                  evalStdExpr(e.target.value);
                }}
                placeholder="0"
                className="w-full bg-transparent text-right text-xs text-slate-400 font-mono-tabular focus:outline-none"
              />
              <p className="font-mono-tabular text-2xl font-bold mt-1">{stdRes}</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', 'C', '+'].map(
                (btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => {
                      if (btn === 'C') {
                        setStdExpr('');
                        setStdRes('0');
                      } else {
                        const next = stdExpr + btn;
                        setStdExpr(next);
                        evalStdExpr(next);
                      }
                    }}
                    className="py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] hover:bg-[#8B7CFF]/15 font-mono-tabular text-sm font-medium cursor-pointer"
                  >
                    {btn}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => evalStdExpr(stdExpr)}
                className="col-span-4 py-2 rounded-lg bg-[#8B7CFF] text-white text-sm font-medium cursor-pointer"
              >
                = Evaluate
              </button>
            </div>
          </div>

          {/* Percentage & Discount */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-5">
            <div className="space-y-2.5">
              <h3 className="font-display font-semibold text-base">Percentage Calculator</h3>
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="number"
                  value={pctX}
                  onChange={(e) => setPctX(e.target.value)}
                  className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                />
                <span>% of</span>
                <input
                  type="number"
                  value={pctY}
                  onChange={(e) => setPctY(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                />
              </div>
              <p className="font-mono-tabular text-lg font-bold text-[#8B7CFF]">
                Result: {(((Number(pctX) || 0) / 100) * (Number(pctY) || 0)).toFixed(2)}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-2.5">
              <h3 className="font-display font-semibold text-base">Discount Calculator</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-slate-400">Original Price</label>
                  <input
                    type="number"
                    value={discPrice}
                    onChange={(e) => setDiscPrice(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Discount (%)</label>
                  <input
                    type="number"
                    value={discRate}
                    onChange={(e) => setDiscRate(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                  />
                </div>
              </div>
              <p className="font-mono-tabular text-sm">
                Final Price:{' '}
                <strong className="text-[#34D399]">
                  {((Number(discPrice) || 0) * (1 - (Number(discRate) || 0) / 100)).toFixed(2)}
                </strong>{' '}
                (Save {(((Number(discPrice) || 0) * (Number(discRate) || 0)) / 100).toFixed(2)})
              </p>
            </div>
          </div>

          {/* GST & EMI / Loan Interest */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-base">GST Calculator</h3>
                <select
                  value={gstMode}
                  onChange={(e) => setGstMode(e.target.value as 'exclusive' | 'inclusive')}
                  className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
                >
                  <option value="exclusive">Add GST</option>
                  <option value="inclusive">Remove GST</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="number"
                  value={gstBase}
                  onChange={(e) => setGstBase(e.target.value)}
                  placeholder="Amount"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                />
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                >
                  {['5', '12', '18', '28'].map((r) => (
                    <option key={r} value={r}>
                      {r}% GST
                    </option>
                  ))}
                </select>
              </div>
              {(() => {
                const amt = Number(gstBase) || 0;
                const r = Number(gstRate) || 0;
                const gst = gstMode === 'exclusive' ? (amt * r) / 100 : amt - amt / (1 + r / 100);
                const total = gstMode === 'exclusive' ? amt + gst : amt;
                return (
                  <p className="font-mono-tabular text-xs text-slate-600 dark:text-[#94A3B8]">
                    GST: <strong>{gst.toFixed(2)}</strong> · Total: <strong className="text-[#60A5FA]">{total.toFixed(2)}</strong>
                  </p>
                );
              })()}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-2.5">
              <h3 className="font-display font-semibold text-base">EMI & Loan Interest</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-slate-400">Principal</label>
                  <input
                    type="number"
                    value={loanP}
                    onChange={(e) => setLoanP(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={loanRate}
                    onChange={(e) => setLoanRate(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Months</label>
                  <input
                    type="number"
                    value={loanMonths}
                    onChange={(e) => setLoanMonths(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                  />
                </div>
              </div>
              <div className="text-xs space-y-1 font-mono-tabular">
                <p>
                  Monthly EMI: <strong className="text-[#8B7CFF]">{emiStats.emi.toFixed(2)}</strong>
                </p>
                <p>Total Interest: {emiStats.totalInterest.toFixed(2)}</p>
                <p>Total Payable: {emiStats.totalPayable.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEXT TOOLS */}
      {tab === 'text' && (
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display font-semibold text-base">Text Analyzer & Formatter</h3>
            <div className="flex flex-wrap gap-4 text-xs font-mono-tabular text-slate-500 dark:text-[#94A3B8]">
              <span>Words: <strong>{textStats.words}</strong></span>
              <span>Chars: <strong>{textStats.chars}</strong></span>
              <span>No spaces: <strong>{textStats.charsNoSpaces}</strong></span>
              <span>Lines: <strong>{textStats.lines}</strong></span>
            </div>
          </div>

          <textarea
            rows={7}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="w-full p-3 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
          />

          <div className="flex flex-wrap gap-2">
            {[
              ['UPPERCASE', () => setTextInput(textInput.toUpperCase())],
              ['lowercase', () => setTextInput(textInput.toLowerCase())],
              [
                'Title Case',
                () =>
                  setTextInput(
                    textInput.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
                  ),
              ],
              [
                'Remove Duplicate Lines',
                () => setTextInput(Array.from(new Set(textInput.split('\n'))).join('\n')),
              ],
              [
                'Clean Extra Spaces',
                () =>
                  setTextInput(
                    textInput
                      .split('\n')
                      .map((l) => l.trim().replace(/\s+/g, ' '))
                      .filter(Boolean)
                      .join('\n')
                  ),
              ],
              [
                'Sort Lines A–Z',
                () => setTextInput(textInput.split('\n').sort((a, b) => a.localeCompare(b)).join('\n')),
              ],
            ].map(([label, fn]) => (
              <button
                key={label as string}
                type="button"
                onClick={fn as () => void}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] hover:border-[#8B7CFF] text-xs font-medium cursor-pointer"
              >
                {label as string}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(textInput);
                pushToast({ title: 'Copied text to clipboard', variant: 'success' });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B7CFF] text-white text-xs font-medium cursor-pointer ml-auto"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={findStr}
              onChange={(e) => setFindStr(e.target.value)}
              placeholder="Find..."
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
            />
            <input
              type="text"
              value={replaceStr}
              onChange={(e) => setReplaceStr(e.target.value)}
              placeholder="Replace with..."
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
            />
            <button
              type="button"
              onClick={() => {
                if (!findStr) return;
                setTextInput(textInput.split(findStr).join(replaceStr));
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white/10 text-white text-xs font-medium cursor-pointer"
            >
              Replace All
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CONVERTERS */}
      {tab === 'converters' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-4">
            <h3 className="font-display font-semibold text-base">Unit Converter</h3>
            <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#121620]">
              {(
                [
                  ['length', 'Length'],
                  ['weight', 'Weight'],
                  ['temp', 'Temperature'],
                  ['data', 'Data'],
                  ['time', 'Time'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setConvKind(k);
                    setConvFrom(convUnits[k][0]);
                    setConvTo(convUnits[k][1] || convUnits[k][0]);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                    convKind === k
                      ? 'bg-white dark:bg-[#171D29] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Value</label>
                <input
                  type="number"
                  value={convVal}
                  onChange={(e) => setConvVal(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">From</label>
                <select
                  value={convFrom}
                  onChange={(e) => setConvFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
                >
                  {convUnits[convKind].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">To</label>
                <select
                  value={convTo}
                  onChange={(e) => setConvTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
                >
                  {convUnits[convKind].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="font-mono-tabular text-2xl font-bold text-[#8B7CFF]">
              {convVal || 0} {convFrom} = {convertedOutput} {convTo}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-4">
            <h3 className="font-display font-semibold text-base">Live Currency Converter</h3>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                value={curAmount}
                onChange={(e) => setCurAmount(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
              />
              <select
                value={curFrom}
                onChange={(e) => setCurFrom(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
              >
                {['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={curTo}
                onChange={(e) => setCurTo(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
              >
                {['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {ratesError ? (
              <p className="text-xs text-amber-500">{ratesError}</p>
            ) : rates && rates[curTo] ? (
              <p className="font-mono-tabular text-2xl font-bold text-[#34D399]">
                {curAmount} {curFrom} = {((Number(curAmount) || 0) * rates[curTo]).toFixed(2)} {curTo}
              </p>
            ) : (
              <p className="text-xs text-slate-400">Loading live exchange rate...</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: QR, PASSWORD, COUNTDOWN, WORLD CLOCK, DATE & AGE */}
      {tab === 'everyday' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {/* QR Code Generator */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-3">
            <h3 className="font-display font-semibold text-base">QR Code Generator</h3>
            <input
              type="text"
              value={qrText}
              onChange={(e) => setQrText(e.target.value)}
              placeholder="Enter URL or text..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
            />
            <div className="flex justify-center py-2">
              <canvas ref={qrCanvasRef} className="rounded-lg border border-slate-200 dark:border-white/10" />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!qrCanvasRef.current) return;
                const a = document.createElement('a');
                a.href = qrCanvasRef.current.toDataURL('image/png');
                a.download = 'dayflow-qr.png';
                a.click();
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#8B7CFF] text-white text-xs font-medium cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download QR PNG
            </button>
          </div>

          {/* Password Generator */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-3">
            <h3 className="font-display font-semibold text-base">Password Generator</h3>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#121620] flex items-center justify-between gap-2">
              <code className="font-mono text-xs break-all">{generatedPw}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPw);
                  pushToast({ title: 'Password copied', variant: 'success' });
                }}
                className="text-slate-400 hover:text-[#8B7CFF] cursor-pointer shrink-0"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs space-y-2">
              <label className="flex items-center justify-between">
                <span>Length: {pwLen}</span>
                <input
                  type="range"
                  min={8}
                  max={40}
                  value={pwLen}
                  onChange={(e) => setPwLen(Number(e.target.value))}
                  className="accent-[#8B7CFF]"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={pwUpper} onChange={(e) => setPwUpper(e.target.checked)} /> Uppercase
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={pwNums} onChange={(e) => setPwNums(e.target.checked)} /> Numbers
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={pwSyms} onChange={(e) => setPwSyms(e.target.checked)} /> Symbols
                </label>
              </div>
            </div>
            <button
              type="button"
              onClick={generatePassword}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#8B7CFF] text-white text-xs font-medium cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Generate New
            </button>
          </div>

          {/* Countdown Timer */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-3">
            <h3 className="font-display font-semibold text-base">Countdown Timer</h3>
            <p className="font-mono-tabular text-4xl font-bold text-center py-3">
              {String(Math.floor(cdSecondsLeft / 60)).padStart(2, '0')}:
              {String(cdSecondsLeft % 60).padStart(2, '0')}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="number"
                min={1}
                max={240}
                value={cdMinutes}
                onChange={(e) => {
                  const m = Math.max(1, Number(e.target.value) || 1);
                  setCdMinutes(m);
                  if (!cdRunning) setCdSecondsLeft(m * 60);
                }}
                className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
              />
              <span>minutes</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCdRunning((r) => !r)}
                className="flex-1 py-2 rounded-lg bg-[#8B7CFF] text-white text-xs font-medium cursor-pointer"
              >
                {cdRunning ? 'Pause' : 'Start'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCdRunning(false);
                  setCdSecondsLeft(cdMinutes * 60);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* World Clock & Timezone Converter */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-3 md:col-span-2">
            <h3 className="font-display font-semibold text-base">World Clock & Time Zone Converter</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                ['Bengaluru', 'Asia/Kolkata'],
                ['London', 'Europe/London'],
                ['New York', 'America/New_York'],
                ['Tokyo', 'Asia/Tokyo'],
              ].map(([city, tz]) => (
                <div key={city} className="p-3 rounded-lg bg-slate-50 dark:bg-[#121620]">
                  <p className="text-slate-500 dark:text-[#94A3B8]">{city}</p>
                  <p className="font-mono-tabular text-base font-semibold mt-0.5">
                    {worldTick.toLocaleTimeString([], { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <input
                type="time"
                value={tzTimeInput}
                onChange={(e) => setTzTimeInput(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
              />
              <select
                value={tzFrom}
                onChange={(e) => setTzFrom(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
              >
                {['Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo', 'UTC'].map(
                  (tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  )
                )}
              </select>
              <span>→</span>
              <select
                value={tzTo}
                onChange={(e) => setTzTo(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
              >
                {['America/New_York', 'Asia/Kolkata', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo', 'UTC'].map(
                  (tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  )
                )}
              </select>
              <span className="font-mono-tabular font-semibold text-[#8B7CFF] ml-2">
                {convertedTzString}
              </span>
            </div>
          </div>

          {/* Date & Age Calculator */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-4">
            <div>
              <h3 className="font-display font-semibold text-base mb-2">Date Difference</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="date"
                  value={dateA}
                  onChange={(e) => setDateA(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
                />
                <input
                  type="date"
                  value={dateB}
                  onChange={(e) => setDateB(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
                />
              </div>
              <p className="font-mono-tabular text-sm font-semibold text-[#60A5FA] mt-2">
                {dateDiffDays} days ({(dateDiffDays / 7).toFixed(1)} weeks)
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-white/10">
              <h3 className="font-display font-semibold text-base mb-2">Age Calculator</h3>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
              />
              <p className="font-mono-tabular text-sm font-semibold text-[#34D399] mt-2">
                {ageResult}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DOCUMENT & PDF UTILITIES */}
      {tab === 'documents' && <DocumentUtilitiesPanel />}
    </div>
  );
}
