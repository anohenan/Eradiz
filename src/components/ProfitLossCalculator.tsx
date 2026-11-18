import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import type { RecordUsageInput } from "../services/userCreditsService";
import type { ProductLedgerRow } from "../types/eradiz";

const PNL_STORAGE_KEY = "eradiz_pnl_products_v1";

const DEFAULT_TEN_PRODUCTS: ProductLedgerRow[] = [
  {
    id: "p-1",
    name: "Sneakers Air Pulse",
    quantity: 18,
    costPriceUsd: 14.0,
    adAndFeesUsd: 4.5,
    salePriceUsd: 34.99,
  },
  {
    id: "p-2",
    name: "Montre Chronographe Acier",
    quantity: 12,
    costPriceUsd: 19.5,
    adAndFeesUsd: 5.0,
    salePriceUsd: 49.0,
  },
  {
    id: "p-3",
    name: "Écouteurs Sans Fil Pro",
    quantity: 25,
    costPriceUsd: 9.0,
    adAndFeesUsd: 6.2,
    salePriceUsd: 14.0,
  },
  {
    id: "p-4",
    name: "Sac à Main Cuir Minimal",
    quantity: 10,
    costPriceUsd: 22.0,
    adAndFeesUsd: 5.5,
    salePriceUsd: 54.0,
  },
  {
    id: "p-5",
    name: "Sérum Éclat Vitamine C",
    quantity: 30,
    costPriceUsd: 4.2,
    adAndFeesUsd: 3.1,
    salePriceUsd: 19.9,
  },
  {
    id: "p-6",
    name: "Lampe LED Bureau Pliable",
    quantity: 14,
    costPriceUsd: 11.0,
    adAndFeesUsd: 7.5,
    salePriceUsd: 16.5,
  },
  {
    id: "p-7",
    name: "Ensemble Sport Femme",
    quantity: 16,
    costPriceUsd: 12.5,
    adAndFeesUsd: 4.0,
    salePriceUsd: 32.0,
  },
  {
    id: "p-8",
    name: "Lunettes Polarisées UV400",
    quantity: 22,
    costPriceUsd: 3.8,
    adAndFeesUsd: 2.9,
    salePriceUsd: 18.0,
  },
  {
    id: "p-9",
    name: "Diffuseur d'Huiles Zen",
    quantity: 9,
    costPriceUsd: 13.0,
    adAndFeesUsd: 4.2,
    salePriceUsd: 29.0,
  },
  {
    id: "p-10",
    name: "Coque Magnétique Kevlar",
    quantity: 40,
    costPriceUsd: 2.5,
    adAndFeesUsd: 2.1,
    salePriceUsd: 12.9,
  },
];

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatUsd(value: number): string {
  return usdFormatter.format(value);
}

function formatSignedUsd(value: number): string {
  if (value > 0) return `+${usdFormatter.format(value)}`;
  if (value < 0) return `-${usdFormatter.format(Math.abs(value))}`;
  return usdFormatter.format(0);
}

function loadSavedRows(): ProductLedgerRow[] {
  if (typeof window === "undefined") return DEFAULT_TEN_PRODUCTS;
  try {
    const raw = window.localStorage.getItem(PNL_STORAGE_KEY);
    if (!raw) return DEFAULT_TEN_PRODUCTS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_TEN_PRODUCTS;
    }
    return parsed.map((row, idx) => ({
      id: typeof row.id === "string" ? row.id : `p-${idx + 1}`,
      name: typeof row.name === "string" ? row.name : `Produit ${idx + 1}`,
      quantity: Math.max(0, Number(row.quantity) || 0),
      costPriceUsd: Math.max(0, Number(row.costPriceUsd) || 0),
      adAndFeesUsd: Math.max(0, Number(row.adAndFeesUsd) || 0),
      salePriceUsd: Math.max(0, Number(row.salePriceUsd) || 0),
    }));
  } catch {
    return DEFAULT_TEN_PRODUCTS;
  }
}

interface ProfitLossCalculatorProps {
  studioProductTitle?: string | null;
  studioProductPriceText?: string;
  onRecordUsage?: (usage: RecordUsageInput) => void;
}

