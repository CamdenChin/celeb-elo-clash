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

    const { format, minVotes, minElo, maxElo } = await req.json();

    console.log('Exporting dataset with filters:', { format, minVotes, minElo, maxElo });

    // Build query with filters
    let query = supabase
      .from('celebrities')
      .select('*')
      .gte('games_played', minVotes || 0);

    if (minElo) {
      query = query.gte('elo_rating', minElo);
    }
    if (maxElo) {
      query = query.lte('elo_rating', maxElo);
    }

    const { data: celebrities, error } = await query.order('elo_rating', { ascending: false });

    if (error) throw error;

    if (!celebrities || celebrities.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No celebrities match the specified filters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find min/max ELO for normalization
    const eloRatings = celebrities.map(c => Number(c.elo_rating));
    const minEloValue = Math.min(...eloRatings);
    const maxEloValue = Math.max(...eloRatings);

    console.log(`ELO range: ${minEloValue} - ${maxEloValue}`);

    // Normalize ELO to 1-10 scale
    const normalizeElo = (elo: number): number => {
      if (maxEloValue === minEloValue) return 5.5; // If all same, return middle value
      return 1 + ((elo - minEloValue) / (maxEloValue - minEloValue)) * 9;
    };

    // Calculate confidence score based on vote count
    const calculateConfidence = (votes: number): number => {
      // Confidence increases with votes, maxing out around 100 votes
      return Math.min(votes / 100, 1.0);
    };

    // Transform data
    const dataset = celebrities.map(celeb => ({
      id: celeb.id,
      name: celeb.name,
      image_url: celeb.image_path,
      normalized_rating: Number(normalizeElo(Number(celeb.elo_rating)).toFixed(2)),
      raw_elo: Number(celeb.elo_rating),
      total_votes: celeb.games_played,
      wins: celeb.wins,
      losses: celeb.losses,
      win_rate: celeb.games_played > 0 
        ? Number((celeb.wins / celeb.games_played * 100).toFixed(2)) 
        : 0,
      confidence_score: Number(calculateConfidence(celeb.games_played).toFixed(3)),
    }));

    let output: string;

    if (format === 'json') {
      output = JSON.stringify(dataset, null, 2);
    } else {
      // CSV format
      const headers = [
        'id',
        'name',
        'image_url',
        'normalized_rating',
        'raw_elo',
        'total_votes',
        'wins',
        'losses',
        'win_rate',
        'confidence_score'
      ];
      
      const csvRows = [
        headers.join(','),
        ...dataset.map(row => [
          row.id,
          `"${row.name}"`,
          row.image_url,
          row.normalized_rating,
          row.raw_elo,
          row.total_votes,
          row.wins,
          row.losses,
          row.win_rate,
          row.confidence_score
        ].join(','))
      ];
      
      output = csvRows.join('\n');
    }

    console.log(`Export complete: ${dataset.length} celebrities`);

    return new Response(
      JSON.stringify({ dataset: output, count: dataset.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in export-dataset:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
