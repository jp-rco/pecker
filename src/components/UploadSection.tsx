import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { db, storage } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface UploadSectionProps {
  onUploadSuccess: (data: any) => void;
  onLog?: (message: string, type: "upload" | "download" | "delete" | "view" | "info") => void;
}

export default function UploadSection({ onUploadSuccess, onLog }: UploadSectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".xlsx")) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Por favor sube un archivo .xlsx válido");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStep("Analizando Excel con IA...");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Error en el análisis";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (_) {
          // ignore parsing error if response isn't JSON
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const analysisData = result?.data ?? result ?? {};

      setUploadStep("Guardando reporte en Firebase...");

      let fileUrl = null;
      let fileBase64 = null;

      try {
        // 1. Try to upload file to Firebase Storage
        const fileRef = ref(storage, `inventories/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(fileRef, file);
        fileUrl = await getDownloadURL(uploadResult.ref);
      } catch (storageError) {
        console.warn("Storage upload failed, falling back to Base64 in Firestore", storageError);
        // Fallback: If file is < 800KB, read it as Base64 and store it in Firestore
        if (file.size < 800 * 1024) {
          try {
            fileBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = (error) => reject(error);
            });
          } catch (readError) {
            console.error("Failed to read file as Base64", readError);
          }
        }
      }

      // 2. Save document to Firestore under "analyses"
      try {
        await addDoc(collection(db, "analyses"), {
          fileName: file.name,
          fileSize: file.size,
          fileUrl,
          fileBase64,
          uploadedAt: new Date().toISOString(),
          analysisResult: analysisData
        });
      } catch (firestoreError) {
        console.error("Failed to save analysis metadata to Firestore", firestoreError);
      }

      if (onLog) {
        onLog(`Se subió y analizó el archivo "${file.name}"`, "upload");
      }
      onUploadSuccess(analysisData);
    } catch (err: any) {
      setError(
        err.message || 
        "No se pudo conectar con el servicio de análisis. Asegúrate de que el servidor esté funcionando."
      );
      console.error(err);
    } finally {
      setIsUploading(false);
      setUploadStep("");
    }
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-serif font-bold text-natural-primary mb-4">Análisis Inteligente de Nutrición</h2>
          <p className="text-natural-gray-text text-lg max-w-2xl mx-auto">
            Sube tu reporte de inventario o producción en formato Excel para recibir recomendaciones personalizadas basadas en IA para PeckerNutrition.
          </p>
        </motion.div>

        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-[32px] p-12 transition-all duration-300",
            file 
              ? "border-natural-secondary bg-natural-subtle/50" 
              : "border-natural-border bg-white hover:border-natural-secondary hover:bg-natural-subtle"
          )}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xlsx"
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-natural-muted text-natural-primary rounded-2xl flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8" />
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-natural-primary font-bold uppercase tracking-wider text-sm hover:underline"
                  >
                    Haz clic para subir
                  </button>
                  <p className="text-natural-light-text text-xs font-bold uppercase tracking-widest mt-1">o arrastra tu .xlsx aquí</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="selected"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-natural-primary text-white rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-natural-primary/20">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-natural-text">{file.name}</span>
                    <button 
                      onClick={() => setFile(null)}
                      className="p-1 hover:bg-natural-muted rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-natural-light-text" />
                    </button>
                  </div>
                  <p className="text-natural-light-text text-xs font-bold mt-1 uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {error && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 text-center mt-4 text-sm font-medium"
          >
            {error}
          </motion.p>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className={cn(
              "px-10 py-4 rounded-full font-bold text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center space-x-2",
              "bg-natural-secondary shadow-xl shadow-natural-secondary/20"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{uploadStep || "Procesando..."}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Iniciar Flujo de IA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
