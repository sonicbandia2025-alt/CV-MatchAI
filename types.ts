export interface AnalysisResult {
  score: number;
  pontos_fortes: string[];
  pontos_fracos: string[];
  veredito_final: string;
  palavras_chave_ausentes: string[];
  plano_acao: string[];
  sugestao_resumo_profissional: string;
}

export interface ProcessingState {
  status: 'idle' | 'extracting' | 'analyzing' | 'success' | 'error';
  message?: string;
}

export enum Step {
  UPLOAD = 0,
  JOB_DESC = 1,
  ANALYSIS = 2,
  RESULT = 3
}