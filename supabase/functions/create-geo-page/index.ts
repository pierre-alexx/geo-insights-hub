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
    const {
      mode,
      personaId,
      pageTitle,
      pageGoal,
      targetAudience,
      tone,
      requiredSections,
      keyMessages,
      faqs,
      additionalContext,
      inspirationUrls
    } = await req.json();

    console.log('create-geo-page input:', { mode, personaId, pageTitle, pageGoal });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Fetch persona if in persona mode
    let persona = null;
    if (mode === 'persona' && personaId) {
      const { data: personaData, error: personaError } = await supabase
        .from('personas')
        .select('*')
        .eq('id', personaId)
        .single();

      if (personaError) throw personaError;
      persona = personaData;
      console.log('Fetched persona:', persona?.name);
    }

    // Step 2: Fetch and analyze inspiration URLs
    const inspirationContext: any[] = [];
    if (inspirationUrls && inspirationUrls.length > 0) {
      console.log('Fetching inspiration from', inspirationUrls.length, 'URLs');
      
      for (const url of inspirationUrls.slice(0, 5)) {
        try {
          const fetchResponse = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; BNP-GEO-Bot/1.0)',
            },
            signal: AbortSignal.timeout(10000),
          });

          if (!fetchResponse.ok) continue;
          
          const html = await fetchResponse.text();
          
          // Extract headings
          const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
          const h2Matches = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
          const h3Matches = [...html.matchAll(/<h3[^>]*>(.*?)<\/h3>/gi)];

          const stripTags = (str: string) => str.replace(/<[^>]*>/g, '').trim();

          inspirationContext.push({
            url,
            h1: h1Match ? stripTags(h1Match[1]) : '',
            h2s: h2Matches.slice(0, 5).map(m => stripTags(m[1])),
            h3s: h3Matches.slice(0, 5).map(m => stripTags(m[1])),
          });

          console.log('Extracted structure from:', url);
        } catch (error) {
          console.error('Failed to fetch inspiration URL:', url, error);
        }
      }
    }

    // Step 3: Build combined context
    const contextPayload = {
      mode: 'create',
      persona: persona ? {
        name: persona.name,
        description: persona.description,
        goal: persona.goal,
        risk_profile: persona.risk_profile,
        needs: persona.needs,
      } : null,
      pageTitle: pageTitle || 'New BNP Paribas Page',
      pageGoal: pageGoal || 'Provide clear information for clients',
      targetAudience: targetAudience || 'General wealth management clients',
      tone: tone || 'Professional, clear, and confident',
      requiredSections: requiredSections || '',
      keyMessages: keyMessages || '',
      faqs: faqs || '',
      userContext: additionalContext || '',
      inspiration: inspirationContext,
    };

    // Step 4: Call geo-engine with task "create"
    console.log('Calling geo-engine with create task');
    
    const { data: engineData, error: engineError } = await supabase.functions.invoke('geo-engine', {
      body: {
        task: 'create',
        extraContext: JSON.stringify(contextPayload),
      }
    });

    if (engineError) {
      console.error('geo-engine error:', engineError);
      throw engineError;
    }

    console.log('geo-engine response received');

    // Parse the result
    let result;
    if (typeof engineData === 'string') {
      // Strip markdown code blocks if present
      let cleaned = engineData.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '');
        cleaned = cleaned.replace(/\n?```\s*$/, '');
      }
      result = JSON.parse(cleaned.trim());
    } else {
      result = engineData;
    }

    const {
      new_page_html,
      new_page_outline,
      geo_rationale,
      persona_rationale,
      notes
    } = result;

    // Step 5: Save to generated_pages table
    const { data: savedPage, error: saveError } = await supabase
      .from('generated_pages')
      .insert({
        persona_id: personaId || null,
        html_content: new_page_html,
        outline: new_page_outline,
        rationale: geo_rationale,
        persona_rationale: persona_rationale || null,
        metadata: {
          pageTitle,
          pageGoal,
          targetAudience,
          tone,
          requiredSections,
          keyMessages,
          faqs,
          inspirationUrls,
          notes,
        }
      })
      .select()
      .single();

    if (saveError) throw saveError;

    console.log('Page saved successfully:', savedPage.id);

    return new Response(
      JSON.stringify({
        success: true,
        page: savedPage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in create-geo-page:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
