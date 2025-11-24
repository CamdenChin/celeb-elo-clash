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

    // 30% chance to do fully random pairing (mix of rated/unrated)
    const useRandomPairing = Math.random() < 0.3;

    if (useRandomPairing) {
      // Fully random pairing - get two random celebrities
      const offset1 = Math.floor(Math.random() * count);
      let offset2 = Math.floor(Math.random() * count);
      while (offset2 === offset1) {
        offset2 = Math.floor(Math.random() * count);
      }

      const { data: celeb1Data } = await supabase
        .from('celebrities')
        .select('*')
        .range(offset1, offset1)
        .single();

      const { data: celeb2Data } = await supabase
        .from('celebrities')
        .select('*')
        .range(offset2, offset2)
        .single();

      if (!celeb1Data || !celeb2Data) {
        throw new Error('Failed to fetch random celebrities');
      }

      console.log(`Selected pair (random): ${celeb1Data.name} (${celeb1Data.elo_rating}) vs ${celeb2Data.name} (${celeb2Data.elo_rating})`);
      
      return new Response(
        JSON.stringify({ celebrities: [celeb1Data, celeb2Data] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 70% chance to use ELO-based matching
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

    // First try to find celebrities with exact same ELO
    const { data: exactMatchCelebs } = await supabase
      .from('celebrities')
      .select('*')
      .eq('elo_rating', celeb1Data.elo_rating)
      .neq('id', celeb1Data.id);

    if (exactMatchCelebs && exactMatchCelebs.length > 0) {
      // Found exact ELO match
      const randomIndex = Math.floor(Math.random() * exactMatchCelebs.length);
      const celeb2Data = exactMatchCelebs[randomIndex];
      
      console.log(`Selected pair (exact ELO match): ${celeb1Data.name} (${celeb1Data.elo_rating}) vs ${celeb2Data.name} (${celeb2Data.elo_rating})`);
      
      return new Response(
        JSON.stringify({ celebrities: [celeb1Data, celeb2Data] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No exact match found, find the nearest ELO
    console.log('No exact ELO match, finding nearest ELO...');
    
    const { data: allCelebs } = await supabase
      .from('celebrities')
      .select('*')
      .neq('id', celeb1Data.id);

    if (!allCelebs || allCelebs.length === 0) {
      throw new Error('No other celebrities available');
    }

    // Find celebrity with smallest ELO difference
    let nearestCeleb = allCelebs[0];
    let smallestDiff = Math.abs(Number(allCelebs[0].elo_rating) - Number(celeb1Data.elo_rating));

    for (const celeb of allCelebs) {
      const diff = Math.abs(Number(celeb.elo_rating) - Number(celeb1Data.elo_rating));
      if (diff < smallestDiff) {
        smallestDiff = diff;
        nearestCeleb = celeb;
      }
    }

    // Get all celebrities with the same "nearest" ELO difference
    const nearestEloCelebs = allCelebs.filter(celeb => 
      Math.abs(Number(celeb.elo_rating) - Number(celeb1Data.elo_rating)) === smallestDiff
    );

    // Randomly select one from the nearest ELO group
    const randomIndex = Math.floor(Math.random() * nearestEloCelebs.length);
    const celeb2Data = nearestEloCelebs[randomIndex];

    console.log(`Selected pair (nearest ELO): ${celeb1Data.name} (${celeb1Data.elo_rating}) vs ${celeb2Data.name} (${celeb2Data.elo_rating}), Elo diff: ${smallestDiff}`);

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