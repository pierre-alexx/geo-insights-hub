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
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate BNP domain
    const urlObj = new URL(url);
    const validDomains = ['bnpparibas.com', 'group.bnpparibas'];
    const isValidDomain = validDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );

    if (!isValidDomain) {
      return new Response(
        JSON.stringify({ error: 'URL must be from a BNP Paribas domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching page:', url);

    // Fetch the page
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GEO-Analyzer/1.0)'
      }
    });

    if (!pageResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch page: ${pageResponse.statusText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await pageResponse.text();
    console.log('Page fetched, size:', html.length);

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if page exists
    const { data: existingPage } = await supabase
      .from('pages')
      .select('id')
      .eq('url', url)
      .single();

    let pageData;

    if (existingPage) {
      // Update existing page
      const { data, error } = await supabase
        .from('pages')
        .update({
          title,
          html_content: html,
          fetch_timestamp: new Date().toISOString()
        })
        .eq('id', existingPage.id)
        .select()
        .single();

      if (error) throw error;
      pageData = data;
      console.log('Page updated:', pageData.id);
    } else {
      // Insert new page
      const { data, error } = await supabase
        .from('pages')
        .insert({
          url,
          title,
          html_content: html
        })
        .select()
        .single();

      if (error) throw error;
      pageData = data;
      console.log('Page created:', pageData.id);
    }

    return new Response(
      JSON.stringify({
        pageId: pageData.id,
        url: pageData.url,
        title: pageData.title,
        html: html.substring(0, 1000) + '...' // Return truncated HTML for preview
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-page:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
