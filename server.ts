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

// API Route for Analyzing Resume via Server-side Gemini API
app.post("/api/analyze", async (req, res) => {
  try {
    let { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        error: "Parâmetros 'resumeText' e 'jobDescription' são obrigatórios.",
      });
    }

    // Sanitize and limit length to avoid oversized payload issues
    resumeText = String(resumeText).slice(0, 15000);
    jobDescription = String(jobDescription).slice(0, 10000);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("ERRO: GEMINI_API_KEY não definida nas variáveis de ambiente.");
      return res.status(500).json({
        error: "Chave da API do Gemini não configurada no servidor.",
        details: "A variável GEMINI_API_KEY está ausente no ambiente do servidor.",
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];

    const prompt = `
      Descrição da Vaga (Requirements):
      ${jobDescription}

      ---
      Conteúdo do Currículo (Candidate Profile):
      ${resumeText}

      Por favor, analise a compatibilidade entre o currículo e a vaga.
      Retorne APENAS um objeto JSON válido com a seguinte estrutura estrita:
      - score (inteiro de 0 a 100)
      - pontos_fortes (array de 3 strings)
      - pontos_fracos (array de 3 strings)
      - palavras_chave_ausentes (array de 5 a 8 strings de hard skills)
      - plano_acao (array de 3 a 5 strings de ações práticas)
      - sugestao_resumo_profissional (string de 3 a 4 frases)
      - veredito_final (string com 2 linhas de recomendação)
    `;

    const systemInstruction = `Você é um algoritmo de ATS (Applicant Tracking System) e um Recrutador Técnico RÍGIDO.
    1. Se a vaga exige formação específica e o candidato não tem, o score DEVE ser entre 0 e 35.
    2. Soft skills valem no máximo 10% da nota.
    3. Retorne estritamente em formato JSON válido conforme solicitado.`;

    let responseText: string | null = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      // Strategy 1: Structured Output with Schema
      try {
        console.log(`[SERVER] Tentando modelo ${model} com Schema...`);
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
          console.log(`[SERVER] Sucesso com modelo ${model} (com Schema)`);
          break;
        }
      } catch (err: any) {
        console.warn(`[SERVER] Falha modelo ${model} (com Schema):`, err.message || err);
        lastError = err;
      }

      // Strategy 2: Direct JSON mode without strict Schema
      try {
        console.log(`[SERVER] Tentando modelo ${model} sem Schema...`);
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

    if (!responseText) {
      console.error("[SERVER] Todos os modelos e estratégias falharam:", lastError);
      return res.status(503).json({
        error: "Serviço da IA (Gemini) indisponível no momento.",
        details: lastError?.message || "Sem resposta dos modelos de IA.",
      });
    }

    const result = parseJsonResponse(responseText);
    return res.json(result);
  } catch (error: any) {
    console.error("Gemini API Error in Server:", error);
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
