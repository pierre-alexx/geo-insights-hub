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

export interface RewriteRequest {
  pageId: string;
  personaId?: string | null;
  recommendations?: string[];
  weak_points?: string[];
  opportunities?: string[];
  persona_results?: any[];
  mode: 'general' | 'persona';
}

export interface RewriteResult {
  new_page_html: string;
  new_page_outline: string;
  geo_rationale: string;
  persona_rationale: string | null;
  original_page_html: string;
  page_url: string;
  page_title: string;
}

export interface IndexabilityResult {
  id: string;
  page_id: string;
  html_indexability_score: number;
  structure_clarity_score: number;
  entity_clarity_score: number;
  content_scannability_score: number;
  issues: string[];
  suggestions: string[];
  created_at: string;
}

export async function geoEngine(payload: {
  task: 'score' | 'rewrite' | 'gap-analysis' | 'answer' | 'indexability';
  pageHtml?: string;
  pageUrl?: string;
  promptText?: string;
  promptType?: string;
  llmAnswer?: string;
  extraContext?: string;
}) {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/geo-engine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Geo-engine request failed');
  }

  return await response.json();
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

  const data = await response.json();

  if (!response.ok || data?.success === false) {
    const rawMessage: string | undefined = data?.error;
    const details: string | undefined = data?.details;

    let message = details || rawMessage || 'Failed to fetch page';

    if (rawMessage && (rawMessage.includes('http2 error') || rawMessage.includes('stream error'))) {
      message = 'The BNP site refused the connection from this backend (HTTP/2 error). Please try another BNP URL or contact your infra team to allow these requests.';
    }

    throw new Error(message);
  }
  
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

export async function createPageManually(url: string, title: string, htmlContent: string): Promise<Page> {
  const { data: existingPage } = await supabase
    .from('pages')
    .select('id')
    .eq('url', url)
    .single();

  if (existingPage) {
    const { data, error } = await supabase
      .from('pages')
      .update({
        title,
        html_content: htmlContent,
        fetch_timestamp: new Date().toISOString()
      })
      .eq('id', existingPage.id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      url: data.url,
      title: data.title,
      html_content: data.html_content,
      fetch_timestamp: data.fetch_timestamp
    };
  }

  const { data, error } = await supabase
    .from('pages')
    .insert({
      url,
      title,
      html_content: htmlContent
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    url: data.url,
    title: data.title,
    html_content: data.html_content,
    fetch_timestamp: data.fetch_timestamp
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

export interface Rewrite {
  id: string;
  pageId: string;
  originalHtml: string;
  rewrittenHtml: string;
  summary: string;
  geoRationale: string;
  timestamp: string;
}

export async function rewritePage(pageId: string): Promise<Rewrite> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/rewrite-page`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pageId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to rewrite page');
  }

  return await response.json();
}

export async function fetchRewrites(pageId: string): Promise<Rewrite[]> {
  try {
    const { data, error } = await supabase
      .from('rewrites')
      .select('*')
      .eq('page_id', pageId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return (data || []).map((r: any) => ({
      id: r.id,
      pageId: r.page_id,
      originalHtml: r.original_html,
      rewrittenHtml: r.rewritten_html,
      summary: r.summary,
      geoRationale: r.geo_rationale,
      timestamp: r.timestamp
    }));
  } catch (error) {
    console.error('Error fetching rewrites:', error);
    return [];
  }
}

export async function fetchRewrite(id: string): Promise<Rewrite | null> {
  try {
    const { data, error } = await supabase
      .from('rewrites')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      pageId: data.page_id,
      originalHtml: data.original_html,
      rewrittenHtml: data.rewritten_html,
      summary: data.summary,
      geoRationale: data.geo_rationale,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('Error fetching rewrite:', error);
    return null;
  }
}

export async function fetchRewriteStats() {
  try {
    const [pagesData, rewritesData] = await Promise.all([
      supabase.from('pages').select('id'),
      supabase.from('rewrites').select('page_id, id')
    ]);

    const totalPages = pagesData.data?.length || 0;
    const rewrittenPageIds = new Set(rewritesData.data?.map((r: any) => r.page_id) || []);
    const rewrittenPages = rewrittenPageIds.size;

    return {
      totalPages,
      rewrittenPages,
      percentageRewritten: totalPages > 0 ? (rewrittenPages / totalPages) * 100 : 0
    };
  } catch (error) {
    console.error('Error fetching rewrite stats:', error);
    return {
      totalPages: 0,
      rewrittenPages: 0,
      percentageRewritten: 0
    };
  }
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  goal: string;
  risk_profile: string;
  needs: string;
  typical_questions: string[];
  created_at: string;
}

export interface PersonaResult {
  id: string;
  persona_id: string;
  page_id: string;
  prompt: string;
  llm_response: string;
  relevance_score: number;
  comprehension_score: number;
  visibility_score: number;
  recommendation_score: number;
  global_geo_score: number;
  recommendations: any;
  timestamp: string;
}

export async function fetchPersonas(): Promise<Persona[]> {
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchPersona(id: string): Promise<Persona> {
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createPersona(persona: Omit<Persona, 'id' | 'created_at'>): Promise<Persona> {
  const { data, error } = await supabase
    .from('personas')
    .insert(persona)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePersona(id: string, persona: Partial<Omit<Persona, 'id' | 'created_at'>>): Promise<Persona> {
  const { data, error } = await supabase
    .from('personas')
    .update(persona)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePersona(id: string): Promise<void> {
  const { error } = await supabase
    .from('personas')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function runPersonaGeoTest(personaId: string, pageId: string, numQuestions: number = 5) {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/persona-geo-test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ personaId, pageId, numQuestions })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to run persona GEO test');
  }

  return await response.json();
}

export async function fetchPersonaResults(personaId: string, pageId?: string): Promise<PersonaResult[]> {
  let query = supabase
    .from('persona_results')
    .select('*')
    .order('timestamp', { ascending: false });

  if (personaId) {
    query = query.eq('persona_id', personaId);
  }

  if (pageId) {
    query = query.eq('page_id', pageId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function rewritePageWithContext(request: RewriteRequest): Promise<RewriteResult> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/rewrite-with-context`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to rewrite page');
  }

  return await response.json();
}

export async function fetchLatestRecommendations(pageId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('results')
    .select('recommendations')
    .eq('page_id', pageId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return [];
  }

  const recommendations = data.recommendations as any;
  return recommendations?.recommendations || recommendations || [];
}

export async function fetchPersonaAggregatedResults(personaId: string, pageId: string) {
  const { data, error } = await supabase
    .from('persona_results')
    .select('*')
    .eq('persona_id', personaId)
    .eq('page_id', pageId);

  if (error) throw error;

  if (!data || data.length === 0) {
    return null;
  }

  const avgScores = {
    relevance: data.reduce((sum, r) => sum + r.relevance_score, 0) / data.length,
    comprehension: data.reduce((sum, r) => sum + r.comprehension_score, 0) / data.length,
    visibility: data.reduce((sum, r) => sum + r.visibility_score, 0) / data.length,
    recommendation: data.reduce((sum, r) => sum + r.recommendation_score, 0) / data.length,
    global: data.reduce((sum, r) => sum + r.global_geo_score, 0) / data.length,
  };

  const allRecommendations = data
    .flatMap(r => {
      const recs = r.recommendations as any;
      return recs?.recommendations || recs || [];
    })
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

  return {
    avgScores,
    allRecommendations,
    totalTests: data.length,
    results: data,
  };
}

export async function scoreIndexability(pageId: string): Promise<IndexabilityResult> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/indexability-score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pageId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to score indexability');
  }

  return await response.json();
}

