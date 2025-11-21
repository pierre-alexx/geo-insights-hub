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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting scheduled refresh...');

    // Get pages older than 48 hours
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: oldPages, error: fetchError } = await supabase
      .from('pages')
      .select('id, url')
      .lt('fetch_timestamp', twoDaysAgo)
      .eq('crawl_status', 'fetched');

    if (fetchError) {
      console.error('Error fetching old pages:', fetchError);
      throw fetchError;
    }

    if (!oldPages || oldPages.length === 0) {
      console.log('No pages to refresh');
      return new Response(
        JSON.stringify({ message: 'No pages to refresh', pagesRefreshed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${oldPages.length} pages to refresh`);

    let pagesRefreshed = 0;
    let pagesFailed = 0;

    // Refresh each page
    for (const page of oldPages) {
      try {
        console.log('Refreshing:', page.url);
        
        const pageResponse = await fetch(page.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
          }
        });

        if (!pageResponse.ok) {
          console.error('Failed to fetch:', page.url, pageResponse.status, pageResponse.statusText);
          
          // Update status to error
          await supabase
            .from('pages')
            .update({
              crawl_status: 'error',
              fetch_timestamp: new Date().toISOString()
            })
            .eq('id', page.id);
          
          pagesFailed++;
          continue;
        }

        const html = await pageResponse.text();

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

        // Update page in database
        const { error: updateError } = await supabase
          .from('pages')
          .update({
            title,
            html_content: html,
            crawl_status: 'fetched',
            fetch_timestamp: new Date().toISOString()
          })
          .eq('id', page.id);

        if (updateError) {
          console.error('Error updating page:', updateError);
          pagesFailed++;
          continue;
        }

        pagesRefreshed++;
        console.log('Refreshed:', page.url);

      } catch (error) {
        console.error('Error refreshing page:', page.url, error);
        pagesFailed++;
      }
    }

    const result = {
      message: 'Refresh complete',
      pagesRefreshed,
      pagesFailed,
      totalProcessed: oldPages.length
    };

    console.log('Refresh complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in crawl-refresh:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});