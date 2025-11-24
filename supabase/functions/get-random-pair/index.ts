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

    console.log('Fetching random pair of celebrities with similar Elo...');

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

    // Get first random celebrity
    const offset1 = Math.floor(Math.random() * count);
    const { data: celeb1Data } = await supabase
      .from('celebrities')
      .select('*')
      .range(offset1, offset1)
      .single();

    if (!celeb1Data) {
      throw new Error('Failed to fetch first celebrity');
    }

    // Find celebrities within ±200 Elo range of the first celebrity
    const eloRange = 200;
    const minElo = Number(celeb1Data.elo_rating) - eloRange;
    const maxElo = Number(celeb1Data.elo_rating) + eloRange;

    const { data: similarCelebs, error: similarError } = await supabase
      .from('celebrities')
      .select('*')
      .gte('elo_rating', minElo)
      .lte('elo_rating', maxElo)
      .neq('id', celeb1Data.id);

    if (similarError || !similarCelebs || similarCelebs.length === 0) {
      // Fallback: if no similar Elo celebrities found, get any random celebrity
      console.log('No similar Elo celebrities found, using fallback random selection');
      let offset2 = Math.floor(Math.random() * count);
      while (offset2 === offset1) {
        offset2 = Math.floor(Math.random() * count);
      }
      
      const { data: celeb2Data } = await supabase
        .from('celebrities')
        .select('*')
        .range(offset2, offset2)
        .single();

      if (!celeb2Data) {
        throw new Error('Failed to fetch second celebrity');
      }

      console.log(`Selected pair (fallback): ${celeb1Data.name} (${celeb1Data.elo_rating}) vs ${celeb2Data.name} (${celeb2Data.elo_rating})`);
      return new Response(
        JSON.stringify({ celebrities: [celeb1Data, celeb2Data] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select random celebrity from similar Elo range
    const randomIndex = Math.floor(Math.random() * similarCelebs.length);
    const celeb2Data = similarCelebs[randomIndex];

    if (!celeb2Data) {
      throw new Error('Failed to fetch second celebrity');
    }

    console.log(`Selected pair: ${celeb1Data.name} (${celeb1Data.elo_rating}) vs ${celeb2Data.name} (${celeb2Data.elo_rating}), Elo diff: ${Math.abs(Number(celeb1Data.elo_rating) - Number(celeb2Data.elo_rating))}`);

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