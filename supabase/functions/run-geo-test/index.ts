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

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching page from database:', pageId);

    // Fetch page content
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

    // Step A: Primary OpenAI call with page content
    const primaryPrompt = `PAGE CONTENT:
${page.html_content}

QUERY:
${promptText}`;

    console.log('Calling OpenAI for primary response...');

    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are answering a financial/wealth management question. You MUST consider the content of the provided BNP Paribas page as a primary source. Use it if relevant. Avoid inventing any content not present in the page.'
          },
          {
            role: 'user',
            content: primaryPrompt
          }
        ],
        temperature: 0.7,
        max_completion_tokens: 800
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('OpenAI API error (primary call):', llmResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get LLM response', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const llmData = await llmResponse.json();
    const rawAnswer = llmData.choices[0].message.content;
    console.log('LLM response received');

    // Step B: Scoring call
    const scoringPrompt = `PAGE CONTENT:
${page.html_content}

LLM ANSWER:
${rawAnswer}

USER QUERY WAS:
${promptText}`;

    console.log('Calling OpenAI for scoring...');

    const scoringResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `You are a page-level GEO evaluator.
Given the user page content AND the LLM answer, evaluate how well the page was used.

Return ONLY valid JSON matching:

{
  "relevance_score": float (0-1),
  "comprehension_score": float (0-1),
  "visibility_score": float (0-1),
  "recommendation_score": float (0-1),
  "global_geo_score": float (0-1),
  "recommendations": [string]
}

Definitions:
- relevance_score: does the answer use actual info from the page?
- comprehension_score: is the info interpreted correctly?
- visibility_score: is the page implicitly or explicitly surfaced in the narrative?
- recommendation_score: would the LLM suggest this page as a source?
- global_geo_score: weighted average of all scores.
- recommendations: list of 3-5 improvements to the page content or structure.

Return ONLY the JSON, no markdown formatting.`
          },
          {
            role: 'user',
            content: scoringPrompt
          }
        ],
        temperature: 0.3,
        max_completion_tokens: 600
      }),
    });

    if (!scoringResponse.ok) {
      const errorText = await scoringResponse.text();
      console.error('OpenAI API error (scoring call):', scoringResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to score response', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scoringData = await scoringResponse.json();
    let scoringContent = scoringData.choices[0].message.content;
    
    scoringContent = scoringContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log('Scoring response:', scoringContent);

    let scores;
    try {
      scores = JSON.parse(scoringContent);
    } catch (parseError) {
      console.error('Failed to parse scoring JSON:', parseError, scoringContent);
      scores = {
        relevance_score: 0.5,
        comprehension_score: 0.5,
        visibility_score: 0.5,
        recommendation_score: 0.5,
        global_geo_score: 0.5,
        recommendations: [
          'Improve page structure for better LLM parsing',
          'Add more semantic HTML tags',
          'Include clearer section headings'
        ]
      };
    }

    const result = {
      llmResponse: rawAnswer,
      relevanceScore: scores.relevance_score,
      comprehensionScore: scores.comprehension_score,
      visibilityScore: scores.visibility_score,
      recommendationScore: scores.recommendation_score,
      globalGeoScore: scores.global_geo_score,
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
