import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personaId, pageId, numQuestions = 6 } = await req.json();

    if (!personaId || !pageId) {
      return new Response(JSON.stringify({ error: 'personaId and pageId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[persona-geo-test] Step 1: Fetching persona...');
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('*')
      .eq('id', personaId)
      .single();

    if (personaError || !persona) {
      console.error('[persona-geo-test] Persona fetch error:', personaError);
      return new Response(JSON.stringify({ error: 'Persona not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[persona-geo-test] Step 2: Fetching page...');
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      console.error('[persona-geo-test] Page fetch error:', pageError);
      return new Response(JSON.stringify({ error: 'Page not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[persona-geo-test] Step 3: Auto-generating persona-specific prompts...');
    const personaContext = `
Persona: ${persona.name}
Description: ${persona.description}
Goals: ${persona.goal}
Risk Profile: ${persona.risk_profile}
Needs: ${persona.needs}
`;

    const generateQuestionsResponse = await fetch(`${supabaseUrl}/functions/v1/geo-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        task: 'answer',
        pageHtml: page.html_content,
        pageUrl: page.url,
        promptText: `Generate exactly ${numQuestions} realistic, specific questions that this persona would ask about this page. Return ONLY a JSON array of question strings, nothing else. Example format: ["Question 1?", "Question 2?"]`,
        extraContext: personaContext,
      }),
    });

    if (!generateQuestionsResponse.ok) {
      const errorText = await generateQuestionsResponse.text();
      console.error('[persona-geo-test] Question generation error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate questions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const questionsData = await generateQuestionsResponse.json();
    console.log('[persona-geo-test] Questions response:', JSON.stringify(questionsData));
    let questions: string[] = [];
    
    try {
      const rawResult = questionsData.answer || questionsData.result || questionsData;

      if (typeof rawResult === 'string') {
        // Expecting a JSON array string like ["Question 1?", "Question 2?"]
        questions = JSON.parse(rawResult);
      } else if (Array.isArray(rawResult)) {
        questions = rawResult;
      } else if (rawResult && Array.isArray(rawResult.questions)) {
        questions = rawResult.questions;
      }
      
      // Filter out any undefined/null questions
      questions = questions.filter((q) => q && typeof q === 'string');
      
      // If no valid questions, use fallback
      if (questions.length === 0) {
        questions = [`What does this page offer for someone like ${persona.name}?`];
      }
    } catch (e) {
      console.error('[persona-geo-test] Failed to parse questions:', e);
      questions = [`What does this page offer for someone like ${persona.name}?`];
    }

    console.log('[persona-geo-test] Generated questions:', questions);

    console.log('[persona-geo-test] Step 4: Running multi-test GEO pipeline...');
    const individualResults = [];

    for (const question of questions) {
      console.log('[persona-geo-test] Testing question:', question);
      
      // Step 4a: Get LLM answer for this persona question
      const answerResponse = await fetch(`${supabaseUrl}/functions/v1/geo-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          task: 'answer',
          pageHtml: page.html_content,
          pageUrl: page.url,
          promptText: question,
          extraContext: personaContext,
        }),
      });

      if (!answerResponse.ok) {
        console.error('[persona-geo-test] Answer error for question:', question, await answerResponse.text());
        continue;
      }

      const answerData = await answerResponse.json();
      console.log('[persona-geo-test] Answer response:', JSON.stringify(answerData));
      const llmAnswer = (answerData && (answerData.answer || answerData.result)) || '';
      
      // Step 4b: Score the LLM answer using GEO engine
      const scoreResponse = await fetch(`${supabaseUrl}/functions/v1/geo-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          task: 'score',
          pageHtml: page.html_content,
          pageUrl: page.url,
          promptText: question,
          llmAnswer: llmAnswer,
          extraContext: personaContext,
        }),
      });

      if (!scoreResponse.ok) {
        console.error('[persona-geo-test] Score error for question:', question, await scoreResponse.text());
        continue;
      }

      const scoreData = await scoreResponse.json();
      console.log('[persona-geo-test] Score response:', JSON.stringify(scoreData));
      
      const result = scoreData.result || scoreData;

      if (!result) {
        console.error('[persona-geo-test] No result data for question:', question);
        continue;
      }

      const { error: insertError } = await supabase
        .from('persona_results')
        .insert({
          persona_id: personaId,
          page_id: pageId,
          prompt: question,
          llm_response: llmAnswer,
          relevance_score: result.relevance_score || 0,
          comprehension_score: result.comprehension_score || 0,
          visibility_score: result.visibility_score || 0,
          recommendation_score: result.recommendation_score || 0,
          global_geo_score: result.global_geo_score || 0,
          recommendations: result.recommendations || [],
        });

      if (insertError) {
        console.error('[persona-geo-test] Insert error:', insertError);
      }

      individualResults.push({
        question,
        llm_response: llmAnswer,
        relevance_score: result.relevance_score || 0,
        comprehension_score: result.comprehension_score || 0,
        visibility_score: result.visibility_score || 0,
        recommendation_score: result.recommendation_score || 0,
        global_geo_score: result.global_geo_score || 0,
        recommendations: result.recommendations || [],
      });
    }

    console.log('[persona-geo-test] Step 5: Aggregating persona-level insights...');
    const totalCount = Math.max(individualResults.length, 1);
    const avgRelevance = individualResults.reduce((sum, r) => sum + r.relevance_score, 0) / totalCount;
    const avgComprehension = individualResults.reduce((sum, r) => sum + r.comprehension_score, 0) / totalCount;
    const avgVisibility = individualResults.reduce((sum, r) => sum + r.visibility_score, 0) / totalCount;
    const avgRecommendation = individualResults.reduce((sum, r) => sum + r.recommendation_score, 0) / totalCount;
    const avgGeoScore = individualResults.reduce((sum, r) => sum + r.global_geo_score, 0) / totalCount;

    const gapAnalysisResponse = await fetch(`${supabaseUrl}/functions/v1/geo-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        task: 'gap-analysis',
        pageHtml: page.html_content,
        pageUrl: page.url,
        extraContext: JSON.stringify({
          personaDescription: personaContext,
          questions: questions,
          results: individualResults,
          avgScores: {
            relevance: avgRelevance,
            comprehension: avgComprehension,
            visibility: avgVisibility,
            recommendation: avgRecommendation,
            global: avgGeoScore,
          },
        }),
      }),
    });

    let gapAnalysis = {
      persona_strengths: [],
      persona_weaknesses: [],
      persona_opportunities: [],
      persona_recommendations: [],
    };

    if (gapAnalysisResponse.ok) {
      const gapData = await gapAnalysisResponse.json();
      console.log('[persona-geo-test] Gap analysis response:', JSON.stringify(gapData));
      try {
        const rawResult = gapData.result || gapData;
        let parsedGap;
        
        if (typeof rawResult === 'string') {
          parsedGap = JSON.parse(rawResult);
        } else {
          parsedGap = rawResult;
        }
        
        // Only update if we got valid data
        if (parsedGap && typeof parsedGap === 'object') {
          gapAnalysis = {
            persona_strengths: parsedGap.persona_strengths || parsedGap.strengths || [],
            persona_weaknesses: parsedGap.persona_weaknesses || parsedGap.weaknesses || [],
            persona_opportunities: parsedGap.persona_opportunities || parsedGap.opportunities || [],
            persona_recommendations: parsedGap.persona_recommendations || parsedGap.recommendations || [],
          };
        }
      } catch (e) {
        console.error('[persona-geo-test] Failed to parse gap analysis:', e);
      }
    }

    console.log('[persona-geo-test] Step 6: Returning final payload...');
    return new Response(JSON.stringify({
      questions,
      individual_results: individualResults,
      aggregated: {
        avg_relevance: avgRelevance,
        avg_comprehension: avgComprehension,
        avg_visibility: avgVisibility,
        avg_recommendation: avgRecommendation,
        avg_geo_score: avgGeoScore,
        persona_strengths: gapAnalysis.persona_strengths || [],
        persona_weaknesses: gapAnalysis.persona_weaknesses || [],
        persona_opportunities: gapAnalysis.persona_opportunities || [],
        persona_recommendations: gapAnalysis.persona_recommendations || [],
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[persona-geo-test] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
