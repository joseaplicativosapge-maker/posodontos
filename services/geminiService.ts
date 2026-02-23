import { GoogleGenAI } from "@google/genai";

export const generateRecipeSuggestion = async (
  productName: string
): Promise<string> => {
  try {
    // Fix: Create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Crea una descripción culinaria breve y apetitosa y una lista simple de 3 ingredientes clave para un ítem del servicio de restaurante llamado "${productName}". Mantenlo en menos de 50 palabras. Formato: Descripción | Ingredientes. Responde en Español.`,
    });

    return response.text ?? "No hay sugerencias disponibles.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generando sugerencia.";
  }
};

export const generateBusinessInsights = async (
  salesData: any
): Promise<string> => {
  try {
    // Fix: Create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza este resumen diario de ventas para un restaurante y da 2 consejos estratégicos breves (1 frase cada uno). Responde en Español. Datos: ${JSON.stringify(salesData)}`,
    });

    return response.text ?? "No hay insights disponibles.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error analizando datos.";
  }
};