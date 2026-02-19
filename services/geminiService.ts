import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

// Configuração para Ambiente Estático
const getApiKey = () => {
  const meta = import.meta as any;
  if (typeof meta !== 'undefined' && meta.env && meta.env.VITE_GOOGLE_API_KEY) {
    return meta.env.VITE_GOOGLE_API_KEY;
  }
  // Chave injetada manualmente conforme solicitado
  return "AIzaSyDSwkK0xC79Ly1Nm_no0c0jTrBCnpqg9fw";
};

const apiKey = getApiKey();

if (!apiKey) {
  console.error("ERRO CRÍTICO: Não foi possível obter a API Key.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      description: "Uma pontuação de 0 a 100 indicando a compatibilidade do candidato com a vaga.",
    },
    pontos_fortes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 3 pontos fortes identificados no currículo em relação à vaga.",
    },
    pontos_fracos: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 3 pontos de atenção ou ausências no currículo que precisam ser melhorados.",
    },
    palavras_chave_ausentes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 5 a 8 palavras-chave técnicas ou hard skills EXATAS que constam na vaga mas NÃO constam no currículo (Crucial para ATS).",
    },
    plano_acao: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 3 a 5 ações práticas e diretas (ex: 'Adicionar experiência com X', 'Quantificar resultado Y') para aumentar o score.",
    },
    sugestao_resumo_profissional: {
      type: Type.STRING,
      description: "Um parágrafo de 'Resumo Profissional' ou 'Sobre Mim' totalmente reescrito (3 a 4 frases), altamente profissional, incorporando NATURALMENTE as palavras-chave ausentes e focando nos requisitos da vaga. Deve estar pronto para copiar e colar no CV.",
    },
    veredito_final: {
      type: Type.STRING,
      description: "Um resumo conciso de 2 linhas sobre as chances do candidato e recomendação final.",
    },
  },
  required: ["score", "pontos_fortes", "pontos_fracos", "palavras_chave_ausentes", "plano_acao", "sugestao_resumo_profissional", "veredito_final"],
};

export const analyzeResume = async (resumeText: string, jobDescription: string): Promise<AnalysisResult> => {
  try {
    // Usando gemini-3-flash-preview por ser o modelo recomendado para tarefas de texto
    const model = 'gemini-3-flash-preview';
    
    const prompt = `
      Descrição da Vaga (Requirements):
      ${jobDescription}

      ---
      Conteúdo do Currículo (Candidate Profile):
      ${resumeText}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: `Você é um algoritmo de ATS (Applicant Tracking System) e um Recrutador Técnico RÍGIDO. 

        DIRETRIZES DE PONTUAÇÃO (CRITICAMENTE IMPORTANTE):
        1. CRITÉRIO DE ELIMINAÇÃO (Formação/Área): Se a vaga exige uma formação específica (ex: Educação Física, Direito, Medicina, Engenharia) e o candidato NÃO tem a formação exata ou experiência direta na área (ex: é um candidato Administrativo tentando vaga técnica), o SCORE DEVE SER BAIXO (entre 0 e 35).
        
        2. NÃO COMPENSE COM SOFT SKILLS: "Comunicação", "Organização" ou "Vontade de aprender" NÃO devem aumentar o score se os requisitos técnicos obrigatórios (Hard Skills) não existirem. Soft skills valem no máximo 10% da nota.
        
        3. ESCALA DE SCORE REALISTA:
           - 0-40: Perfil incompatível (Falta formação base ou experiência na área).
           - 41-60: Perfil júnior ou transição de carreira (Tem a formação, falta experiência).
           - 61-80: Perfil compatível (Atende a maioria dos requisitos).
           - 81-100: Perfil ideal (Match perfeito).

        Sua tarefa:
        1. Analise friamente a compatibilidade técnica.
        2. Identifique as palavras-chave faltantes.
        3. Crie uma sugestão de texto para o 'Resumo Profissional' para tentar salvar o currículo, mas mantenha o score honesto.
        
        Retorne APENAS JSON válido conforme o schema.`,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    if (response.text) {
      let cleanText = response.text.trim();
      
      // Remove markdown code blocks if present (common cause of parsing errors)
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      return JSON.parse(cleanText) as AnalysisResult;
    } else {
      throw new Error("A resposta da IA veio vazia.");
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    let errorMsg = "Falha ao analisar o currículo.";
    
    // Better error handling
    if (error.message?.includes('400')) errorMsg = "Erro de Requisição (400). Verifique se o PDF tem texto legível.";
    if (error.message?.includes('403')) errorMsg = "Erro de Permissão (403). Verifique se a Chave da API está válida.";
    if (error.message?.includes('429')) errorMsg = "Muitas requisições. A cota gratuita foi excedida temporariamente.";
    if (error.message?.includes('500') || error.message?.includes('503')) errorMsg = "Serviço da IA indisponível no momento. Tente novamente em 1 minuto.";

    throw new Error(errorMsg);
  }
};
