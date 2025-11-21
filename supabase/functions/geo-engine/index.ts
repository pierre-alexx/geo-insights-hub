import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEO_STYLE_GUIDE = `
You are a GEO/AEO/AIO optimization engine.

Follow this framework for ALL reasoning, scoring, rewriting, recommendations, and analysis:

1. Direct Answer (AEO)
   - Start with a 1–2 sentence direct answer.
   - Provide a one-sentence definition.

2. Actionable Steps
   - Provide structured, step-by-step advice.
   - Use statistics, comparisons, and checklists.

3. Key Insight
   - Highlight the key takeaway and why it matters.

4. GEO Structured Optimization
   Include:
   - Statistics & sources
   - Comparisons (X vs Y)
   - Best practices
   - Subheadings (H2/H3)
   - Summary box

5. AIO Add-ons
   Provide 2–3 reusable prompts for next steps.

6. Community-backed Insight
   Use evidence-style phrasing inspired by Reddit and Quora expert answers.

7. Authority Stack
   Neutral, structured, encyclopedic, linked to a topic cluster.

Never break from this framework. It defines your reasoning and outputs.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task, pageHtml, pageUrl, promptText, promptType, llmAnswer, extraContext } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Generate embedding for query context
    const queryContext = promptText || pageHtml?.substring(0, 2000) || '';
    
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: queryContext
      })
    });

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Step 2: Retrieve relevant playbook chunks using vector search
    const { data: playbookChunks, error: vectorError } = await supabase.rpc('match_playbook_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5
    });

    let retrievedContext = '';
    if (playbookChunks && playbookChunks.length > 0) {
      retrievedContext = playbookChunks.map((chunk: any) => chunk.chunk).join('\n\n');
    }

    // Step 3: Build OpenAI prompt based on task
    let userPrompt = '';
    let responseFormat: any = { type: "json_object" };

    switch (task) {
      case 'score':
        userPrompt = `PAGE CONTENT:
${pageHtml}

LLM ANSWER:
${llmAnswer}

TASK:
Score the answer using the GEO framework.
Return ONLY this JSON:
{
  "relevance_score": float (0-1),
  "comprehension_score": float (0-1),
  "visibility_score": float (0-1),
  "recommendation_score": float (0-1),
  "global_geo_score": float (0-1),
  "recommendations": [string]
}`;
        break;

      case 'persona-score':
        userPrompt = `PAGE CONTENT:
${pageHtml}

PERSONA CONTEXT:
${extraContext || ''}

QUESTION:
${promptText}

TASK:
1) Answer the question as clearly and helpfully as possible for this persona, using the page content when relevant.
2) Then evaluate how well this answer uses the page according to the GEO framework.

Return ONLY this JSON:
{
  "llm_response": string,
  "relevance_score": float (0-1),
  "comprehension_score": float (0-1),
  "visibility_score": float (0-1),
  "recommendation_score": float (0-1),
  "global_geo_score": float (0-1),
  "recommendations": [string]
}`;
        break;

      case 'rewrite':
        const rewriteContext = extraContext ? JSON.stringify(extraContext, null, 2) : "";
        userPrompt = `PAGE CONTENT:
${pageHtml}

${rewriteContext ? `CONTEXT:\n${rewriteContext}\n\n` : ''}TASK:
Rewrite this page to be optimized for LLMs according to the GEO framework and playbook.
${extraContext?.recommendations?.length ? `Address these specific recommendations:\n${extraContext.recommendations.join('\n')}\n\n` : ''}${extraContext?.persona ? `Tailor the content for this persona:\nName: ${extraContext.persona.name}\nDescription: ${extraContext.persona.description}\nGoal: ${extraContext.persona.goal}\nNeeds: ${extraContext.persona.needs}\nRisk Profile: ${extraContext.persona.risk_profile}\n\n` : ''}Return your answer in the following PLAIN TEXT format using the exact section markers below:

