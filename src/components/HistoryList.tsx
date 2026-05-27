import { useEffect, useState } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { 
  FileSpreadsheet, 
  Calendar, 
  HardDrive, 
  Trash2, 
  Loader2, 
  ArrowRight, 
  Download, 
  AlertTriangle,
  Tractor,
  Boxes
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, storage } from "../lib/firebase";
import { SavedAnalysis } from "../lib/types";
import { cn } from "../lib/utils";

interface HistoryListProps {
  onSelect: (analysisResult: any) => void;
  onNavigateToUpload: () => void;
}

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

const formatBytes = (bytes: number, decimals = 2) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const formatDate = (dateInput: any) => {
  if (!dateInput) return "Fecha desconocida";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Fecha inválida";
  
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Simple data unwrapper helper to extract basic metrics for the preview
const getPreviewMetrics = (rawResult: any) => {
  let current = rawResult;
  if (Array.isArray(current)) current = current[0];
  if (current && current.data) current = current.data;
  if (current && Array.isArray(current)) current = current[0];
  
  if (current && typeof current === "object" && current.output && typeof current.output === "string") {
    try {
      current = JSON.parse(current.output.replace(/```json/gi, "").replace(/```/g, "").trim());
    } catch {
      // ignore
    }
  }

  // Get raw items to calculate
  const chartData = current?.chartData || [];
  
  const toNumber = (val: any) => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "number") return val;
    const clean = String(val).replace(/[$.]/g, "").replace(/,/g, ".");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  let totalValue = 0;
  let alertItemsCount = 0;
  let itemsCount = 0;

  if (Array.isArray(chartData)) {
    itemsCount = chartData.length;
    chartData.forEach((row: any) => {
      if (!row) return;
      const stock = toNumber(row.stockActual ?? row.stock ?? row["Stock Actual"]);
      const cost = toNumber(row.costoUnitarioCop ?? row["Costo Unitario (COP)"]);
      const value = toNumber(row.valorTotalStock ?? row.valorStock ?? row["Valor Total Stock"]);
      totalValue += value || (stock * cost);

      const coverage = toNumber(row.coberturaMeses);
      const isHighPriority = row.prioridad === "alta" || (coverage > 0 && coverage <= 1.15);
      if (isHighPriority) alertItemsCount++;
    });
  }

  // If metrics list already exists, prefer its values
  if (current?.metrics && Array.isArray(current.metrics)) {
    const valMetric = current.metrics.find((m: any) => m.label?.toLowerCase().includes("valor"));
    const alertMetric = current.metrics.find((m: any) => m.label?.toLowerCase().includes("alerta") || m.label?.toLowerCase().includes("riesgo"));
    
    if (valMetric) {
      if (typeof valMetric.value === "number") totalValue = valMetric.value;
      else {
        const parsed = toNumber(valMetric.value);
        if (parsed > 0) totalValue = parsed;
      }
    }
    if (alertMetric) {
      const parsed = parseInt(String(alertMetric.value));
      if (!isNaN(parsed)) alertItemsCount = parsed;
    }
  }

  return {
    totalValue,
    alertItemsCount,
    itemsCount
  };
};

