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

function clientFallbackAtsAnalysis(resumeText: string, jobDescription: string): AnalysisResult {
  const resumeLower = resumeText.toLowerCase();
  const jobLower = jobDescription.toLowerCase();

  const words = jobLower.match(/\b[a-zà-ú0-9+#.-]{3,20}\b/gi) || [];
  const stopWords = new Set([
    "para", "com", "que", "como", "uma", "mais", "dos", "das", "em", "por", "sobre", "entre",
    "ser", "ter", "são", "sua", "seus", "suas", "vaga", "esta", "este", "anos", "requisitos",
    "deve", "desejável", "obrigatório", "conhecimento", "experiência", "trabalho", "empresa",
    "equipe", "desenvolvimento", "atuar", "atividades", "responsabilidades", "perfil", "área"
  ]);

  const freqMap: Record<string, number> = {};
  words.forEach((w) => {
    if (!stopWords.has(w) && w.length > 3) {
      freqMap[w] = (freqMap[w] || 0) + 1;
    }
  });

  const sortedJobKeywords = Object.keys(freqMap).sort((a, b) => freqMap[b] - freqMap[a]);
  const topJobKeywords = sortedJobKeywords.slice(0, 15);

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  topJobKeywords.forEach((kw) => {
    if (resumeLower.includes(kw)) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  });

  const matchRatio = topJobKeywords.length > 0 ? matchedKeywords.length / topJobKeywords.length : 0.5;
  const score = Math.min(95, Math.max(25, Math.round(matchRatio * 100)));

  const pontosFortes = matchedKeywords.slice(0, 3).map((kw) => `Conhecimento ou experiência identificada no termo '${kw.toUpperCase()}'.`);
  if (pontosFortes.length < 3) {
    pontosFortes.push("Documento bem formatado e legível pelo ATS.");
    pontosFortes.push("Apresentação clara dos dados do candidato.");
  }

  const pontosFracos = missingKeywords.slice(0, 3).map((kw) => `Falta de menção explícita ao termo '${kw.toUpperCase()}'.`);
  if (pontosFracos.length < 3) {
    pontosFracos.push("Poucos dados quantitativos de impacto na carreira.");
  }

  const palavrasAusentes = missingKeywords.slice(0, 7).map((kw) => kw.toUpperCase());
  if (palavrasAusentes.length === 0) {
    palavrasAusentes.push("Inglês Técnico", "Metodologias Ágeis", "KPIs");
  }

  return {
    score,
    pontos_fortes: pontosFortes.slice(0, 3),
    pontos_fracos: pontosFracos.slice(0, 3),
    palavras_chave_ausentes: palavrasAusentes,
    plano_acao: [
      `Adicione os termos faltantes (${palavrasAusentes.slice(0, 3).join(", ")}) ao currículo.`,
      "Inclua métricas reais e percentuais de conquistas.",
      "Adapte o objetivo profissional diretamente para a vaga pretendida.",
    ],
    sugestao_resumo_profissional: `Profissional qualificado com vivência em ${matchedKeywords.slice(0, 2).map((k) => k.toUpperCase()).join(" e ") || "projetos do setor"}. Focado em entregar resultados de alto impacto e desenvolver competências em ${palavrasAusentes.slice(0, 2).join(" e ")}.`,
    veredito_final: score >= 70
      ? "Perfil com boa aderência. Realize pequeno alinhamento de vocabulário para garantir pontuação máxima no ATS."
      : "Compatibilidade mediana. A inclusão das palavras-chave técnicas indicadas é essencial para avançar na seleção.",
  };
}

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

    if (apiResponse.ok && data && typeof data.score === 'number') {
      return data as AnalysisResult;
    }

    if (data && data.error && !data.error.includes("503") && !data.error.includes("indisponível")) {
      const msg = data.details ? `${data.error} Detalhes: ${data.details}` : data.error;
      throw new Error(msg);
    }
  } catch (apiError: any) {
    if (apiError.message && !apiError.message.includes("Failed to fetch") && !apiError.message.includes("503")) {
      console.warn("Express endpoint error:", apiError.message);
      throw apiError;
    }
    console.warn("Express backend endpoint failed or unavailable, attempting client fallback...", apiError);
  }

  // 2. Client-side SDK Fallback
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return clientFallbackAtsAnalysis(resumeText, jobDescription);
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    const sanitizedResume = String(resumeText).slice(0, 15000);
    const sanitizedJob = String(jobDescription).slice(0, 10000);

    const prompt = `
      Descrição da Vaga:
      ${sanitizedJob}

      ---
      Currículo do Candidato:
      ${sanitizedResume}

      Retorne APENAS um objeto JSON válido com score, pontos_fortes, pontos_fracos, palavras_chave_ausentes, plano_acao, sugestao_resumo_profissional, veredito_final.
    `;

    const systemInstruction = `Você é um algoritmo de ATS. Retorne estritamente em JSON.`;

    let responseText: string | null = null;

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
        // Try without schema
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
        // Continue
      }
    }

    if (!responseText) {
      return clientFallbackAtsAnalysis(resumeText, jobDescription);
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
    console.warn("Gemini API Client Error, using local fallback:", error);
    return clientFallbackAtsAnalysis(resumeText, jobDescription);
  }
};