import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, 
  ArrowRight, Download, RefreshCw, 
  Lightbulb, Activity, Zap, ClipboardList,
  ChevronRight, Sparkles
} from "lucide-react";
import { motion } from "motion/react";
import * as XLSX from "xlsx";
import { AnalysisResult } from "../lib/types";
import { cn } from "../lib/utils";

interface DashboardProps {
  data: AnalysisResult;
  onReset: () => void;
}

export default function Dashboard({ data, onReset }: DashboardProps) {
  
  const handleDownload = () => {
    const ws = XLSX.utils.json_to_sheet(data.chartData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AnalisisNutricional");
    
    // Add insights as another sheet
    const insightsWs = XLSX.utils.json_to_sheet(data.importantInsights.map(i => ({ Recomendacion: i })));
    XLSX.utils.book_append_sheet(wb, insightsWs, "Recomendaciones");
    
    XLSX.writeFile(wb, "Reporte_PeckerNutrition.xlsx");
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="text-emerald-500 w-4 h-4 ml-1" />;
      case "down": return <TrendingDown className="text-amber-500 w-4 h-4 ml-1" />;
      default: return <Minus className="text-stone-400 w-4 h-4 ml-1" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-8">
        <div>
          <span className="text-xs font-bold text-natural-primary uppercase tracking-[0.2em] mb-1 block">Panel en Tiempo Real</span>
          <h2 className="text-4xl font-serif font-black text-natural-primary">Resultados del Análisis</h2>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.metrics.map((metric, idx) => (
          <motion.div 
            key={idx}
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
            <div className="text-3xl font-bold font-serif italic">
              {metric.value}
              {metric.label.includes('Salud') && '%'}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-panel p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-serif font-bold text-natural-primary">Histórico de Nutrientes</h3>
                <p className="text-sm text-natural-gray-text">Balance nutricional por mes</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#2D4F1E]" />
                  <span className="text-xs font-bold text-natural-gray-text">Proteína</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#C16E3D]" />
                  <span className="text-xs font-bold text-natural-gray-text">Energía</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chartData}>
                  <defs>
                    <linearGradient id="colorProteina" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2D4F1E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2D4F1E" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEnergia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C16E3D" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#C16E3D" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#6B665F', fontSize: 12}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#6B665F', fontSize: 12}}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Area type="monotone" dataKey="proteina" stroke="#2D4F1E" strokeWidth={3} fillOpacity={1} fill="url(#colorProteina)" />
                  <Area type="monotone" dataKey="energia" stroke="#C16E3D" strokeWidth={3} fillOpacity={1} fill="url(#colorEnergia)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-natural-primary text-white rounded-[32px] p-8 relative overflow-hidden shadow-md">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap size={120} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center space-x-2 mb-4 text-white/50">
                        <Lightbulb size={20} />
                        <span className="font-bold uppercase tracking-widest text-[10px]">Análisis de IA</span>
                    </div>
                    <h4 className="text-2xl font-serif font-bold mb-4">Resumen Ejecutivo</h4>
                    <p className="text-white/80 leading-relaxed text-sm">
                        {data.summary}
                    </p>
                </div>
            </div>

            <div className="glass-panel p-8">
                <div className="flex items-center space-x-2 mb-6">
                    <ClipboardList className="text-natural-primary" size={20} />
                    <h4 className="text-lg font-serif font-bold text-natural-primary">Acciones Prioritarias</h4>
                </div>
                <ul className="space-y-4">
                    {data.importantInsights.map((insight, i) => (
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
        </div>

        {/* Sidebar Mini Charts & Info */}
        <div className="space-y-6">
            <div className="glass-panel p-6">
                <h4 className="font-serif font-bold text-natural-primary mb-6 flex items-center gap-2">
                    <Activity size={18} className="text-natural-primary" /> Salud del Lote A vs B
                </h4>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.chartData.slice(0, 3)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D9" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B665F', fontSize: 10}} />
                            <Tooltip cursor={{fill: '#F1EDE7'}} />
                            <Bar dataKey="salud" radius={[6, 6, 0, 0]}>
                                {data.chartData.slice(0, 3).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 2 ? '#C16E3D' : '#E8E2D9'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="agri-gradient rounded-[32px] p-6 text-white text-center shadow-lg">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                    <Sparkles className="text-white" />
                </div>
                <h5 className="font-serif font-bold text-lg mb-2">Mejora tu Producción</h5>
                <p className="text-white/70 text-xs mb-6">
                    Basado en tus datos, recomendamos el Suplemento Pecker-Max Pro para el siguiente ciclo.
                </p>
                <button className="w-full bg-natural-secondary text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#8E4D2A] transition-colors shadow-lg">
                    Ver Catálogo Pecker
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
