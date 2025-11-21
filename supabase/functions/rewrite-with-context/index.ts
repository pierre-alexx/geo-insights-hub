import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pageId, personaId, recommendations, weak_points, opportunities, persona_results, mode } = await req.json();

    if (!pageId) {
      throw new Error("pageId is required");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch page HTML
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      throw new Error(`Page not found: ${pageError?.message}`);
    }

    // 2. Fetch persona (optional)
    let persona = null;
    if (personaId) {
      const { data: personaData, error: personaError } = await supabase
        .from('personas')
        .select('*')
        .eq('id', personaId)
        .single();

      if (!personaError && personaData) {
        persona = personaData;
      }
    }

    // 3. Fetch aggregated persona GEO insights (if persona mode)
    let aggregatedInsights = null;
    if (mode === 'persona' && personaId) {
      const { data: results, error: resultsError } = await supabase
        .from('persona_results')
        .select('*')
        .eq('persona_id', personaId)
        .eq('page_id', pageId);

      if (!resultsError && results && results.length > 0) {
        const avgScores = {
          relevance: results.reduce((sum, r) => sum + r.relevance_score, 0) / results.length,
          comprehension: results.reduce((sum, r) => sum + r.comprehension_score, 0) / results.length,
          visibility: results.reduce((sum, r) => sum + r.visibility_score, 0) / results.length,
          recommendation: results.reduce((sum, r) => sum + r.recommendation_score, 0) / results.length,
        };

        const allRecommendations = results
          .flatMap(r => (r.recommendations as any)?.recommendations || [])
          .filter((v, i, a) => a.indexOf(v) === i);

        aggregatedInsights = {
          avgScores,
          allRecommendations,
          totalTests: results.length,
        };
      }
    }

    // 4. RAG retrieval
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const contextForEmbedding = [
      page.html_content?.substring(0, 2000) || "",
      persona ? `Persona: ${persona.name} - ${persona.description}` : "",
      recommendations ? recommendations.join(", ") : "",
    ].filter(Boolean).join("\n");

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: contextForEmbedding,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding failed: ${await embeddingResponse.text()}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    const { data: playbookChunks, error: playbookError } = await supabase.rpc(
      'match_playbook_chunks',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 5,
      }
    );

    if (playbookError) {
      console.error("Playbook RAG error:", playbookError);
    }

    // 5. Unified GEO Engine call
    const geoEnginePayload = {
      task: "rewrite",
      pageHtml: page.html_content,
      pageUrl: page.url,
      extraContext: {
        mode,
        persona: persona ? {
          name: persona.name,
          description: persona.description,
          goal: persona.goal,
          needs: persona.needs,
          risk_profile: persona.risk_profile,
        } : null,
        recommendations: recommendations || [],
        weak_points: weak_points || [],
        opportunities: opportunities || [],
        persona_results: persona_results || [],
        aggregatedInsights,
        playbook_chunks: playbookChunks || [],
      },
    };

    const { data: geoEngineData, error: geoEngineError } = await supabase.functions.invoke('geo-engine', {
      body: geoEnginePayload,
    });

    if (geoEngineError) {
      console.error('GEO Engine invocation error:', geoEngineError);
      console.error('GEO Engine payload was:', JSON.stringify(geoEnginePayload, null, 2).substring(0, 1000));
      throw new Error(`GEO Engine error: ${geoEngineError.message || JSON.stringify(geoEngineError)}`);
    }

    if (!geoEngineData) {
      throw new Error('GEO Engine returned no data');
    }

    console.log('GEO Engine response received successfully');
    console.log('Response keys:', Object.keys(geoEngineData));

    // 6. Return response
    return new Response(JSON.stringify({
      new_page_html: geoEngineData.new_page_html || "",
      new_page_outline: geoEngineData.new_page_outline || "",
      geo_rationale: geoEngineData.geo_rationale || "",
      persona_rationale: geoEngineData.persona_rationale || "",
      original_page_html: page.html_content,
      page_url: page.url,
      page_title: page.title,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in rewrite-with-context:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
