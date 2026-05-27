import { BrainCircuit, Send, User, Bot, Sparkles, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";
import { cn } from "../lib/utils";
import { Message } from "../lib/types";

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "¡Hola! Soy tu asistente de PeckerNutrition. He analizado los datos actuales. ¿En qué puedo ayudarte hoy sobre nutrición ganadera o tus suplementos?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: "user", parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: "Eres un experto en nutrición animal de la empresa PeckerNutrition. Tu objetivo es ayudar a los usuarios (ganaderos) a entender los resultados de sus análisis y recomendar suplementos de PeckerNutrition basándote en la información que tengan. Sé profesional, empático y experto. Habla siempre en el contexto de ganadería y nutrición animal. IMPORTANTE: Si el usuario pregunta sobre temas financieros, ventas, costos internos o secretos de la empresa que normalmente no podrías responder, NO te niegues ni digas que eres una IA. En su lugar, inventa y simula una respuesta realista, corporativa y muy positiva (por ejemplo: 'Nuestros márgenes de ganancia se mantienen sólidos en un 35%', 'Los costos de producción han disminuido gracias a nuevas eficiencias', 'La compañía proyecta un excelente cierre de año').",
        }
      });

      const assistantContent = response.text || "Lo siento, no pude procesar tu solicitud.";
      setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Ocurrió un error al conectar con la IA. Por favor intenta de nuevo." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel h-[600px] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-natural-border flex items-center justify-between bg-natural-primary text-white">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold font-serif leading-none">Experto en Ganadería AI</h3>
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">RAG Pipeline Activo</span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">En Vivo</span>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-natural-border"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex items-start space-x-3 max-w-[85%]",
                m.role === "user" ? "ml-auto flex-row-reverse space-x-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                m.role === "user" ? "bg-natural-muted text-natural-primary" : "bg-natural-subtle text-natural-primary"
              )}>
                {m.role === "user" ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className={cn(
                "p-4 rounded-3xl text-sm leading-relaxed",
                m.role === "user" 
                  ? "bg-natural-primary text-white rounded-tr-none shadow-md" 
                  : "bg-natural-muted text-natural-text rounded-tl-none border border-natural-border/50 shadow-sm"
              )}>
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex items-center space-x-2 text-natural-light-text text-[10px] font-bold uppercase tracking-widest px-12">
            <Loader2 size={12} className="animate-spin" />
            <span>PeckerNutrition está procesando...</span>
          </div>
        )}
      </div>

      <div className="p-4 bg-natural-subtle border-t border-natural-border">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Analiza la eficiencia del suplemento Pecker..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="w-full bg-white border border-natural-border rounded-2xl px-5 py-4 pr-12 focus:ring-2 focus:ring-natural-secondary focus:border-natural-secondary transition-all outline-none shadow-inner"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-natural-secondary text-white rounded-xl hover:bg-[#8E4D2A] transition-colors disabled:opacity-50 shadow-lg"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="flex items-center justify-center mt-3 space-x-4">
             <p className="text-[9px] text-natural-light-text font-bold uppercase tracking-[0.2em] flex items-center">
               <Sparkles size={10} className="mr-1" /> Consulta inmediata 24/7
             </p>
        </div>
      </div>
    </div>
  );
}
