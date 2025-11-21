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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch page
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

    // OpenAI API call
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a GEO optimization AI. 
Your goal is to rewrite a webpage so that LLMs can:
- understand it clearly
- reuse its content accurately
- index and recall it
- recommend it when relevant
- avoid hallucinations

Rewrite the page in a structured, clean, explicit, LLM-friendly way.

Constraints:
- Keep all factual content true.
- Do NOT invent non-public or restricted content.
- Improve clarity, structure, headings, definitions, entities, numbers, roles, benefits.
- Make relationships explicit.
- Use short sentences.
- Add an "Entity Definitions" section if needed.
- Add a "Why This Page Matters" section summarizing the purpose.
- Add semantic markers and structured sections that help LLMs.`;

    const userPrompt = `ORIGINAL PAGE HTML:
${page.html_content}

TASK:
Rewrite this page for LLM optimization. 
Return JSON:
{
  "rewritten_html": "...",
  "summary": "...",
  "geo_rationale": "..."
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 16000,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = JSON.parse(openaiData.choices[0].message.content);

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