import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bearType } = await req.json();

    const prompts = {
      'brown': 'A cute, friendly brown bear mascot illustration, simple cartoon style, smiling face, soft round features, warm colors, isolated on transparent background',
      'polar': 'A cute, friendly polar bear mascot illustration, simple cartoon style, white fluffy fur, smiling face, soft round features, cool colors, isolated on transparent background',
      'panda': 'A cute, friendly panda bear mascot illustration, simple cartoon style, black and white fur, smiling face, soft round features, isolated on transparent background',
      'koala': 'A cute, friendly koala bear mascot illustration, simple cartoon style, gray fluffy fur, big ears, smiling face, soft round features, isolated on transparent background',
      'teddy': 'A cute, friendly teddy bear mascot illustration, simple cartoon style, plush toy appearance, button eyes, smiling face, soft round features, warm brown colors, isolated on transparent background',
      'fancy': 'A cute, friendly fancy bear mascot illustration wearing a small crown or bow, simple cartoon style, elegant and sparkly, smiling face, soft round features, isolated on transparent background',
    };

    const prompt = prompts[bearType as keyof typeof prompts] || prompts.brown;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image"]
      })
    });

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
