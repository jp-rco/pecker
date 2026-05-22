import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus,
  Download, RefreshCw,
  Lightbulb, Activity, Zap, ClipboardList,
  Sparkles, Package, AlertTriangle, Coins, Boxes
} from "lucide-react";
import { motion } from "motion/react";
import * as XLSX from "xlsx";
import { AnalysisResult } from "../lib/types";
import { cn } from "../lib/utils";

interface DashboardProps {
  data: AnalysisResult | AnalysisResult[] | unknown;
  onReset: () => void;
}

type Trend = "up" | "down" | "neutral";
type Priority = "alta" | "media" | "baja";

interface DashboardMetric {
  label: string;
  value: string | number;
  trend?: Trend;
  description?: string;
}

interface InventoryRow {
  codigo?: string;
  materiaPrima: string;
  unidad?: string;
  stockActual: number;
  costoUnitarioCop?: number;
  valorTotalStock: number;
  consumoMensualPromedio: number;
  demandaProyectadaMes: number;
  cantidadAPedir: number;
  valorPedidoCop: number;
  coberturaMeses: number;
  brechaStock?: number;
  prioridad?: Priority;
  riesgo?: string;
}

interface CategoryRow {
  category: string;
  valorStock: number;
  items: number;
  porcentaje?: number;
}

interface RecommendationRow {
  title: string;
  description: string;
  priority: Priority;
  impact?: string;
  action?: string;
}

interface ReorderPlan {
  totalItemsToOrder: number;
  totalValueToOrder: number;
  items: Array<Partial<InventoryRow> & Record<string, unknown>>;
}

interface ExtendedAnalysisResult extends Omit<Partial<AnalysisResult>, "metrics" | "chartData"> {
  summary?: string;
  metrics?: DashboardMetric[];
  importantInsights?: string[];
  chartData?: Array<Partial<InventoryRow> & Record<string, unknown>>;
  categoryData?: CategoryRow[];
  topItems?: Array<Partial<InventoryRow> & Record<string, unknown>>;
  recommendations?: RecommendationRow[];
  reorderPlan?: ReorderPlan;
  metadata?: {
    fileName?: string;
    processedAt?: string;
    currency?: string;
    rowsAnalyzed?: number;
  };
}

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

