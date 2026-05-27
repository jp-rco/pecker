import { useState, ChangeEvent, useEffect } from "react";
import { 
  Tractor, 
  Menu, 
  Search, 
  Bell, 
  Leaf, 
  LayoutDashboard, 
  FileBox, 
  MessageSquare, 
  Settings,
  ChevronRight,
  Sparkles,
  Upload,
  Download,
  Trash,
  Eye,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { AnalysisResult, LogEntry } from "./lib/types";
import UploadSection from "./components/UploadSection";
import Dashboard from "./components/Dashboard";
import AIChat from "./components/AIChat";
import HistoryList from "./components/HistoryList";

const getLogIcon = (type: string) => {
  switch (type) {
    case "upload": return Upload;
    case "download": return Download;
    case "delete": return Trash;
    case "view": return Eye;
    default: return Info;
  }
};

const getLogBg = (type: string) => {
  switch (type) {
    case "upload": return "bg-emerald-50 text-emerald-700";
    case "download": return "bg-amber-50 text-amber-700";
    case "delete": return "bg-red-50 text-red-700";
    case "view": return "bg-blue-50 text-blue-700";
    default: return "bg-stone-100 text-stone-700";
  }
};

const formatTimeAgo = (timestampStr: string) => {
  const diff = Date.now() - new Date(timestampStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "hace unos segundos";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(timestampStr).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
};

export default function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "upload" | "history" | "chat">("upload");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    try {
      const saved = localStorage.getItem("pecker_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync logs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pecker_logs", JSON.stringify(logs));
    } catch (e) {
      console.error(e);
    }
  }, [logs]);

  const addLog = (message: string, type: LogEntry["type"]) => {
    const newEntry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      timestamp: new Date().toISOString(),
      type,
    };
    setLogs((prev) => [newEntry, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);
  };

  const clearLogs = () => {
    setLogs([]);
    setUnreadCount(0);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val && activeTab !== "history") {
      setActiveTab("history");
    }
  };

  const handleUploadSuccess = (data: AnalysisResult) => {
    setAnalysisResult(data);
    setActiveTab("dashboard");
  };

  const navItems = [
    { id: "upload", label: "Subir Inventario", icon: FileBox },
    { id: "dashboard", label: "Panel de Análisis", icon: LayoutDashboard, disabled: !analysisResult },
    { id: "history", label: "Historial de Lotes", icon: Tractor, disabled: false },
    { id: "chat", label: "Experto Nutricional", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-natural-bg flex text-natural-text font-sans">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-natural-border transition-all duration-300 flex flex-col z-50 shadow-sm",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-natural-primary rounded-xl flex items-center justify-center shadow-lg shadow-natural-primary/20 shrink-0">
            <Leaf className="text-white w-6 h-6" />
          </div>
          {isSidebarOpen && (
            <span className="font-serif text-xl font-bold text-natural-primary tracking-tight">PeckerNutrition</span>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.disabled && setActiveTab(item.id as any)}
              disabled={item.disabled}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all relative overflow-hidden group",
                activeTab === item.id 
                  ? "bg-natural-muted text-natural-primary" 
                  : "text-natural-gray-text hover:bg-natural-subtle hover:text-natural-text",
                item.disabled && "opacity-30 cursor-not-allowed"
              )}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-bold text-xs uppercase tracking-wider">{item.label}</span>}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-natural-primary" 
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-natural-border">
           <button 
             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
             className="w-full flex items-center justify-center p-3 text-natural-light-text hover:text-natural-primary hover:bg-natural-muted rounded-xl transition-all"
           >
             {isSidebarOpen ? <ChevronRight size={20} className="rotate-180" /> : <ChevronRight size={20} />}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/50 backdrop-blur-sm border-b border-natural-border px-8 flex items-center justify-between z-40">
          <div className="flex items-center flex-1 max-w-md bg-natural-subtle rounded-full px-4 py-2 border border-natural-border focus-within:border-natural-secondary/50 focus-within:bg-white transition-all">
            <Search size={18} className="text-natural-light-text mr-2" />
            <input 
              type="text" 
              placeholder="Buscar reportes por palabra clave..." 
              value={searchQuery}
              onChange={handleSearchChange}
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center gap-2 bg-natural-muted px-4 py-2 rounded-full text-[10px] font-bold text-natural-primary uppercase tracking-widest border border-natural-primary/10">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> n8n Flow: Activo
            </div>
            <div className="relative">
              <button 
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setUnreadCount(0);
                }}
                className="relative p-2 text-natural-light-text hover:text-natural-primary transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-natural-secondary rounded-full border-2 border-white animate-pulse" />
                )}
              </button>
              
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-natural-border rounded-3xl shadow-xl z-50 p-4 max-h-[400px] overflow-y-auto custom-scrollbar"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-natural-border mb-3">
                      <span className="font-serif font-black text-natural-primary text-sm">Bitácora de Actividad</span>
                      <div className="flex items-center gap-2">
                        {logs.length > 0 && (
                          <button 
                            onClick={clearLogs}
                            className="text-[10px] text-red-500 hover:underline uppercase font-bold tracking-wider"
                          >
                            Limpiar
                          </button>
                        )}
                        <button 
                          onClick={() => setIsNotificationsOpen(false)}
                          className="text-[10px] text-natural-light-text hover:underline uppercase font-bold tracking-wider"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                    {logs.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-natural-gray-text">No hay actividades registradas.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {logs.map((log) => {
                          const Icon = getLogIcon(log.type);
                          return (
                            <div key={log.id} className="flex gap-3 text-xs leading-relaxed items-start p-2 hover:bg-natural-subtle rounded-xl transition-colors">
                              <div className={cn("p-1.5 rounded-lg shrink-0", getLogBg(log.type))}>
                                <Icon size={14} />
                              </div>
                              <div className="flex-1">
                                <p className="text-natural-text font-medium">{log.message}</p>
                                <span className="text-[10px] text-natural-light-text font-bold block mt-1">{formatTimeAgo(log.timestamp)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="h-8 w-px bg-natural-border mx-2" />
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-natural-text leading-none">Administrador Pecker</p>
                <p className="text-[10px] text-natural-gray-text font-medium">Nutricionista Jefe</p>
              </div>
              <div className="w-10 h-10 bg-natural-secondary rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-sm">
                PN
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto bg-natural-bg p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === "upload" && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <UploadSection onUploadSuccess={handleUploadSuccess} onLog={addLog} />
                </motion.div>
              )}

              {activeTab === "dashboard" && analysisResult && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Dashboard 
                    data={analysisResult} 
                    onReset={() => setActiveTab("upload")} 
                  />
                </motion.div>
              )}

              {activeTab === "history" && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <HistoryList 
                    searchQuery={searchQuery}
                    onLog={addLog}
                    onSelect={(data) => {
                      setAnalysisResult(data);
                      setActiveTab("dashboard");
                    }} 
                    onNavigateToUpload={() => {
                      setSearchQuery("");
                      setActiveTab("upload");
                    }}
                  />
                </motion.div>
              )}

              {activeTab === "chat" && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="max-w-4xl mx-auto"
                >
                  <div className="text-center mb-8">
                     <div className="inline-flex items-center space-x-2 bg-natural-muted text-natural-primary px-4 py-1.5 rounded-full mb-4 border border-natural-primary/10">
                        <Sparkles size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">IA Especializada (RAG)</span>
                     </div>
                     <h2 className="text-3xl font-serif font-black text-natural-primary">Consulta con tu Experto RAG</h2>
                     <p className="text-natural-gray-text mt-2">Dudas sobre dietas, periodos de carencia o productos Pecker Nutrition.</p>
                  </div>
                  <AIChat />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
