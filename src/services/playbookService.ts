export async function populatePlaybook(playbookContent: string, section: string = 'General') {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/populate-playbook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playbookContent, section })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to populate playbook');
  }

  return await response.json();
}

export async function performGapAnalysis(pageId: string) {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const { supabase } = await import('@/integrations/supabase/client');
  
  const { data: page, error: pageError } = await supabase
    .from('pages')
    .select('*')
    .eq('id', pageId)
    .single();

  if (pageError || !page) {
    throw new Error('Page not found');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/geo-engine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task: 'gap-analysis',
      pageHtml: page.html_content,
      pageUrl: page.url
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to perform gap analysis');
  }

  return await response.json();
}
