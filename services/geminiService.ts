import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

// Safe access to environment variables.
// In raw ES modules environments (like some online sandboxes), import.meta.env might be undefined.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

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
  // First attempt: Call Express backend /api/analyze endpoint
  try {
    const apiResponse = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resumeText, jobDescription }),
    });

    if (apiResponse.ok) {
      const data = await apiResponse.json();
      return data as AnalysisResult;
    }

    // If server returned a structured error response
    if (apiResponse.headers.get("content-type")?.includes("application/json")) {
      const errData = await apiResponse.json();
      if (errData.error) {
        throw new Error(errData.error);
      }
    }
  } catch (apiError: any) {
    // If backend endpoint threw an explicit error message, rethrow it
    if (apiError.message && !apiError.message.includes("Failed to fetch")) {
      console.warn("Backend API returned error, attempting fallback:", apiError.message);
    }
  }

  // Fallback: Direct client-side SDK call
  try {
    const modelsToTry = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    let lastError: any = null;
    let responseText: string | null = null;
    
    const prompt = `
      Descrição da Vaga (Requirements):
      ${jobDescription}

      ---
      Conteúdo do Currículo (Candidate Profile):
      ${resumeText}
    `;

    const systemInstruction = `Você é um algoritmo de ATS (Applicant Tracking System) e um Recrutador Técnico RÍGIDO. 

    DIRETRIZES DE PONTUAÇÃO (CRITICAMENTE IMPORTANTE):
    1. CRITÉRIO DE ELIMINAÇÃO (Formação/Área): Se a vaga exige uma formação específica e o candidato NÃO tem a formação exata ou experiência direta na área, o SCORE DEVE SER BAIXO (entre 0 e 35).
    
    2. NÃO COMPENSE COM SOFT SKILLS: Soft skills valem no máximo 10% da nota.
    
    3. ESCALA DE SCORE REALISTA:
       - 0-40: Perfil incompatível.
       - 41-60: Perfil júnior ou transição de carreira.
       - 61-80: Perfil compatível.
       - 81-100: Perfil ideal.

    Sua tarefa:
    1. Analise friamente a compatibilidade técnica.
    2. Identifique as palavras-chave faltantes.
    3. Crie uma sugestão de texto para o 'Resumo Profissional'.
    
    Retorne APENAS JSON válido conforme o schema.`;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          },
        });

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Client attempt with model ${model} failed:`, err.message || err);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error("A resposta da IA veio vazia de todos os modelos tentados.");
    }

    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(cleanText) as AnalysisResult;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    let errorMsg = "Falha ao analisar o currículo.";
    
    if (error.message?.includes('400')) errorMsg = "Erro de Requisição (400). Verifique se o PDF tem texto legível.";
    if (error.message?.includes('403')) errorMsg = "Erro de Permissão (403). Verifique se a Chave da API está válida.";
    if (error.message?.includes('429')) errorMsg = "Muitas requisições. A cota gratuita foi excedida temporariamente.";
    if (error.message?.includes('500') || error.message?.includes('503')) errorMsg = "Serviço da IA indisponível no momento. Tente novamente em 1 minuto.";

    throw new Error(errorMsg);
  }
};