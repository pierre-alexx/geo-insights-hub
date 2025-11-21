import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { promptType, promptText } = await req.json();

    if (!promptType || !promptText) {
      return new Response(
        JSON.stringify({ error: 'promptType and promptText are required' }),
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

    console.log('Processing GEO test:', { promptType, promptText });

    // Step 1: Get LLM response
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
            content: 'You are evaluating financial search queries. Provide a clear, concise response that a young investor would find useful. Always base your answer on general public knowledge. Do not hallucinate facts about any specific institution.'
          },
          {
            role: 'user',
            content: promptText
          }
        ],
        temperature: 0.7,
        max_completion_tokens: 500
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('OpenAI API error (first call):', llmResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get LLM response', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const llmData = await llmResponse.json();
    const rawAnswer = llmData.choices[0].message.content;
    console.log('LLM response received:', rawAnswer.substring(0, 100) + '...');

    // Step 2: Score the response
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
            content: `You are a GEO scoring engine. 
Given the raw LLM answer, extract structured scoring with this JSON schema:
{
  "presenceScore": 0 | 1 | 2,
  "sentimentScore": float (-1 to +1),
  "recommended": boolean,
  "recommendations": string[]
}

Rules:
- presenceScore: 
    0 = BNP not mentioned,
    1 = BNP mentioned neutrally,
    2 = BNP recommended or positively ranked.
- sentimentScore: evaluate tone around BNP only.
- recommended: true if BNP is recommended or positioned positively.
- recommendations: list 3 improvements to increase BNP visibility in LLM answers.

Return ONLY valid JSON, no markdown, no explanation.`
          },
          {
            role: 'user',
            content: `Score this LLM answer:\n\n${rawAnswer}`
          }
        ],
        temperature: 0.3,
        max_completion_tokens: 500
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
    
    // Clean up the response - remove markdown code blocks if present
    scoringContent = scoringContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log('Scoring response:', scoringContent);

    let scores;
    try {
      scores = JSON.parse(scoringContent);
    } catch (parseError) {
      console.error('Failed to parse scoring JSON:', parseError, scoringContent);
      // Fallback to default scores
      scores = {
        presenceScore: 0,
        sentimentScore: 0,
        recommended: false,
        recommendations: [
          'Improve structured content on wealth management',
          'Add clear entity-linked pages',
          'Publish FAQ optimized for LLM indexing'
        ]
      };
    }

    const result = {
      llmResponse: rawAnswer,
      presenceScore: scores.presenceScore,
      sentimentScore: scores.sentimentScore,
      recommended: scores.recommended,
      recommendations: scores.recommendations || []
    };

    console.log('Final result:', result);

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
