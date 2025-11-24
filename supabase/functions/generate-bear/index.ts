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
      'brown': 'A cute, friendly brown bear mascot illustration, simple cartoon style, smiling face, soft round features, warm colors, solid white background',
      'polar': 'A cute, friendly polar bear mascot illustration, simple cartoon style, white fluffy fur, smiling face, soft round features, cool colors, solid white background',
      'panda': 'A cute, friendly panda bear mascot illustration, simple cartoon style, black and white fur, smiling face, soft round features, solid white background',
      'koala': 'A cute, friendly koala bear mascot illustration, simple cartoon style, gray fluffy fur, big ears, smiling face, soft round features, solid white background',
      'teddy': 'A cute, friendly teddy bear mascot illustration, simple cartoon style, plush toy appearance, button eyes, smiling face, soft round features, warm brown colors, solid white background',
      'fancy': 'A cute, friendly fancy bear mascot illustration wearing a small crown or bow, simple cartoon style, elegant and sparkly, smiling face, soft round features, solid white background',
      'grizzly': 'A cute, friendly grizzly bear mascot illustration, simple cartoon style, dark brown shaggy fur, strong build, smiling face, soft round features, solid white background',
      'sun': 'A cute, friendly sun bear mascot illustration, simple cartoon style, black fur with golden chest marking, smiling face, soft round features, solid white background',
      'spectacled': 'A cute, friendly spectacled bear mascot illustration, simple cartoon style, black fur with white eye markings like glasses, smiling face, soft round features, solid white background',
      'sloth': 'A cute, friendly sloth bear mascot illustration, simple cartoon style, shaggy black fur, long snout, smiling face, soft round features, solid white background',
      'black': 'A cute, friendly black bear mascot illustration, simple cartoon style, glossy black fur, smiling face, soft round features, solid white background',
      'spirit': 'A cute, friendly spirit bear mascot illustration, simple cartoon style, rare white/cream fur with mystical glow, smiling face, soft round features, solid white background',
      'red-panda': 'A cute, friendly red panda mascot illustration, simple cartoon style, reddish-brown fur, white face markings, fluffy ringed tail, smiling face, soft round features, solid white background',
      'gummy': 'A cute, friendly gummy bear mascot illustration, simple cartoon style, translucent colorful jelly appearance, smiling face, soft round features, solid white background',
      'care': 'A cute, friendly care bear mascot illustration, simple cartoon style, pastel colored fur with heart symbol on belly, smiling face, soft round features, solid white background',
      'cosmic': 'A cute, friendly cosmic bear mascot illustration, simple cartoon style, galaxy-patterned fur with stars and nebula colors, smiling face, soft round features, solid white background',
    };

    const prompt = prompts[bearType as keyof typeof prompts] || prompts.brown;

    console.log('Generating bear image for type:', bearType);
    console.log('Using prompt:', prompt);

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
        modalities: ["image", "text"]
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      // If payment required (no credits), return emoji fallback
      if (response.status === 402) {
        const emojiFallbacks: Record<string, string> = {
          'brown': '🐻',
          'polar': '🐻‍❄️',
          'panda': '🐼',
          'koala': '🐨',
          'teddy': '🧸',
          'fancy': '👑🐻',
          'grizzly': '🐻',
          'sun': '☀️🐻',
          'spectacled': '👓🐻',
          'sloth': '🦥',
          'black': '🐻‍❄️',
          'spirit': '✨🐻',
          'red-panda': '🦊',
          'gummy': '🍬🐻',
          'care': '💝🐻',
          'cosmic': '🌌🐻',
        };
        
        const emoji = emojiFallbacks[bearType as keyof typeof emojiFallbacks] || '🐻';
        console.log('Using emoji fallback:', emoji);
        
        return new Response(
          JSON.stringify({ emoji }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Response data structure:', JSON.stringify({
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message,
      hasImages: !!data.choices?.[0]?.message?.images,
      imagesLength: data.choices?.[0]?.message?.images?.length
    }));
    
    // Check for image in response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('Full response:', JSON.stringify(data, null, 2));
      throw new Error("No image URL in response");
    }

    console.log('Successfully generated bear image');

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-bear:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
