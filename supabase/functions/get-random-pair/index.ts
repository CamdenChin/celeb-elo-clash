import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching random pair of celebrities...');

    // Get total count
    const { count } = await supabase
      .from('celebrities')
      .select('*', { count: 'exact', head: true });

    if (!count || count < 2) {
      return new Response(
        JSON.stringify({ error: 'Not enough celebrities in database' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get two random celebrities
    // First, get a random offset for the first celebrity
    const offset1 = Math.floor(Math.random() * count);
    const { data: celeb1Data } = await supabase
      .from('celebrities')
      .select('*')
      .range(offset1, offset1)
      .single();

    // Get another random celebrity, different from the first
    let offset2 = Math.floor(Math.random() * count);
    while (offset2 === offset1) {
      offset2 = Math.floor(Math.random() * count);
    }
    
    const { data: celeb2Data } = await supabase
      .from('celebrities')
      .select('*')
      .range(offset2, offset2)
      .single();

    if (!celeb1Data || !celeb2Data) {
      throw new Error('Failed to fetch celebrities');
    }

    console.log(`Selected pair: ${celeb1Data.name} vs ${celeb2Data.name}`);

    return new Response(
      JSON.stringify({ celebrities: [celeb1Data, celeb2Data] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-random-pair:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});