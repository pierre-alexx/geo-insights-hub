import { supabase } from "@/integrations/supabase/client";

export interface Page {
  id: string;
  url: string;
  title: string;
  html_content?: string;
  fetch_timestamp: string;
}

export interface GeoResult {
  id: string;
  pageId: string;
  pageUrl: string;
  pageTitle: string;
  promptType: string;
  promptText: string;
  llmResponse: string;
  relevanceScore: number;
  comprehensionScore: number;
  visibilityScore: number;
  recommendationScore: number;
  globalGeoScore: number;
  recommendations: string[];
  timestamp: string;
}

export async function fetchPage(url: string): Promise<Page> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-page`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch page');
  }

  const data = await response.json();
  
  const { data: page, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', data.pageId)
    .single();

  if (error) throw error;
  
  return {
    id: page.id,
    url: page.url,
    title: page.title,
    html_content: page.html_content,
    fetch_timestamp: page.fetch_timestamp
  };
}

export async function fetchPageById(id: string): Promise<Page | null> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching page:', error);
    return null;
  }

  return {
    id: data.id,
    url: data.url,
    title: data.title,
    html_content: data.html_content,
    fetch_timestamp: data.fetch_timestamp
  };
}

export async function fetchPages(): Promise<Page[]> {
  const { data, error } = await supabase
    .from('pages')
    .select('id, url, title, fetch_timestamp')
    .order('fetch_timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching pages:', error);
    return [];
  }

  return data.map(page => ({
    id: page.id,
    url: page.url,
    title: page.title,
    fetch_timestamp: page.fetch_timestamp
  }));
}

export async function runPageGeoTest(pageId: string, promptType: string, promptText: string): Promise<GeoResult> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/run-geo-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pageId, promptType, promptText })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to run GEO test');
    }

    const llmData = await response.json();
    
    const { data: resultData, error: resultError } = await supabase
      .from('results')
      .insert({
        page_id: pageId,
        prompt_type: promptType,
        prompt_text: promptText,
        llm_response: llmData.llmResponse,
        relevance_score: llmData.relevanceScore,
        comprehension_score: llmData.comprehensionScore,
        visibility_score: llmData.visibilityScore,
        recommendation_score: llmData.recommendationScore,
        global_geo_score: llmData.globalGeoScore,
        recommendations: llmData.recommendations
      })
      .select()
      .single();
    
    if (resultError) throw resultError;

    const page = await fetchPageById(pageId);
    
    return {
      id: resultData.id,
      pageId,
      pageUrl: page?.url || '',
      pageTitle: page?.title || '',
      promptType,
      promptText,
      llmResponse: llmData.llmResponse,
      relevanceScore: llmData.relevanceScore,
      comprehensionScore: llmData.comprehensionScore,
      visibilityScore: llmData.visibilityScore,
      recommendationScore: llmData.recommendationScore,
      globalGeoScore: llmData.globalGeoScore,
      recommendations: llmData.recommendations,
      timestamp: resultData.timestamp
    };
  } catch (error) {
    console.error('Error running page GEO test:', error);
    throw error;
  }
}

export async function fetchAllResults(): Promise<GeoResult[]> {
  try {
    const { data, error } = await supabase
      .from('results')
      .select(`
        *,
        pages (
          url,
          title
        )
      `)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map((result: any) => ({
      id: result.id,
      pageId: result.page_id,
      pageUrl: result.pages.url,
      pageTitle: result.pages.title,
      promptType: result.prompt_type,
      promptText: result.prompt_text,
      llmResponse: result.llm_response,
      relevanceScore: result.relevance_score,
      comprehensionScore: result.comprehension_score,
      visibilityScore: result.visibility_score,
      recommendationScore: result.recommendation_score,
      globalGeoScore: result.global_geo_score,
      recommendations: result.recommendations,
      timestamp: result.timestamp
    }));
  } catch (error) {
    console.error('Error fetching results:', error);
    return [];
  }
}

export async function fetchPageResults(pageId: string): Promise<GeoResult[]> {
  try {
    const { data, error } = await supabase
      .from('results')
      .select(`
        *,
        pages (
          url,
          title
        )
      `)
      .eq('page_id', pageId)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map((result: any) => ({
      id: result.id,
      pageId: result.page_id,
      pageUrl: result.pages.url,
      pageTitle: result.pages.title,
      promptType: result.prompt_type,
      promptText: result.prompt_text,
      llmResponse: result.llm_response,
      relevanceScore: result.relevance_score,
      comprehensionScore: result.comprehension_score,
      visibilityScore: result.visibility_score,
      recommendationScore: result.recommendation_score,
      globalGeoScore: result.global_geo_score,
      recommendations: result.recommendations,
      timestamp: result.timestamp
    }));
  } catch (error) {
    console.error('Error fetching page results:', error);
    return [];
  }
}

export async function fetchPageStats() {
  try {
    const { data: results, error } = await supabase
      .from('results')
      .select(`
        global_geo_score,
        relevance_score,
        comprehension_score,
        visibility_score,
        recommendation_score,
        pages (
          id,
          url,
          title
        )
      `);
    
    if (error) throw error;
    
    const totalResults = results?.length || 0;
    
    if (totalResults === 0) {
      return {
        avgGlobalGeoScore: 0,
        avgRelevance: 0,
        avgComprehension: 0,
        avgVisibility: 0,
        avgRecommendation: 0,
        geoScoreByPage: []
      };
    }
    
    const avgGlobalGeoScore = results.reduce((sum: number, r: any) => sum + r.global_geo_score, 0) / totalResults;
    const avgRelevance = results.reduce((sum: number, r: any) => sum + r.relevance_score, 0) / totalResults;
    const avgComprehension = results.reduce((sum: number, r: any) => sum + r.comprehension_score, 0) / totalResults;
    const avgVisibility = results.reduce((sum: number, r: any) => sum + r.visibility_score, 0) / totalResults;
    const avgRecommendation = results.reduce((sum: number, r: any) => sum + r.recommendation_score, 0) / totalResults;
    
    const pageScores: Record<string, { scores: number[], url: string, title: string }> = {};
    
    results.forEach((r: any) => {
      const pageId = r.pages.id;
      if (!pageScores[pageId]) {
        pageScores[pageId] = {
          scores: [],
          url: r.pages.url,
          title: r.pages.title
        };
      }
      pageScores[pageId].scores.push(r.global_geo_score);
    });
    
    const geoScoreByPage = Object.entries(pageScores).map(([pageId, data]) => ({
      pageId,
      url: data.url,
      title: data.title,
      avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      testCount: data.scores.length
    })).sort((a, b) => b.avgScore - a.avgScore);
    
    return {
      avgGlobalGeoScore,
      avgRelevance,
      avgComprehension,
      avgVisibility,
      avgRecommendation,
      geoScoreByPage
    };
  } catch (error) {
    console.error('Error fetching page stats:', error);
    return {
      avgGlobalGeoScore: 0,
      avgRelevance: 0,
      avgComprehension: 0,
      avgVisibility: 0,
      avgRecommendation: 0,
      geoScoreByPage: []
    };
  }
}
