import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_K_FACTOR = 32;

function calculateKFactor(clickTimeMs: number): number {
  // Fast clicks (<1s) = 1.5x multiplier, slow clicks (>5s) = 0.5x multiplier
  // Linear interpolation between 1s and 5s
  if (clickTimeMs < 1000) {
    return BASE_K_FACTOR * 1.5; // 48
  } else if (clickTimeMs > 5000) {
    return BASE_K_FACTOR * 0.5; // 16
  } else {
    // Interpolate: 1.5 at 1s down to 0.5 at 5s
    const t = (clickTimeMs - 1000) / 4000; // 0 to 1
    const multiplier = 1.5 - (t * 1.0); // 1.5 to 0.5
    return BASE_K_FACTOR * multiplier;
  }
}

function calculateEloChange(winnerRating: number, loserRating: number, clickTimeMs: number): { winnerNew: number; loserNew: number } {
  const kFactor = calculateKFactor(clickTimeMs);
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
  
  const winnerNew = winnerRating + kFactor * (1 - expectedWinner);
  const loserNew = loserRating + kFactor * (0 - expectedLoser);
  
  return { winnerNew, loserNew };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { winnerId, loserId, userId, clickTimeMs } = await req.json();
    
    if (!winnerId || !loserId) {
      return new Response(
        JSON.stringify({ error: 'winnerId and loserId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user already voted on this exact matchup (only if authenticated)
    if (userId) {
      const { data: existingVote } = await supabase
        .from('matchups')
        .select('id')
        .eq('user_id', userId)
        .eq('winner_id', winnerId)
        .eq('loser_id', loserId)
        .maybeSingle();

      if (existingVote) {
        return new Response(
          JSON.stringify({ error: 'User has already voted on this matchup' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch current ratings
    const { data: winner, error: winnerError } = await supabase
      .from('celebrities')
      .select('elo_rating, games_played, wins')
      .eq('id', winnerId)
      .single();

    if (winnerError || !winner) {
      return new Response(
        JSON.stringify({ error: 'Winner not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: loser, error: loserError } = await supabase
      .from('celebrities')
      .select('elo_rating, games_played, losses')
      .eq('id', loserId)
      .single();

    if (loserError || !loser) {
      return new Response(
        JSON.stringify({ error: 'Loser not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate new Elo ratings with click speed factor
    const { winnerNew, loserNew } = calculateEloChange(
      Number(winner.elo_rating),
      Number(loser.elo_rating),
      clickTimeMs || 3000 // Default to 3s if not provided
    );

    // Update winner
    const { error: updateWinnerError } = await supabase
      .from('celebrities')
      .update({
        elo_rating: winnerNew,
        games_played: winner.games_played + 1,
        wins: winner.wins + 1,
      })
      .eq('id', winnerId);

    if (updateWinnerError) {
      console.error('Error updating winner:', updateWinnerError);
      return new Response(
        JSON.stringify({ error: 'Failed to update winner' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update loser
    const { error: updateLoserError } = await supabase
      .from('celebrities')
      .update({
        elo_rating: loserNew,
        games_played: loser.games_played + 1,
        losses: loser.losses + 1,
      })
      .eq('id', loserId);

    if (updateLoserError) {
      console.error('Error updating loser:', updateLoserError);
      return new Response(
        JSON.stringify({ error: 'Failed to update loser' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the matchup with optional user_id (null for anonymous)
    const { error: matchupError } = await supabase
      .from('matchups')
      .insert({
        winner_id: winnerId,
        loser_id: loserId,
        winner_previous_elo: Number(winner.elo_rating),
        loser_previous_elo: Number(loser.elo_rating),
        winner_new_elo: winnerNew,
        loser_new_elo: loserNew,
        user_id: userId || null,
      });

    if (matchupError) {
      console.error('Error recording matchup:', matchupError);
      return new Response(
        JSON.stringify({ error: 'Failed to record matchup' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        winnerNewRating: winnerNew,
        loserNewRating: loserNew,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in submit-vote function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