export async function fetchIndexabilityResults(pageId: string): Promise<IndexabilityResult[]> {
  const { data, error } = await supabase
    .from('indexability_results')
    .select('*')
    .eq('page_id', pageId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(result => ({
    id: result.id,
    page_id: result.page_id,
    html_indexability_score: result.html_indexability_score,
    structure_clarity_score: result.structure_clarity_score,
    entity_clarity_score: result.entity_clarity_score,
    content_scannability_score: result.content_scannability_score,
    issues: (result.issues as any) || [],
    suggestions: (result.suggestions as any) || [],
    created_at: result.created_at
  }));
}

export async function fetchIndexabilityStats() {
  try {
    const { data, error } = await supabase
      .from('indexability_results')
      .select('html_indexability_score, page_id, created_at');
    
    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        avgIndexability: 0,
        pagesWithScores: 0,
        lowIndexabilityPages: []
      };
    }

    const latestScores = new Map<string, { score: number; timestamp: string }>();
    
    data.forEach(result => {
      const existing = latestScores.get(result.page_id);
      if (!existing || new Date(result.created_at) > new Date(existing.timestamp)) {
        latestScores.set(result.page_id, {
          score: result.html_indexability_score,
          timestamp: result.created_at
        });
      }
    });

    const scores = Array.from(latestScores.values()).map(s => s.score);
    const avgIndexability = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const lowIndexabilityPages = Array.from(latestScores.entries())
      .filter(([_, data]) => data.score < 0.6)
      .map(([pageId]) => pageId);

    return {
      avgIndexability,
      pagesWithScores: latestScores.size,
      lowIndexabilityPages
    };
  } catch (error) {
    console.error('Error fetching indexability stats:', error);
    return {
      avgIndexability: 0,
      pagesWithScores: 0,
      lowIndexabilityPages: []
    };
  }
}

