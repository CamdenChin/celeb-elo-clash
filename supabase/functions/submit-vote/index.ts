import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const K_FACTOR = 32; // Elo K-factor for rating adjustments

function calculateEloChange(winnerRating: number, loserRating: number): { winnerNew: number; loserNew: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

  const winnerNew = winnerRating + K_FACTOR * (1 - expectedWinner);
  const loserNew = loserRating + K_FACTOR * (0 - expectedLoser);

  return { winnerNew, loserNew };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { winnerId, loserId } = await req.json();

    if (!winnerId || !loserId) {
      return new Response(
        JSON.stringify({ error: 'winnerId and loserId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processing vote: Winner ${winnerId} vs Loser ${loserId}`);

    // Get both celebrities
    const { data: celebrities, error: fetchError } = await supabase
      .from('celebrities')
      .select('*')
      .in('id', [winnerId, loserId]);

    if (fetchError || !celebrities || celebrities.length !== 2) {
      console.error('Error fetching celebrities:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch celebrities' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const winner = celebrities.find((c) => c.id === winnerId)!;
    const loser = celebrities.find((c) => c.id === loserId)!;

    const previousWinnerElo = parseFloat(winner.elo_rating);
    const previousLoserElo = parseFloat(loser.elo_rating);

    // Calculate new Elo ratings
    const { winnerNew, loserNew } = calculateEloChange(previousWinnerElo, previousLoserElo);

    console.log(`Elo changes: Winner ${previousWinnerElo} -> ${winnerNew}, Loser ${previousLoserElo} -> ${loserNew}`);

    // Update both celebrities
    const { error: updateWinnerError } = await supabase
      .from('celebrities')
      .update({
        elo_rating: winnerNew.toFixed(2),
        games_played: winner.games_played + 1,
        wins: winner.wins + 1,
      })
      .eq('id', winnerId);

    if (updateWinnerError) {
      console.error('Error updating winner:', updateWinnerError);
      throw updateWinnerError;
    }

    const { error: updateLoserError } = await supabase
      .from('celebrities')
      .update({
        elo_rating: loserNew.toFixed(2),
        games_played: loser.games_played + 1,
        losses: loser.losses + 1,
      })
      .eq('id', loserId);

    if (updateLoserError) {
      console.error('Error updating loser:', updateLoserError);
      throw updateLoserError;
    }

    // Record the matchup
    const { error: matchupError } = await supabase
      .from('matchups')
      .insert({
        winner_id: winnerId,
        loser_id: loserId,
        winner_previous_elo: previousWinnerElo,
        loser_previous_elo: previousLoserElo,
        winner_new_elo: winnerNew,
        loser_new_elo: loserNew,
      });

    if (matchupError) {
      console.error('Error recording matchup:', matchupError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        winner: { id: winnerId, oldElo: previousWinnerElo, newElo: winnerNew },
        loser: { id: loserId, oldElo: previousLoserElo, newElo: loserNew },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in submit-vote:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});