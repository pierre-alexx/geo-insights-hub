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
    const { pageId, promptType, promptText } = await req.json();

    if (!pageId || !promptType || !promptText) {
      return new Response(
        JSON.stringify({ error: 'pageId, promptType, and promptText are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching page from database:', pageId);

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

    console.log('Page fetched:', page.url);

    // Step 1: Get LLM answer using geo-engine
    console.log('Calling geo-engine for answer...');
    
    const answerResponse = await fetch(`${supabaseUrl}/functions/v1/geo-engine`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: 'answer',
        pageHtml: page.html_content,
        pageUrl: page.url,
        promptText,
        promptType
      })
    });

    if (!answerResponse.ok) {
      const errorText = await answerResponse.text();
      console.error('Geo-engine error (answer):', answerResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get LLM response', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const answerData = await answerResponse.json();
    const rawAnswer = answerData.answer;
    console.log('LLM response received');

    // Step 2: Score the answer using geo-engine
    console.log('Calling geo-engine for scoring...');

    const scoringResponse = await fetch(`${supabaseUrl}/functions/v1/geo-engine`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: 'score',
        pageHtml: page.html_content,
        pageUrl: page.url,
        promptText,
        promptType,
        llmAnswer: rawAnswer
      })
    });

    if (!scoringResponse.ok) {
      const errorText = await scoringResponse.text();
      console.error('Geo-engine error (scoring):', scoringResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to score response', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scores = await scoringResponse.json();
    console.log('Scoring response received');

    const result = {
      llmResponse: rawAnswer,
      relevanceScore: scores.relevance_score || 0.5,
      comprehensionScore: scores.comprehension_score || 0.5,
      visibilityScore: scores.visibility_score || 0.5,
      recommendationScore: scores.recommendation_score || 0.5,
      globalGeoScore: scores.global_geo_score || 0.5,
      recommendations: scores.recommendations || []
    };

    console.log('Test completed successfully');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in run-geo-test:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
