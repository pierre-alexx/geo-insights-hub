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

export async function geoEngine(payload: {
  task: 'score' | 'rewrite' | 'gap-analysis' | 'answer';
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

export interface CrawlResult {
  pagesDiscovered: number;
  pagesUpdated: number;
  pagesSkipped: number;
  tree: TreeNode[];
}

export interface TreeNode {
  url: string;
  title: string;
  depth: number;
  children: TreeNode[];
}

export async function crawlSite(startUrl: string, maxDepth: number): Promise<CrawlResult> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/crawl-site`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ startUrl, maxDepth })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to crawl site');
  }

  return await response.json();
}

export async function refreshOldPages(): Promise<{ pagesRefreshed: number; pagesFailed: number }> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/crawl-refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to refresh pages');
  }

  return await response.json();
}

export async function autoGeoTestAllPages(): Promise<void> {
  const pages = await fetchPages();
  
  const defaultPrompt = "Que propose cette page ? Résume et explique son intérêt pour un client BNP PB.";
  
  for (const page of pages) {
    try {
      await runPageGeoTest(page.id, "general", defaultPrompt);
    } catch (error) {
      console.error(`Failed to test page ${page.url}:`, error);
    }
  }
}

export async function fetchCoverageStats() {
  try {
    const { data: pages, error } = await supabase
      .from('pages')
      .select('id, crawl_status, depth, fetch_timestamp');

    if (error) throw error;

    const totalPages = pages?.length || 0;
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentPages = pages?.filter(p => new Date(p.fetch_timestamp) > twoDaysAgo).length || 0;

    const depthCounts: Record<number, number> = {};
    pages?.forEach((p: any) => {
      const depth = p.depth || 0;
      depthCounts[depth] = (depthCounts[depth] || 0) + 1;
    });

    const stats = await fetchPageStats();

    return {
      totalPages,
      recentPagesPercent: totalPages > 0 ? (recentPages / totalPages) * 100 : 0,
      depthCounts,
      avgGeoScore: stats.avgGlobalGeoScore
    };
  } catch (error) {
    console.error('Error fetching coverage stats:', error);
    return {
      totalPages: 0,
      recentPagesPercent: 0,
      depthCounts: {},
      avgGeoScore: 0
    };
  }
}

export async function fetchSiteTree(): Promise<TreeNode[]> {
  try {
    const { data: pages, error } = await supabase
      .from('pages')
      .select('id, url, title, depth, parent_url');

    if (error) throw error;

    const pageMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Build tree structure
    pages?.forEach((page: any) => {
      const node: TreeNode = {
        url: page.url,
        title: page.title || 'Untitled',
        depth: page.depth || 0,
        children: []
      };
      pageMap.set(page.url, node);
    });

    // Connect parent-child relationships
    pages?.forEach((page: any) => {
      const node = pageMap.get(page.url);
      if (!node) return;

      if (!page.parent_url || page.depth === 0) {
        rootNodes.push(node);
      } else if (pageMap.has(page.parent_url)) {
        pageMap.get(page.parent_url)!.children.push(node);
      }
    });

    return rootNodes;
  } catch (error) {
    console.error('Error fetching site tree:', error);
    return [];
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
    .eq('persona_id', personaId)
    .order('timestamp', { ascending: false });

  if (pageId) {
    query = query.eq('page_id', pageId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}