const toNumber = (value: unknown, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;

  const cleaned = String(value)
    .replace(/\$/g, "")
    .replace(/COP/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toText = (value: unknown, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const round = (value: number, decimals = 2) => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(decimals));
};

const unwrapAnalysisData = (input: unknown): ExtendedAnalysisResult => {
  let current: unknown = input;

  // n8n often sends data as: [{ summary, metrics, chartData... }]
  if (Array.isArray(current)) {
    current = current[0] ?? {};
  }

  // Some backends wrap the result as { data: ... }
  if (
    current &&
    typeof current === "object" &&
    "data" in current &&
    (current as Record<string, unknown>).data
  ) {
    current = (current as Record<string, unknown>).data;
    if (Array.isArray(current)) current = current[0] ?? {};
  }

  // Some OpenAI/n8n nodes wrap valid JSON as { output: "{...}" }
  if (
    current &&
    typeof current === "object" &&
    "output" in current
  ) {
    const output = (current as Record<string, unknown>).output;

    if (typeof output === "string") {
      try {
        current = JSON.parse(
          output
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim()
        );
      } catch {
        current = {};
      }
    } else if (output && typeof output === "object") {
      current = output;
    }
  }

  if (!current || typeof current !== "object") return {};
  return current as ExtendedAnalysisResult;
};

const getPriorityFromCoverage = (coberturaMeses: number, cantidadAPedir: number): Priority => {
  if (coberturaMeses <= 1.15 || cantidadAPedir > 0) return "alta";
  if (coberturaMeses <= 1.3) return "media";
  return "baja";
};

const getRiskFromPriority = (priority: Priority) => {
  if (priority === "alta") return "Riesgo de quiebre";
  if (priority === "media") return "Monitorear";
  return "Controlado";
};

const formatMetricValue = (metric: DashboardMetric) => {
  if (typeof metric.value === "number") {
    const label = (metric.label || "").toLowerCase();
    if (label.includes("valor") || label.includes("cop") || label.includes("inventario")) {
      return currency.format(metric.value);
    }
    return number.format(metric.value);
  }

  return metric.value;
};

const getPriorityClass = (priority?: Priority) => {
  switch (priority) {
    case "alta": return "bg-red-100 text-red-700 border-red-200";
    case "media": return "bg-amber-100 text-amber-700 border-amber-200";
    default: return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
};

const getTrendIcon = (trend?: Trend) => {
  switch (trend) {
    case "up": return <TrendingUp className="text-emerald-500 w-4 h-4 ml-1" />;
    case "down": return <TrendingDown className="text-amber-500 w-4 h-4 ml-1" />;
    default: return <Minus className="text-stone-400 w-4 h-4 ml-1" />;
  }
};

const normalizeInventoryRows = (rows?: ExtendedAnalysisResult["chartData"]): InventoryRow[] => {
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((row) => row && (row.materiaPrima || row.name || row["Materia Prima"]))
    .map((row, index) => {
      const stockActual = toNumber(row.stockActual ?? row.stock ?? row["Stock Actual"]);
      const consumoMensualPromedio = toNumber(row.consumoMensualPromedio ?? row.consumo ?? row["Consumo Mensual Promedio"]);
      const demandaProyectadaMes = toNumber(row.demandaProyectadaMes ?? row.demanda ?? row["Demanda Proyectada (Mes)"]);
      const costoUnitarioCop = toNumber(row.costoUnitarioCop ?? row["Costo Unitario (COP)"]);
      const valorTotalStock = toNumber(
        row.valorTotalStock ?? row.valorStock ?? row["Valor Total Stock"],
        stockActual * costoUnitarioCop
      );
      const cantidadAPedir = toNumber(
        row.cantidadAPedir ?? row.cantidadPedir ?? row.cantidad ?? row["Cantidad a Pedir"],
        Math.max(demandaProyectadaMes - stockActual, 0)
      );
      const valorPedidoCop = toNumber(
        row.valorPedidoCop ?? row.valorPedido ?? row["Valor Pedido (COP)"],
        cantidadAPedir * costoUnitarioCop
      );
      const coberturaMeses = toNumber(
        row.coberturaMeses,
        consumoMensualPromedio ? stockActual / consumoMensualPromedio : 0
      );
      const brechaStock = toNumber(row.brechaStock, stockActual - demandaProyectadaMes);
      const calculatedPriority = getPriorityFromCoverage(coberturaMeses, cantidadAPedir);
      const prioridad = ["alta", "media", "baja"].includes(String(row.prioridad))
        ? (row.prioridad as Priority)
        : calculatedPriority;

      return {
        codigo: toText(row.codigo ?? row["Código"], `ITEM-${index + 1}`),
        materiaPrima: toText(row.materiaPrima ?? row.name ?? row["Materia Prima"], `Insumo ${index + 1}`),
        unidad: toText(row.unidad ?? row["Unidad"], "unidad"),
        stockActual: round(stockActual),
        costoUnitarioCop: round(costoUnitarioCop),
        valorTotalStock: round(valorTotalStock),
        consumoMensualPromedio: round(consumoMensualPromedio),
        demandaProyectadaMes: round(demandaProyectadaMes),
        cantidadAPedir: round(cantidadAPedir),
        valorPedidoCop: round(valorPedidoCop),
        coberturaMeses: round(coberturaMeses),
        brechaStock: round(brechaStock),
        prioridad,
        riesgo: toText(row.riesgo, getRiskFromPriority(prioridad)),
      };
    });
};

const buildCategoryData = (rows: InventoryRow[], categoryData?: CategoryRow[]) => {
  if (Array.isArray(categoryData) && categoryData.length > 0) return categoryData;

  const categories = rows.reduce<Record<string, CategoryRow>>((acc, row) => {
    const category = row.unidad || "Sin unidad";
    if (!acc[category]) acc[category] = { category, valorStock: 0, items: 0, porcentaje: 0 };
    acc[category].valorStock += row.valorTotalStock;
    acc[category].items += 1;
    return acc;
  }, {});

  const total = Object.values(categories).reduce((sum, item) => sum + item.valorStock, 0);

  return Object.values(categories).map((item) => ({
    ...item,
    valorStock: round(item.valorStock),
    porcentaje: total ? round((item.valorStock / total) * 100) : 0,
  }));
};

const normalizeRecommendations = (recommendations?: RecommendationRow[]) => {
  if (!Array.isArray(recommendations)) return [];

  return recommendations
    .filter((rec) => rec?.title && rec?.description)
    .map((rec) => ({
      ...rec,
      priority: ["alta", "media", "baja"].includes(String(rec.priority))
        ? rec.priority
        : "media",
    }));
};

const normalizeData = (rawInput: unknown) => {
  const input = unwrapAnalysisData(rawInput);
  const inventoryRows = normalizeInventoryRows(input.chartData);

  const totalStockValue = inventoryRows.reduce((sum, row) => sum + row.valorTotalStock, 0);
  const totalOrderValue = inventoryRows.reduce((sum, row) => sum + row.valorPedidoCop, 0);
  const averageCoverage = inventoryRows.length
    ? inventoryRows.reduce((sum, row) => sum + row.coberturaMeses, 0) / inventoryRows.length
    : 0;
  const alertItems = inventoryRows.filter((row) => row.prioridad === "alta" || row.coberturaMeses <= 1.15).length;
  const mediumItems = inventoryRows.filter((row) => row.prioridad === "media").length;

  const defaultMetrics: DashboardMetric[] = [
    {
      label: "Valor total inventario",
      value: totalStockValue,
      trend: "neutral",
      description: "Capital actual invertido en materias primas e insumos.",
    },
    {
      label: "Cobertura promedio",
      value: `${number.format(averageCoverage)} meses`,
      trend: averageCoverage >= 1.3 ? "up" : averageCoverage >= 1.15 ? "neutral" : "down",
      description: "Promedio de meses que cubre el stock actual frente al consumo mensual.",
    },
    {
      label: "Insumos en alerta",
      value: alertItems,
      trend: alertItems === 0 ? "up" : "down",
      description: "Ítems con cobertura crítica, baja cobertura o riesgo de quiebre.",
    },
  ];

  const defaultInsights = [
    alertItems > 0
      ? `Hay ${alertItems} insumo(s) en alerta que requieren revisión prioritaria.`
      : "No se detectan insumos con riesgo crítico inmediato.",
    mediumItems > 0
      ? `${mediumItems} insumo(s) presentan prioridad media y deben monitorearse en el siguiente ciclo.`
      : "No se detectan insumos en prioridad media.",
    `La cobertura promedio del inventario es de ${number.format(averageCoverage)} meses.`,
    `El valor total estimado del inventario es de ${currency.format(totalStockValue)}.`,
  ];

  const lowCoverage = [...inventoryRows]
    .sort((a, b) => a.coberturaMeses - b.coberturaMeses)
    .slice(0, 8);

  const topStockValue = [...inventoryRows]
    .sort((a, b) => b.valorTotalStock - a.valorTotalStock)
    .slice(0, 8);

  const reorderItems = inventoryRows.filter((row) => row.cantidadAPedir > 0);
  const alertButNoOrder = inventoryRows.filter((row) => row.prioridad === "alta" && row.cantidadAPedir === 0);

  const recommendations = normalizeRecommendations(input.recommendations);
  const fallbackRecommendations: RecommendationRow[] = alertButNoOrder.slice(0, 3).map((row) => ({
    title: `Revisar ${row.materiaPrima}`,
    description: `Este insumo tiene cobertura de ${number.format(row.coberturaMeses)} meses y debe monitorearse antes del siguiente ciclo.`,
    priority: row.prioridad || "alta",
    impact: "Alto",
    action: "Monitorear inventario, rotación y tiempos de reposición con proveedor.",
  }));

  return {
    summary: input.summary || "Análisis de inventario nutricional procesado correctamente. El panel consolida cobertura, valor de inventario, consumo promedio, demanda proyectada y prioridades de reposición.",
    metrics: input.metrics?.length ? input.metrics : defaultMetrics,
    inventoryRows,
    categoryData: buildCategoryData(inventoryRows, input.categoryData),
    lowCoverage,
    topStockValue,
    importantInsights: input.importantInsights?.length ? input.importantInsights : defaultInsights,
    recommendations: recommendations.length ? recommendations : fallbackRecommendations,
    reorderPlan: input.reorderPlan || {
      totalItemsToOrder: reorderItems.length,
      totalValueToOrder: totalOrderValue,
      items: reorderItems,
    },
    metadata: input.metadata,
    isEmpty: inventoryRows.length === 0,
  };
};

export default function Dashboard({ data, onReset }: DashboardProps) {
  const dashboard = normalizeData(data);

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();

    const resumenWs = XLSX.utils.json_to_sheet([
      { Campo: "Resumen ejecutivo", Valor: dashboard.summary },
      { Campo: "Archivo", Valor: dashboard.metadata?.fileName || "Archivo cargado por el usuario" },
      { Campo: "Procesado", Valor: dashboard.metadata?.processedAt || new Date().toISOString() },
      { Campo: "Valor pedido sugerido", Valor: dashboard.reorderPlan.totalValueToOrder },
      { Campo: "Ítems a pedir", Valor: dashboard.reorderPlan.totalItemsToOrder },
    ]);
    XLSX.utils.book_append_sheet(wb, resumenWs, "Resumen");

    const inventoryWs = XLSX.utils.json_to_sheet(dashboard.inventoryRows.map((row) => ({
      Codigo: row.codigo,
      MateriaPrima: row.materiaPrima,
      Unidad: row.unidad,
      StockActual: row.stockActual,
      CostoUnitarioCOP: row.costoUnitarioCop,
      ValorTotalStock: row.valorTotalStock,
      ConsumoMensualPromedio: row.consumoMensualPromedio,
      DemandaProyectadaMes: row.demandaProyectadaMes,
      CantidadAPedir: row.cantidadAPedir,
      ValorPedidoCOP: row.valorPedidoCop,
      CoberturaMeses: row.coberturaMeses,
      BrechaStock: row.brechaStock,
      Prioridad: row.prioridad,
      Riesgo: row.riesgo,
    })));
    XLSX.utils.book_append_sheet(wb, inventoryWs, "InventarioAnalizado");

    const insightsWs = XLSX.utils.json_to_sheet(dashboard.importantInsights.map((insight, index) => ({
      Numero: index + 1,
      Recomendacion: insight,
    })));
    XLSX.utils.book_append_sheet(wb, insightsWs, "Recomendaciones");

    XLSX.writeFile(wb, "Reporte_PeckerNutrition.xlsx");
  };

  if (dashboard.isEmpty) {
    return (
      <div className="glass-panel p-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <AlertTriangle className="mx-auto mb-4 text-natural-secondary" size={36} />
        <h2 className="text-2xl font-serif font-black text-natural-primary mb-2">
          No se encontraron datos para mostrar
        </h2>
        <p className="text-natural-gray-text mb-6">
          El análisis llegó vacío o con una estructura diferente. Revisa que el webhook entregue chartData directamente o dentro del primer elemento del arreglo.
        </p>
        <button
          onClick={onReset}
          className="bg-natural-primary hover:bg-[#1A3012] text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
        >
          Subir otro archivo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-8">
        <div>
          <span className="text-xs font-bold text-natural-primary uppercase tracking-[0.2em] mb-1 block">
            Panel de inventario nutricional
          </span>
          <h2 className="text-4xl font-serif font-black text-natural-primary">Resultados del Análisis</h2>
          {dashboard.metadata?.fileName && (
            <p className="text-sm text-natural-gray-text mt-2">Archivo procesado: {dashboard.metadata.fileName}</p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onReset}
            className="p-3 hover:bg-natural-muted rounded-xl transition-colors text-natural-gray-text"
            title="Nuevo Análisis"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 bg-natural-primary hover:bg-[#1A3012] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-natural-primary/10 transition-all active:scale-95"
          >
            <Download size={18} />
            <span>Descargar Reporte</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dashboard.metrics.map((metric, idx) => (
          <motion.div
            key={`${metric.label}-${idx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "glass-panel p-6",
              idx === 0 && "bg-[#2D4F1E] text-white border-none",
              idx === 2 && "bg-[#C16E3D] text-white border-none"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "p-2 rounded-lg border uppercase text-[10px] font-bold tracking-wider",
                (idx === 0 || idx === 2) ? "bg-white/10 border-white/20 text-white/80" : "bg-natural-subtle border-natural-border text-natural-light-text"
              )}>
                {metric.label}
              </div>
              {getTrendIcon(metric.trend)}
            </div>
            <div className="text-3xl font-bold font-serif italic">{formatMetricValue(metric)}</div>
            {metric.description && (
              <p className={cn("text-xs mt-3 leading-relaxed", (idx === 0 || idx === 2) ? "text-white/70" : "text-natural-gray-text")}>
                {metric.description}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-panel p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-serif font-bold text-natural-primary">Cobertura vs demanda proyectada</h3>
                <p className="text-sm text-natural-gray-text">
                  Lectura de stock actual, consumo promedio y demanda del mes por insumo
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#2D4F1E]" />
                  <span className="text-xs font-bold text-natural-gray-text">Stock</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#C16E3D]" />
                  <span className="text-xs font-bold text-natural-gray-text">Demanda</span>
                </div>
              </div>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.lowCoverage}>
                  <defs>
                    <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2D4F1E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2D4F1E" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDemanda" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C16E3D" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#C16E3D" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D9" />
                  <XAxis
                    dataKey="materiaPrima"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B665F', fontSize: 10 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B665F', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number | string, name: string) => [number.format(Number(value)), name]}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Area type="monotone" dataKey="stockActual" name="Stock actual" stroke="#2D4F1E" strokeWidth={3} fillOpacity={1} fill="url(#colorStock)" />
                  <Area type="monotone" dataKey="demandaProyectadaMes" name="Demanda proyectada" stroke="#C16E3D" strokeWidth={3} fillOpacity={1} fill="url(#colorDemanda)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-natural-primary text-white rounded-[32px] p-8 relative overflow-hidden shadow-md">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={120} /></div>
              <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-4 text-white/50">
                  <Lightbulb size={20} />
                  <span className="font-bold uppercase tracking-widest text-[10px]">Análisis de IA</span>
                </div>
                <h4 className="text-2xl font-serif font-bold mb-4">Resumen Ejecutivo</h4>
                <p className="text-white/80 leading-relaxed text-sm">{dashboard.summary}</p>
              </div>
            </div>

            <div className="glass-panel p-8">
              <div className="flex items-center space-x-2 mb-6">
                <ClipboardList className="text-natural-primary" size={20} />
                <h4 className="text-lg font-serif font-bold text-natural-primary">Acciones Prioritarias</h4>
              </div>

              <ul className="space-y-4">
                {dashboard.importantInsights.map((insight, i) => (
                  <li key={i} className="flex items-start space-x-3 group">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-natural-secondary shrink-0" />
                    <span className="text-natural-gray-text text-sm leading-relaxed group-hover:text-natural-primary transition-colors">
                      {insight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="glass-panel p-8 overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle className="text-natural-secondary" size={20} />
              <h4 className="text-lg font-serif font-bold text-natural-primary">Insumos con menor cobertura</h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-natural-light-text border-b border-natural-border">
                    <th className="py-3 pr-4">Código</th>
                    <th className="py-3 pr-4">Materia prima</th>
                    <th className="py-3 pr-4">Cobertura</th>
                    <th className="py-3 pr-4">Brecha</th>
                    <th className="py-3 pr-4">Prioridad</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.lowCoverage.map((row) => (
                    <tr key={`${row.codigo}-${row.materiaPrima}`} className="border-b border-natural-border/50 last:border-0">
                      <td className="py-3 pr-4 font-bold text-natural-primary">{row.codigo || "—"}</td>
                      <td className="py-3 pr-4 text-natural-gray-text">{row.materiaPrima}</td>
                      <td className="py-3 pr-4 text-natural-gray-text">{number.format(row.coberturaMeses)} meses</td>
                      <td className="py-3 pr-4 text-natural-gray-text">{number.format(row.brechaStock ?? 0)} {row.unidad}</td>
                      <td className="py-3 pr-4">
                        <span className={cn("px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase", getPriorityClass(row.prioridad))}>
                          {row.prioridad || "baja"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h4 className="font-serif font-bold text-natural-primary mb-6 flex items-center gap-2">
              <Coins size={18} className="text-natural-primary" /> Mayor valor en inventario
            </h4>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.topStockValue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8E2D9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="materiaPrima" type="category" width={120} axisLine={false} tickLine={false} tick={{fill: '#6B665F', fontSize: 10}} />
                  <Tooltip formatter={(value: number | string) => currency.format(Number(value))} cursor={{fill: '#F1EDE7'}} />
                  <Bar dataKey="valorTotalStock" radius={[0, 6, 6, 0]}>
                    {dashboard.topStockValue.map((entry, index) => (
                      <Cell key={`cell-${entry.codigo}-${index}`} fill={index === 0 ? '#2D4F1E' : index === 1 ? '#C16E3D' : '#E8E2D9'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h4 className="font-serif font-bold text-natural-primary mb-5 flex items-center gap-2">
              <Boxes size={18} className="text-natural-primary" /> Inventario por unidad
            </h4>

            <div className="space-y-4">
              {dashboard.categoryData.map((category) => (
                <div key={category.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-natural-primary">{category.category}</span>
                    <span className="text-natural-gray-text">{category.porcentaje ?? 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-natural-muted overflow-hidden">
                    <div
                      className="h-full bg-natural-primary rounded-full"
                      style={{ width: `${Math.min(category.porcentaje ?? 0, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-natural-light-text mt-1">
                    {category.items} ítems · {currency.format(category.valorStock)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="agri-gradient rounded-[32px] p-6 text-white text-center shadow-lg">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Sparkles className="text-white" />
            </div>
            <h5 className="font-serif font-bold text-lg mb-2">Plan de reposición</h5>
            <p className="text-white/70 text-xs mb-6">
              {dashboard.reorderPlan.totalItemsToOrder > 0
                ? `Hay ${dashboard.reorderPlan.totalItemsToOrder} insumos sugeridos para compra por ${currency.format(dashboard.reorderPlan.totalValueToOrder)}.`
                : "No hay faltantes directos frente a la demanda proyectada, pero conviene monitorear los insumos de menor cobertura."}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/10 rounded-xl py-3">
              <Package size={16} /> Revisión semanal sugerida
            </div>
          </div>

          {dashboard.recommendations.length > 0 && (
            <div className="glass-panel p-6">
              <h4 className="font-serif font-bold text-natural-primary mb-5 flex items-center gap-2">
                <Activity size={18} className="text-natural-primary" /> Recomendaciones IA
              </h4>
              <div className="space-y-3">
                {dashboard.recommendations.slice(0, 3).map((rec, index) => (
                  <div key={`${rec.title}-${index}`} className="p-3 rounded-2xl bg-natural-subtle border border-natural-border">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h5 className="font-bold text-natural-primary text-sm">{rec.title}</h5>
                      <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase", getPriorityClass(rec.priority))}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-xs text-natural-gray-text leading-relaxed">{rec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
