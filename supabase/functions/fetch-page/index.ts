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
        JSON.stringify({ 
          success: false,
          error: 'URL is required'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
 
    // Validate BNP domain - check if "bnpparibas" appears anywhere in the URL
    if (!url.toLowerCase().includes('bnpparibas')) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'URL must contain "bnpparibas"'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching page:', url);

    // Fetch the page with more realistic browser headers
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!pageResponse.ok) {
      console.error('Failed to fetch:', url, pageResponse.status, pageResponse.statusText);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Failed to fetch page: ${pageResponse.status} ${pageResponse.statusText}`,
          details: 'The page may be inaccessible or blocking automated requests'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        success: true,
        pageId: pageData.id,
        url: pageData.url,
        title: pageData.title,
        html: html.substring(0, 1000) + '...' // Return truncated HTML for preview
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-page:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Unknown error';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('http2 error') || errorMessage.includes('stream error')) {
        errorDetails = 'HTTP/2 connection failed. The server may be blocking automated requests or experiencing issues.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        errorDetails = 'Request timed out. The server took too long to respond.';
      } else if (errorMessage.includes('ECONNREFUSED')) {
        errorDetails = 'Connection refused. The server is not accepting connections.';
      } else if (errorMessage.includes('certificate')) {
        errorDetails = 'SSL certificate error. The server certificate may be invalid.';
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: errorDetails || 'Failed to fetch the page. The server may be temporarily unavailable or blocking requests.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
