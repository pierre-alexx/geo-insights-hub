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
    const { playbookContent, section } = await req.json();

    if (!playbookContent) {
      return new Response(
        JSON.stringify({ error: 'playbookContent is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Chunk the playbook content (300-500 tokens ~ 1200-2000 characters)
    const chunkSize = 1500;
    const chunks: string[] = [];
    
    for (let i = 0; i < playbookContent.length; i += chunkSize) {
      chunks.push(playbookContent.substring(i, i + chunkSize));
    }

    console.log(`Processing ${chunks.length} chunks`);

    const insertedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: chunk
        })
      });

      if (!embeddingResponse.ok) {
        console.error(`Failed to generate embedding for chunk ${i}`);
        continue;
      }

      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data[0].embedding;

      // Insert into database
      const { data, error } = await supabase
        .from('geo_playbook')
        .insert({
          section: section || 'General',
          chunk,
          embedding
        })
        .select()
        .single();

      if (error) {
        console.error(`Failed to insert chunk ${i}:`, error);
        continue;
      }

      insertedChunks.push(data.id);
      console.log(`Inserted chunk ${i + 1}/${chunks.length}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        chunksProcessed: chunks.length,
        chunksInserted: insertedChunks.length,
        chunkIds: insertedChunks
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in populate-playbook:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
