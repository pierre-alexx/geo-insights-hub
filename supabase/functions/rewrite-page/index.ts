import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      return new Response(
        JSON.stringify({ error: 'pageId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      return new Response(
        JSON.stringify({ error: 'Page not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Rewriting page:', page.url);

    // Call geo-engine for rewrite
    const geoEngineResponse = await fetch(`${supabaseUrl}/functions/v1/geo-engine`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: 'rewrite',
        pageHtml: page.html_content,
        pageUrl: page.url
      })
    });

    if (!geoEngineResponse.ok) {
      const errorData = await geoEngineResponse.json();
      console.error('Geo-engine error:', errorData);
      throw new Error(`Geo-engine error: ${errorData.error || 'Unknown error'}`);
    }

    const aiResponse = await geoEngineResponse.json();
    console.log('AI rewrite complete');

    // Insert rewrite into database
    const { data: rewrite, error: rewriteError } = await supabase
      .from('rewrites')
      .insert({
        page_id: pageId,
        original_html: page.html_content,
        rewritten_html: aiResponse.rewritten_html,
        summary: aiResponse.summary,
        geo_rationale: aiResponse.geo_rationale
      })
      .select()
      .single();

    if (rewriteError) {
      console.error('Error saving rewrite:', rewriteError);
      throw rewriteError;
    }

    console.log('Rewrite saved:', rewrite.id);

    return new Response(
      JSON.stringify({
        id: rewrite.id,
        pageId: rewrite.page_id,
        rewrittenHtml: rewrite.rewritten_html,
        summary: rewrite.summary,
        geoRationale: rewrite.geo_rationale,
        timestamp: rewrite.timestamp
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in rewrite-page:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
