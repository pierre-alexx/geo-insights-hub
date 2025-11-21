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
    const { pageId } = await req.json();

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

    // 2. Call geo-engine with task: indexability
    const { data: geoEngineData, error: geoEngineError } = await supabase.functions.invoke('geo-engine', {
      body: {
        task: 'indexability',
        pageHtml: page.html_content,
        pageUrl: page.url
      }
    });

    if (geoEngineError) {
      console.error('GEO Engine invocation error:', geoEngineError);
      throw new Error(`GEO Engine error: ${geoEngineError.message || JSON.stringify(geoEngineError)}`);
    }

    if (!geoEngineData) {
      throw new Error('GEO Engine returned no data');
    }

    // 3. Store scores in indexability_results
    const { data: resultData, error: resultError } = await supabase
      .from('indexability_results')
      .insert({
        page_id: pageId,
        html_indexability_score: geoEngineData.html_indexability_score,
        structure_clarity_score: geoEngineData.structure_clarity_score,
        entity_clarity_score: geoEngineData.entity_clarity_score,
        content_scannability_score: geoEngineData.content_scannability_score,
        issues: geoEngineData.issues || [],
        suggestions: geoEngineData.suggestions || []
      })
      .select()
      .single();

    if (resultError) {
      console.error('Failed to store indexability result:', resultError);
      throw new Error(`Failed to store result: ${resultError.message}`);
    }

    // 4. Return the stored record
    return new Response(JSON.stringify(resultData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in indexability-score:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
