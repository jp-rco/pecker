export interface AnalysisMetric {
  label: string;
  value: number | string;
  trend: "up" | "down" | "neutral";
}

export interface ChartDataPoint {
  month: string;
  proteina: number;
  energia: number;
  salud: number;
}

export interface AnalysisResult {
  summary: string;
  metrics: AnalysisMetric[];
  chartData: ChartDataPoint[];
  importantInsights: string[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface SavedAnalysis {
  id: string;
  fileName: string;
  fileSize: number;
  fileUrl?: string | null;
  fileBase64?: string | null;
  uploadedAt: any;
  analysisResult: any; // Using any to support ExtendedAnalysisResult flexibility
}

export interface LogEntry {
  id: string;
  message: string;
  timestamp: string;
  type: "upload" | "download" | "delete" | "view" | "info";
}


