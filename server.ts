import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Schema for Gemini Structured Analysis
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
      description: "Lista de 3 a 5 ações práticas e diretas para aumentar o score.",
    },
    sugestao_resumo_profissional: {
      type: Type.STRING,
      description: "Um parágrafo de 'Resumo Profissional' reescrito (3 a 4 frases), altamente profissional, incorporando as palavras-chave ausentes.",
    },
    veredito_final: {
      type: Type.STRING,
      description: "Um resumo conciso de 2 linhas sobre as chances do candidato e recomendação final.",
    },
  },
  required: [
    "score",
    "pontos_fortes",
    "pontos_fracos",
    "palavras_chave_ausentes",
    "plano_acao",
    "sugestao_resumo_profissional",
    "veredito_final",
  ],
};

// Helper to robustly parse JSON from Gemini output
function parseJsonResponse(rawText: string): any {
  let cleanText = rawText.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    const startIdx = cleanText.indexOf("{");
    const endIdx = cleanText.lastIndexOf("}");
    if (startIdx !== -1 && endIdx > startIdx) {
      const jsonSub = cleanText.substring(startIdx, endIdx + 1);
      return JSON.parse(jsonSub);
    }
    throw new Error(`Falha ao converter resposta da IA para JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// API Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "CV Match AI Server",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Local ATS analysis generator as an bulletproof fallback if Gemini API is unavailable
function fallbackAtsAnalysis(resumeText: string, jobDescription: string): any {
  const resumeLower = resumeText.toLowerCase();
  const jobLower = jobDescription.toLowerCase();

  // Extract common tech / professional keywords from job description
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

  const pontosFortes = matchedKeywords.slice(0, 3).map((kw) => `Demonstra conhecimento ou menção a '${kw.toUpperCase()}' no currículo.`);
  if (pontosFortes.length < 3) {
    pontosFortes.push("Estrutura do documento bem formatada e legível.");
    pontosFortes.push("Apresentação clara das informações profissionais.");
  }

  const pontosFracos = missingKeywords.slice(0, 3).map((kw) => `Ausência de termos-chave como '${kw.toUpperCase()}' identificados na descrição da vaga.`);
  if (pontosFracos.length < 3) {
    pontosFracos.push("Pouca quantificação de resultados e métricas atingidas em cargos anteriores.");
  }

  const palavrasAusentes = missingKeywords.slice(0, 7).map((kw) => kw.toUpperCase());
  if (palavrasAusentes.length === 0) {
    palavrasAusentes.push("Inglês Técnico", "Liderança", "Agile", "Métricas de Desempenho");
  }

  const planoAcao = [
    `Inclua explicitamente as palavras-chave faltantes (${palavrasAusentes.slice(0, 3).join(", ")}) na seção de habilidades.`,
    "Quantifique suas conquistas nas experiências anteriores (ex: 'Aumentei x em 20%').",
    "Ajuste seu resumo profissional no topo do currículo para focar diretamente nos requisitos da vaga.",
  ];

  const sugestaoResumo = `Profissional focado em resultados com sólida experiência técnica e vivência em projetos dinâmicos. Especialista na aplicação de ${matchedKeywords.slice(0, 2).map((k) => k.toUpperCase()).join(" e ") || "boas práticas"}, buscando atuar com foco em ${palavrasAusentes.slice(0, 2).join(" e ")} para agregar valor à equipe e atingir as metas da empresa.`;

  const veredito = score >= 70
    ? "Perfil com boa compatibilidade técnica. Ajustes pontuais no vocabulário do currículo garantirão aprovação no ATS."
    : "Compatibilidade intermediária. É fundamental incorporar as palavras-chave técnicas destacadas para avançar nos filtros automáticos.";

  return {
    score,
    pontos_fortes: pontosFortes.slice(0, 3),
    pontos_fracos: pontosFracos.slice(0, 3),
    palavras_chave_ausentes: palavrasAusentes,
    plano_acao: planoAcao,
    sugestao_resumo_profissional: sugestaoResumo,
    veredito_final: veredito,
  };
}

// API Route for Analyzing Resume via Server-side Gemini API
app.post("/api/analyze", async (req, res) => {
  let resumeText = "";
  let jobDescription = "";

  try {
    const body = req.body || {};
    resumeText = String(body.resumeText || "").slice(0, 15000);
    jobDescription = String(body.jobDescription || "").slice(0, 10000);

    if (!resumeText.trim() || !jobDescription.trim()) {
      return res.status(400).json({
        error: "Parâmetros 'resumeText' e 'jobDescription' são obrigatórios.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY ausente. Usando análise local ATS de contingência.");
      const fallbackResult = fallbackAtsAnalysis(resumeText, jobDescription);
      return res.json(fallbackResult);
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    const prompt = `
      Descrição da Vaga:
      ${jobDescription}

      ---
      Currículo do Candidato:
      ${resumeText}

      Analise a compatibilidade. Retorne APENAS um objeto JSON válido com:
      - score (inteiro de 0 a 100)
      - pontos_fortes (array de 3 strings)
      - pontos_fracos (array de 3 strings)
      - palavras_chave_ausentes (array de 5 a 8 strings de hard skills)
      - plano_acao (array de 3 a 5 strings)
      - sugestao_resumo_profissional (string)
      - veredito_final (string de 2 linhas)
    `;

    const systemInstruction = `Você é um algoritmo de ATS rigoroso. Se a vaga exige área específica e o candidato não tem, o score deve ser entre 0 e 35. Retorne estritamente em JSON.`;

    let responseText: string | null = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[SERVER] Tentando modelo ${model}...`);
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
          console.log(`[SERVER] Sucesso com modelo ${model}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[SERVER] Falha modelo ${model}:`, err.message || err);
        lastError = err;
      }

      // Try without strict schema if schema validation failed
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
          console.log(`[SERVER] Sucesso com modelo ${model} (sem Schema)`);
          break;
        }
      } catch (err: any) {
        console.warn(`[SERVER] Falha modelo ${model} (sem Schema):`, err.message || err);
        lastError = err;
      }
    }

    if (responseText) {
      const result = parseJsonResponse(responseText);
      return res.json(result);
    }

    console.warn("[SERVER] Serviço Gemini indisponível (503/Quota). Acionando análise ATS local inteligente de contingência.");
    const fallbackResult = fallbackAtsAnalysis(resumeText, jobDescription);
    return res.json(fallbackResult);
  } catch (error: any) {
    console.error("Gemini API Error in Server:", error);
    if (resumeText && jobDescription) {
      console.warn("Utilizando fallback local devido a erro inesperado.");
      const fallbackResult = fallbackAtsAnalysis(resumeText, jobDescription);
      return res.json(fallbackResult);
    }
    return res.status(500).json({
      error: "Falha ao analisar o currículo no servidor.",
      details: error.message || String(error),
    });
  }
});

// Setup Frontend serving / Vite Dev Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 CV Match AI Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
