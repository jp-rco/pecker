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
