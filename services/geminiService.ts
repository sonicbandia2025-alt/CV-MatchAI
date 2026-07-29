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
  // 1. First attempt: Call Express backend /api/analyze endpoint
  try {
    const apiResponse = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resumeText, jobDescription }),
    });

    const data = await apiResponse.json().catch(() => null);

    if (apiResponse.ok && data) {
      return data as AnalysisResult;
    }

    if (data && data.error) {
      const msg = data.details ? `${data.error} Detalhes: ${data.details}` : data.error;
      throw new Error(msg);
    }
  } catch (apiError: any) {
    if (apiError.message && !apiError.message.includes("Failed to fetch")) {
      console.warn("Express endpoint error:", apiError.message);
      throw apiError;
    }
    console.warn("Express backend endpoint unreachable, attempting client fallback...", apiError);
  }

  // 2. Client-side SDK Fallback
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Chave GEMINI_API_KEY não foi configurada para o cliente.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];

    const sanitizedResume = String(resumeText).slice(0, 15000);
    const sanitizedJob = String(jobDescription).slice(0, 10000);

    const prompt = `
      Descrição da Vaga (Requirements):
      ${sanitizedJob}

      ---
      Conteúdo do Currículo (Candidate Profile):
      ${sanitizedResume}

      Por favor, analise a compatibilidade e retorne um objeto JSON estrito com os seguintes campos:
      - score (número inteiro de 0 a 100)
      - pontos_fortes (array de 3 strings)
      - pontos_fracos (array de 3 strings)
      - palavras_chave_ausentes (array de 5 a 8 strings)
      - plano_acao (array de 3 a 5 strings)
      - sugestao_resumo_profissional (string)
      - veredito_final (string de 2 linhas)
    `;

    const systemInstruction = `Você é um algoritmo de ATS e um Recrutador Técnico RÍGIDO. Retorne estritamente em formato JSON válido.`;

    let responseText: string | null = null;
    let lastError: any = null;

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
        lastError = err;
      }

      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
          },
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error("Sem resposta do serviço da IA Gemini.");
    }

    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const startIdx = cleanText.indexOf("{");
    const endIdx = cleanText.lastIndexOf("}");
    if (startIdx !== -1 && endIdx > startIdx) {
      cleanText = cleanText.substring(startIdx, endIdx + 1);
    }

    return JSON.parse(cleanText) as AnalysisResult;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Falha ao analisar o currículo.");
  }
};