type FilterMode = "all" | "profit" | "loss";

function parseUsdFromText(text?: string): number {
  if (!text) return 25;
  const cleaned = text.replace(/[^0-9.,]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
}

export function ProfitLossCalculator({
  studioProductTitle,
  studioProductPriceText,
  onRecordUsage,
}: ProfitLossCalculatorProps) {
  const [rows, setRows] = useState<ProductLedgerRow[]>(loadSavedRows);
  const [filter, setFilter] = useState<FilterMode>("all");

  useEffect(() => {
    try {
      window.localStorage.setItem(PNL_STORAGE_KEY, JSON.stringify(rows));
    } catch {
      // Ignore storage quota errors
    }
  }, [rows]);

  const computedRows = useMemo(() => {
    return rows.map((row) => {
      const unitPurchaseAndFees = row.costPriceUsd + row.adAndFeesUsd;
      const totalCost = unitPurchaseAndFees * row.quantity;
      const totalRevenue = row.salePriceUsd * row.quantity;
      const netProfit = totalRevenue - totalCost;
      const marginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      return {
        ...row,
        totalCost,
        totalRevenue,
        netProfit,
        marginPct,
      };
    });
  }, [rows]);

  const summary = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfitsOnly = 0;
    let totalLossesOnly = 0;
    let totalUnits = 0;
    let winningCount = 0;
    let losingCount = 0;

    for (const r of computedRows) {
      totalRevenue += r.totalRevenue;
      totalCost += r.totalCost;
      totalUnits += r.quantity;
      if (r.netProfit >= 0) {
        totalProfitsOnly += r.netProfit;
        winningCount += 1;
      } else {
        totalLossesOnly += Math.abs(r.netProfit);
        losingCount += 1;
      }
    }

    const netGlobal = totalRevenue - totalCost;
    const globalMarginPct =
      totalRevenue > 0 ? (netGlobal / totalRevenue) * 100 : 0;
    const roiPct = totalCost > 0 ? (netGlobal / totalCost) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfitsOnly,
      totalLossesOnly,
      netGlobal,
      globalMarginPct,
      roiPct,
      totalUnits,
      winningCount,
      losingCount,
    };
  }, [computedRows]);

  const visibleRows = useMemo(() => {
    if (filter === "profit") {
      return computedRows.filter((r) => r.netProfit >= 0);
    }
    if (filter === "loss") {
      return computedRows.filter((r) => r.netProfit < 0);
    }
    return computedRows;
  }, [computedRows, filter]);

  const updateRowField = (
    id: string,
    field: keyof Omit<ProductLedgerRow, "id">,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === "name") {
          return { ...row, name: value };
        }
        const numeric = Math.max(0, Number.parseFloat(value) || 0);
        return {
          ...row,
          [field]: field === "quantity" ? Math.round(numeric) : numeric,
        };
      })
    );
  };

  const addProducts = (count: number) => {
    const startIndex = rows.length;
    const created: ProductLedgerRow[] = Array.from({ length: count }, (_, i) => ({
      id: `p-${Date.now()}-${i}`,
      name: `Nouveau Produit ${startIndex + i + 1}`,
      quantity: 10,
      costPriceUsd: 10.0,
      adAndFeesUsd: 3.5,
      salePriceUsd: 24.99,
    }));
    setRows((prev) => [...prev, ...created]);
    setFilter("all");
    onRecordUsage?.({
      actionType: "calculator_session",
      title: `Calculateur P&L (+${count} ${count > 1 ? "produits" : "produit"})`,
      details: `${rows.length + count} produits suivis en USD`,
    });
  };

  const addStudioProduct = () => {
    if (!studioProductTitle) return;
    const salePrice = parseUsdFromText(studioProductPriceText);
    const estCost = Number((salePrice * 0.42).toFixed(2));
    const estFees = Number((salePrice * 0.16).toFixed(2));
    setRows((prev) => [
      {
        id: `studio-${Date.now()}`,
        name: studioProductTitle,
        quantity: 15,
        costPriceUsd: estCost,
        adAndFeesUsd: estFees,
        salePriceUsd: salePrice,
      },
      ...prev,
    ]);
    setFilter("all");
    onRecordUsage?.({
      actionType: "calculator_session",
      title: `Import P&L · ${studioProductTitle}`,
      details: `Prix cible $${salePrice.toFixed(2)} USD`,
    });
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const resetDefaults = () => {
    setRows(DEFAULT_TEN_PRODUCTS);
    setFilter("all");
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      {/* En-tête */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Calculateur Financier USD
          </p>
          <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Pertes &amp; Bénéfices sur {rows.length} produits
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            Analysez instantanément vos coûts d’achat, frais publicitaires et
            revenus en dollars américains (USD) sur 10 produits et plus pour
            repérer vos articles déficitaires et maximiser votre marge nette.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {studioProductTitle && (
            <button
              type="button"
              onClick={addStudioProduct}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Importer « {studioProductTitle} »</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => addProducts(1)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Ajouter 1 produit</span>
          </button>
          <button
            type="button"
            onClick={() => addProducts(5)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>+5 produits</span>
          </button>
          <button
            type="button"
            onClick={resetDefaults}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Réinitialiser (10)</span>
          </button>
        </div>
      </div>

      {/* 4 KPI de synthèse */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-500">
            Chiffre d’affaires total
          </p>
          <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatUsd(summary.totalRevenue)}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
            {summary.totalUnits} unités · {rows.length} produits
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-500">
            Coûts totaux (Achats + Pub/Livraison)
          </p>
          <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatUsd(summary.totalCost)}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
            Achats marchandises + publicité &amp; livraison
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
          <p className="text-xs font-semibold text-rose-700">
            Pertes cumulées (articles déficitaires)
          </p>
          <p className="mt-2 font-display text-2xl font-extrabold text-rose-700 tabular-nums">
            -{formatUsd(summary.totalLossesOnly)}
          </p>
          <p className="mt-1 font-mono text-xs text-rose-600 tabular-nums">
            {summary.losingCount}{" "}
            {summary.losingCount > 1 ? "produits en perte" : "produit en perte"}
          </p>
        </div>

        <div
          className={`rounded-2xl border p-5 ${
            summary.netGlobal >= 0
              ? "border-emerald-200 bg-emerald-50/50"
              : "border-rose-300 bg-rose-50"
          }`}
        >
          <p
            className={`text-xs font-semibold ${
              summary.netGlobal >= 0 ? "text-emerald-800" : "text-rose-800"
            }`}
          >
            Bénéfice Net Global (Profits − Pertes)
          </p>
          <p
            className={`mt-2 font-display text-2xl font-extrabold tabular-nums ${
              summary.netGlobal >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {formatSignedUsd(summary.netGlobal)}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
            Marge : {summary.globalMarginPct.toFixed(1)}% · ROI :{" "}
            {summary.roiPct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Barre de filtres et option Eradiz */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Filtrer les produits par rentabilité"
          className="inline-flex items-center rounded-xl bg-slate-100 p-1 self-start"
        >
          {(
            [
              {
                id: "all",
                label: `Tous (${rows.length})`,
                activeText: "text-slate-900",
              },
              {
                id: "profit",
                label: `En bénéfice (${summary.winningCount})`,
                activeText: "text-emerald-700",
              },
              {
                id: "loss",
                label: `En perte (${summary.losingCount})`,
                activeText: "text-rose-700",
              },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`relative min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active ? tab.activeText : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="pnl-filter-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    className="absolute inset-0 rounded-lg bg-white shadow-xs"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Tableau Desktop (10+ produits) */}
      <div className="mt-5 hidden lg:block overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 pl-4 pr-2 w-10">#</th>
              <th className="py-3 px-2">Produit</th>
              <th className="py-3 px-2 text-right w-24">Qté</th>
              <th className="py-3 px-2 text-right w-32">Coût achat ($)</th>
              <th className="py-3 px-2 text-right w-32">Pub / Liv. ($)</th>
              <th className="py-3 px-2 text-right w-32">Prix vente ($)</th>
              <th className="py-3 px-2 text-right">Coût total</th>
              <th className="py-3 px-2 text-right">Revenu</th>
              <th className="py-3 px-2 text-right">Perte / Bénéfice</th>
              <th className="py-3 pl-2 pr-4 text-right w-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-10 text-center text-sm text-slate-500"
                >
                  Aucun produit dans cette catégorie.
                </td>
              </tr>
            ) : (
              visibleRows.map((row, idx) => {
                const isProfit = row.netProfit >= 0;
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-2.5 pl-4 pr-2 font-mono text-xs text-slate-400 tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) =>
                          updateRowField(row.id, "name", e.target.value)
                        }
                        aria-label={`Nom du produit ${idx + 1}`}
                        className="w-full min-w-[160px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={row.quantity}
                        onChange={(e) =>
                          updateRowField(row.id, "quantity", e.target.value)
                        }
                        aria-label={`Quantité ${row.name}`}
                        className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right font-mono text-sm tabular-nums text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={row.costPriceUsd}
                        onChange={(e) =>
                          updateRowField(row.id, "costPriceUsd", e.target.value)
                        }
                        aria-label={`Coût d'achat USD ${row.name}`}
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right font-mono text-sm tabular-nums text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={row.adAndFeesUsd}
                        onChange={(e) =>
                          updateRowField(row.id, "adAndFeesUsd", e.target.value)
                        }
                        aria-label={`Frais et pub USD ${row.name}`}
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right font-mono text-sm tabular-nums text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={row.salePriceUsd}
                        onChange={(e) =>
                          updateRowField(row.id, "salePriceUsd", e.target.value)
                        }
                        aria-label={`Prix de vente USD ${row.name}`}
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right font-mono text-sm font-semibold tabular-nums text-slate-900 focus:border-indigo-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatUsd(row.totalCost)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatUsd(row.totalRevenue)}
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">
                      <div
                        className={`inline-flex items-center justify-end gap-1 font-mono text-sm font-bold tabular-nums ${
                          isProfit ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {isProfit ? (
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>{formatSignedUsd(row.netProfit)}</span>
                      </div>
                      <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                        {isProfit ? "Bénéfice" : "Perte"} ·{" "}
                        {row.marginPct.toFixed(1)}%
                      </p>
                    </td>
                    <td className="py-2.5 pl-2 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length <= 1}
                        aria-label={`Supprimer ${row.name}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cartes Mobile (sans débordement horizontal) */}
      <div className="mt-5 space-y-3 lg:hidden">
        {visibleRows.map((row, idx) => {
          const isProfit = row.netProfit >= 0;
          return (
            <div
              key={row.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) =>
                      updateRowField(row.id, "name", e.target.value)
                    }
                    aria-label={`Nom du produit ${idx + 1}`}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= 1}
                  aria-label={`Supprimer ${row.name}`}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <label className="block">
                  <span className="text-[11px] font-medium text-slate-500">
                    Quantité
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={row.quantity}
                    onChange={(e) =>
                      updateRowField(row.id, "quantity", e.target.value)
                    }
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-sm tabular-nums text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-medium text-slate-500">
                    Achat ($ USD)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={row.costPriceUsd}
                    onChange={(e) =>
                      updateRowField(row.id, "costPriceUsd", e.target.value)
                    }
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-sm tabular-nums text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-medium text-slate-500">
                    Pub / Liv. ($ USD)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={row.adAndFeesUsd}
                    onChange={(e) =>
                      updateRowField(row.id, "adAndFeesUsd", e.target.value)
                    }
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-sm tabular-nums text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-medium text-slate-500">
                    Vente ($ USD)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={row.salePriceUsd}
                    onChange={(e) =>
                      updateRowField(row.id, "salePriceUsd", e.target.value)
                    }
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-sm font-semibold tabular-nums text-slate-900"
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="font-mono text-slate-500 tabular-nums">
                  CA : {formatUsd(row.totalRevenue)} · Coût :{" "}
                  {formatUsd(row.totalCost)}
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums ${
                    isProfit ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {isProfit ? (
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {isProfit ? "Bénéfice" : "Perte"} :{" "}
                  {formatSignedUsd(row.netProfit)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
