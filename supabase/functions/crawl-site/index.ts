import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrawlResult {
  pagesDiscovered: number;
  pagesUpdated: number;
  pagesSkipped: number;
  tree: TreeNode[];
}

interface TreeNode {
  url: string;
  title: string;
  depth: number;
  children: TreeNode[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startUrl, maxDepth = 2 } = await req.json();

    if (!startUrl) {
      return new Response(
        JSON.stringify({ error: 'startUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate BNP domain
    const urlObj = new URL(startUrl);
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting crawl:', { startUrl, maxDepth });

    // BFS crawl
    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number; parentUrl: string | null }> = [
      { url: startUrl, depth: 0, parentUrl: null }
    ];

    let pagesDiscovered = 0;
    let pagesUpdated = 0;
    let pagesSkipped = 0;

    const tree: Map<string, TreeNode> = new Map();

    while (queue.length > 0 && pagesDiscovered < 100) { // Safety limit
      const { url, depth, parentUrl } = queue.shift()!;

      // Skip if already visited or exceeds max depth
      if (visited.has(url) || depth > maxDepth) {
        pagesSkipped++;
        continue;
      }

      visited.add(url);

      try {
        // Check if page already exists
        const { data: existingPage } = await supabase
          .from('pages')
          .select('id')
          .eq('url', url)
          .single();

        if (existingPage) {
          console.log('Page already exists, skipping:', url);
          pagesSkipped++;
          continue;
        }

        // Fetch the page
        console.log('Fetching:', url);
        const pageResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache'
          }
        });

        if (!pageResponse.ok) {
          console.error('Failed to fetch:', url, pageResponse.status, pageResponse.statusText);
          
          // Store error status
          await supabase.from('pages').upsert({
            url,
            title: null,
            html_content: null,
            crawl_status: 'error',
            depth,
            parent_url: parentUrl,
            fetch_timestamp: new Date().toISOString()
          });
          
          pagesSkipped++;
          continue;
        }

        const contentType = pageResponse.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          console.log('Skipping non-HTML:', url);
          pagesSkipped++;
          continue;
        }

        const html = await pageResponse.text();

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

        // Store page in database
        const { data: newPage, error } = await supabase
          .from('pages')
          .upsert({
            url,
            title,
            html_content: html,
            crawl_status: 'fetched',
            depth,
            parent_url: parentUrl,
            fetch_timestamp: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Error storing page:', error);
          pagesSkipped++;
          continue;
        }

        pagesDiscovered++;
        if (existingPage) pagesUpdated++;

        // Build tree node
        const node: TreeNode = {
          url,
          title,
          depth,
          children: []
        };
        tree.set(url, node);

        if (parentUrl && tree.has(parentUrl)) {
          tree.get(parentUrl)!.children.push(node);
        }

        // Extract links if we haven't reached max depth
        if (depth < maxDepth) {
          const linkPattern = /<a[^>]+href=["']([^"']+)["']/gi;
          let match;
          
          while ((match = linkPattern.exec(html)) !== null) {
            let linkUrl = match[1];
            
            // Skip anchors, javascript, mailto, tel, etc.
            if (linkUrl.startsWith('#') || 
                linkUrl.startsWith('javascript:') ||
                linkUrl.startsWith('mailto:') ||
                linkUrl.startsWith('tel:')) {
              continue;
            }

            // Skip tracking URLs
            if (linkUrl.includes('utm_') || linkUrl.includes('track')) {
              continue;
            }

            // Skip assets
            if (linkUrl.match(/\.(pdf|jpg|jpeg|png|gif|svg|css|js|ico|woff|ttf)$/i)) {
              continue;
            }

            // Convert relative URLs to absolute
            try {
              const absoluteUrl = new URL(linkUrl, url);
              
              // Only crawl same domain
              const isSameDomain = validDomains.some(domain =>
                absoluteUrl.hostname === domain || absoluteUrl.hostname.endsWith(`.${domain}`)
              );

              if (isSameDomain && !visited.has(absoluteUrl.href)) {
                queue.push({
                  url: absoluteUrl.href,
                  depth: depth + 1,
                  parentUrl: url
                });
              }
            } catch (e) {
              // Invalid URL, skip
              continue;
            }
          }
        }

      } catch (error) {
        console.error('Error processing URL:', url, error);
        pagesSkipped++;
      }
    }

    // Build tree from root nodes
    const rootNodes = Array.from(tree.values()).filter(node => node.depth === 0);

    const result: CrawlResult = {
      pagesDiscovered,
      pagesUpdated,
      pagesSkipped,
      tree: rootNodes
    };

    console.log('Crawl complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in crawl-site:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});