export default function HistoryList({ onSelect, onNavigateToUpload }: HistoryListProps) {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let querySnapshot;
      try {
        const q = query(collection(db, "analyses"), orderBy("uploadedAt", "desc"));
        querySnapshot = await getDocs(q);
      } catch (qErr) {
        console.warn("Ordered query failed, fetching all and sorting client-side", qErr);
        querySnapshot = await getDocs(collection(db, "analyses"));
      }

      const list: SavedAnalysis[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as SavedAnalysis);
      });

      // Sort client-side in case firestore index failed or wasn't used
      list.sort((a, b) => {
        const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return dateB - dateA;
      });

      setAnalyses(list);
    } catch (err: any) {
      console.error("Error fetching history:", err);
      setError("No se pudo cargar el historial de lotes. " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (item: SavedAnalysis) => {
    if (item.fileBase64) {
      try {
        const link = document.createElement("a");
        link.href = item.fileBase64;
        link.download = item.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err: any) {
        alert("Error al descargar el archivo guardado en la base de datos: " + err.message);
      }
    } else if (item.fileUrl) {
      window.open(item.fileUrl, "_blank");
    } else {
      alert("El archivo físico no está disponible para descarga, pero puedes visualizar su tablero.");
    }
  };

  const handleDelete = async (id: string, fileUrl?: string | null) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este lote del historial? Esta acción no se puede deshacer.")) {
      return;
    }

    setIsDeleting(id);
    try {
      // 1. Delete from Firestore
      await deleteDoc(doc(db, "analyses", id));

      // 2. Delete from Firebase Storage if URL is present and looks like a Firebase Storage ref
      if (fileUrl && fileUrl.includes("firebasestorage")) {
        try {
          const fileRef = ref(storage, fileUrl);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn("Storage deletion failed or file already deleted", storageErr);
        }
      }

      setAnalyses(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      console.error("Error deleting analysis:", err);
      alert("No se pudo eliminar el registro. " + (err.message || ""));
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-natural-primary mb-4" />
        <p className="text-natural-gray-text text-sm font-medium">Cargando historial de lotes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-10 text-center border-red-100 max-w-2xl mx-auto">
        <AlertTriangle className="mx-auto mb-4 text-red-500" size={36} />
        <h3 className="text-xl font-serif font-black text-natural-primary mb-2">Error de Conexión</h3>
        <p className="text-red-500/80 text-sm mb-6">{error}</p>
        <button
          onClick={fetchHistory}
          className="bg-natural-primary hover:bg-[#1A3012] text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 text-xs uppercase tracking-wider"
        >
          Reintentar Cargar
        </button>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="glass-panel p-12 text-center max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-16 h-16 bg-natural-muted text-natural-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Tractor size={28} />
        </div>
        <h3 className="text-2xl font-serif font-black text-natural-primary mb-2">Historial Vacío</h3>
        <p className="text-natural-gray-text text-sm mb-8 leading-relaxed max-w-md mx-auto">
          Aún no has analizado ni guardado ningún lote de inventario nutricional. Sube tu primer archivo Excel para comenzar el seguimiento.
        </p>
        <button
          onClick={onNavigateToUpload}
          className="bg-natural-secondary hover:bg-[#A65B30] text-white px-8 py-3.5 rounded-full font-bold transition-all active:scale-95 shadow-lg shadow-natural-secondary/20 text-sm uppercase tracking-wider"
        >
          Subir Inventario Nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <span className="text-xs font-bold text-natural-primary uppercase tracking-[0.2em] mb-1 block">
            Historial de operaciones
          </span>
          <h2 className="text-3xl font-serif font-black text-natural-primary">Historial de Lotes</h2>
          <p className="text-sm text-natural-gray-text mt-1">
            Consulta y descarga análisis anteriores almacenados en Firestore.
          </p>
        </div>
        
        <button 
          onClick={fetchHistory}
          className="text-xs font-bold uppercase tracking-widest bg-white border border-natural-border text-natural-gray-text hover:bg-natural-muted px-4 py-2.5 rounded-xl transition-all"
        >
          Sincronizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {analyses.map((item, idx) => {
            const preview = getPreviewMetrics(item.analysisResult);
            const isItemDeleting = isDeleting === item.id;
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-panel overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow group border border-natural-border/60"
              >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-natural-border/40 flex-1">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="w-10 h-10 bg-natural-muted text-natural-primary rounded-xl flex items-center justify-center shrink-0">
                      <FileSpreadsheet size={20} />
                    </div>
                    
                    <button
                      onClick={() => handleDelete(item.id, item.fileUrl)}
                      disabled={isItemDeleting}
                      className="p-2 text-natural-light-text hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
                      title="Eliminar lote"
                    >
                      {isItemDeleting ? (
                        <Loader2 size={16} className="animate-spin text-red-500" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>

                  <h3 className="font-serif font-black text-lg text-natural-primary line-clamp-2 leading-tight group-hover:text-natural-secondary transition-colors" title={item.fileName}>
                    {item.fileName}
                  </h3>

                  {/* Metadata */}
                  <div className="mt-4 space-y-2 text-xs text-natural-gray-text">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-natural-light-text" />
                      <span>{formatDate(item.uploadedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive size={14} className="text-natural-light-text" />
                      <span>{formatBytes(item.fileSize)}</span>
                    </div>
                  </div>

                  {/* Metrics preview */}
                  <div className="mt-6 grid grid-cols-2 gap-3 pt-4 border-t border-natural-border/30">
                    <div className="bg-natural-subtle p-3 rounded-2xl border border-natural-border/30">
                      <p className="text-[9px] font-bold text-natural-light-text uppercase tracking-wider">Valor Inventario</p>
                      <p className="font-serif font-black text-sm text-natural-primary mt-1">
                        {preview.totalValue > 0 ? currency.format(preview.totalValue) : "—"}
                      </p>
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl border border-natural-border/30",
                      preview.alertItemsCount > 0 ? "bg-amber-50/50 border-amber-100" : "bg-natural-subtle"
                    )}>
                      <p className="text-[9px] font-bold text-natural-light-text uppercase tracking-wider">Items en Alerta</p>
                      <p className={cn(
                        "font-serif font-black text-sm mt-1",
                        preview.alertItemsCount > 0 ? "text-[#C16E3D]" : "text-natural-primary"
                      )}>
                        {preview.alertItemsCount} {preview.alertItemsCount === 1 ? "ítem" : "ítems"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-natural-subtle/50 border-t border-natural-border/40 flex gap-2">
                  <button
                    onClick={() => onSelect(item.analysisResult)}
                    className="flex-1 flex items-center justify-center gap-2 bg-natural-primary hover:bg-[#1A3012] text-white py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                  >
                    <span>Ver Tablero</span>
                    <ArrowRight size={14} />
                  </button>
                  
                  <button
                    onClick={() => handleDownload(item)}
                    className="p-2.5 bg-white border border-natural-border text-natural-gray-text hover:bg-natural-muted rounded-xl transition-all active:scale-95"
                    title="Descargar excel original"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
