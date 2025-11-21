import { supabase } from "@/integrations/supabase/client";

export interface GeoResult {
  id: string;
  promptType: string;
  promptText: string;
  llmResponse: string;
  presenceScore: 0 | 1 | 2;
  sentimentScore: number;
  recommended: boolean;
  recommendations: string[];
  timestamp: string;
}

// Developer mode toggle
const USE_FAKE_EDGE_FUNCTION = true;

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock LLM response for testing
async function mockRunGeoTest(promptType: string, promptText: string) {
  await delay(2000);
  
  const presenceScore = Math.random() > 0.5 ? (Math.random() > 0.5 ? 2 : 1) : 0;
  const sentimentScore = Math.random() * 2 - 1;
  
  return {
    llmResponse: `This is a simulated LLM response for the prompt: "${promptText}". In a real implementation, this would contain the actual response from the LLM API. The response analyzes BNP Paribas presence and relevance in the context of the given query.`,
    presenceScore: presenceScore as 0 | 1 | 2,
    sentimentScore,
    recommended: presenceScore > 0,
    recommendations: [
      "Improve structured content in this area",
      "Add more entity-linked pages",
      "Optimize FAQ content for LLM indexing",
      "Publish more thought leadership articles"
    ]
  };
}

export async function runGeoTest(promptType: string, promptText: string): Promise<GeoResult> {
  try {
    let llmData;
    
    if (USE_FAKE_EDGE_FUNCTION) {
      // Use mock data
      llmData = await mockRunGeoTest(promptType, promptText);
    } else {
      // Call edge function (future implementation)
      const { data, error } = await supabase.functions.invoke('run-geo-test', {
        body: { promptType, promptText }
      });
      
      if (error) throw error;
      llmData = data;
    }
    
    // Save prompt to database
    const { data: promptData, error: promptError } = await supabase
      .from('prompts')
      .insert({
        type: promptType,
        text: promptText
      })
      .select()
      .single();
    
    if (promptError) throw promptError;
    
    // Save result to database
    const { data: resultData, error: resultError } = await supabase
      .from('results')
      .insert({
        prompt_id: promptData.id,
        llm_response: llmData.llmResponse,
        presence_score: llmData.presenceScore,
        sentiment_score: llmData.sentimentScore,
        recommended: llmData.recommended,
        recommendations: llmData.recommendations
      })
      .select()
      .single();
    
    if (resultError) throw resultError;
    
    // Return formatted result
    return {
      id: resultData.id,
      promptType,
      promptText,
      llmResponse: llmData.llmResponse,
      presenceScore: llmData.presenceScore,
      sentimentScore: llmData.sentimentScore,
      recommended: llmData.recommended,
      recommendations: llmData.recommendations,
      timestamp: resultData.timestamp
    };
  } catch (error) {
    console.error('Error running GEO test:', error);
    throw error;
  }
}

export async function fetchAllResults(): Promise<GeoResult[]> {
  try {
    const { data, error } = await supabase
      .from('results')
      .select(`
        *,
        prompts (
          type,
          text
        )
      `)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map((result: any) => ({
      id: result.id,
      promptType: result.prompts.type,
      promptText: result.prompts.text,
      llmResponse: result.llm_response,
      presenceScore: result.presence_score,
      sentimentScore: result.sentiment_score,
      recommended: result.recommended,
      recommendations: result.recommendations,
      timestamp: result.timestamp
    }));
  } catch (error) {
    console.error('Error fetching results:', error);
    return [];
  }
}

export async function fetchStats() {
  try {
    const { data: results, error } = await supabase
      .from('results')
      .select(`
        presence_score,
        sentiment_score,
        recommended,
        prompts (type)
      `);
    
    if (error) throw error;
    
    const totalResults = results?.length || 0;
    
    if (totalResults === 0) {
      return {
        geoVisibilityScore: 0,
        avgPresenceScore: 0,
        avgSentiment: 0,
        recommendationRate: 0,
        presenceByType: {}
      };
    }
    
    const avgPresenceScore = results.reduce((sum: number, r: any) => sum + r.presence_score, 0) / totalResults;
    const avgSentiment = results.reduce((sum: number, r: any) => sum + r.sentiment_score, 0) / totalResults;
    const recommendationRate = (results.filter((r: any) => r.recommended).length / totalResults) * 100;
    
    // GEO Visibility Score: weighted combination
    const geoVisibilityScore = Math.round(
      (avgPresenceScore / 2) * 40 + 
      ((avgSentiment + 1) / 2) * 30 + 
      (recommendationRate / 100) * 30
    );
    
    // Presence by type
    const presenceByType: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    
    results.forEach((r: any) => {
      const type = r.prompts.type;
      if (!presenceByType[type]) {
        presenceByType[type] = 0;
        typeCounts[type] = 0;
      }
      presenceByType[type] += r.presence_score;
      typeCounts[type]++;
    });
    
    // Average by type
    Object.keys(presenceByType).forEach(type => {
      presenceByType[type] = presenceByType[type] / typeCounts[type];
    });
    
    return {
      geoVisibilityScore,
      avgPresenceScore,
      avgSentiment,
      recommendationRate,
      presenceByType
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      geoVisibilityScore: 0,
      avgPresenceScore: 0,
      avgSentiment: 0,
      recommendationRate: 0,
      presenceByType: {}
    };
  }
}