===NEW_PAGE_HTML===
<full rewritten HTML here>
===END_NEW_PAGE_HTML===

===NEW_PAGE_OUTLINE===
<hierarchical outline as plain text>
===END_NEW_PAGE_OUTLINE===

===GEO_RATIONALE===
<explanation of improvements as plain text>
===END_GEO_RATIONALE===

===PERSONA_RATIONALE===
<persona-specific explanation as plain text, or leave empty if not applicable>
===END_PERSONA_RATIONALE===`;
        // For rewrite we want free-form text, not JSON response_format
        responseFormat = undefined;
        break;

      case 'gap-analysis':
        userPrompt = `PAGE CONTENT:
${pageHtml}

TASK:
Compare this page with the GEO playbook.
Identify missing sections, weak structure, unclear entities, weak comparisons, unclear stats.
Return JSON:
{
  "gaps": [...],
  "recommendations": [...],
  "improvement_opportunities": [...]
}`;
        break;

      case 'answer':
        userPrompt = `QUERY:
${promptText}

PAGE CONTENT:
${pageHtml}

TASK:
Answer this query using the GEO style.
Return the best possible answer, structured according to the playbook.`;
        responseFormat = undefined;
        break;

      case 'indexability':
        userPrompt = `PAGE HTML:
${pageHtml}

TASK:
Evaluate how indexable and LLM-friendly this HTML structure is.
Focus on:
- heading hierarchy (H1/H2/H3),
- clarity of sections,
- presence of definitions,
- explicit entities (products, services, client types),
- use of bullets/lists,
- presence of summary/recap blocks,
- length of paragraphs.

Return ONLY valid JSON:
{
  "html_indexability_score": float (0-1),
  "structure_clarity_score": float (0-1),
  "entity_clarity_score": float (0-1),
  "content_scannability_score": float (0-1),
  "issues": [string],
  "suggestions": [string]
}`;
        break;

      default:
        throw new Error('Invalid task type');
    }

    // Step 4: Call OpenAI with full context
    const messages = [
      { role: 'system', content: GEO_STYLE_GUIDE },
      { 
        role: 'system', 
        content: `These are the most relevant parts of the official GEO playbook:\n\n${retrievedContext}` 
      },
      { role: 'user', content: userPrompt }
    ];

    const openAIPayload: any = {
      model: 'gpt-4.1-mini-2025-04-14',
      messages,
      max_completion_tokens: 4000
    };

    if (responseFormat) {
      openAIPayload.response_format = responseFormat;
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openAIPayload)
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const content = openAIData.choices[0].message.content;

    // Step 5: Return the result
    let result;
    if (task === 'answer') {
      result = { answer: content };
    } else if (task === 'rewrite') {
      // For rewrite, parse the plain-text sections using markers
      const extractSection = (label: string) => {
        const startTag = `===${label}===`;
        const endTag = `===END_${label}===`;
        const startIndex = content.indexOf(startTag);
        if (startIndex === -1) return '';
        const afterStart = startIndex + startTag.length;
        const endIndex = content.indexOf(endTag, afterStart);
        const rawSection = endIndex === -1
          ? content.substring(afterStart)
          : content.substring(afterStart, endIndex);
        return rawSection.trim();
      };

      const newPageHtml = extractSection('NEW_PAGE_HTML');
      const newPageOutline = extractSection('NEW_PAGE_OUTLINE');
      const geoRationale = extractSection('GEO_RATIONALE');
      const personaRationale = extractSection('PERSONA_RATIONALE');

      result = {
        new_page_html: newPageHtml || '',
        new_page_outline: newPageOutline || '',
        geo_rationale: geoRationale || '',
        persona_rationale: personaRationale || null,
      };
    } else {
      try {
        // For scoring / gap-analysis tasks we still expect JSON
        result = JSON.parse(content);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Content that failed to parse (first 500 chars):', String(content).substring(0, 500));
        throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in geo-engine:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
