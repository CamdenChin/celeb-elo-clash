import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as zip from 'https://deno.land/x/zipjs@v2.7.34/index.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Receiving ZIP file upload...');
    
    // Get the ZIP file from the request
    const formData = await req.formData();
    const zipFile = formData.get('file') as File;
    
    if (!zipFile) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ZIP file: ${zipFile.name}, size: ${zipFile.size} bytes`);

    // Convert File to Uint8Array
    const arrayBuffer = await zipFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Create a blob from the array buffer
    const blob = new Blob([uint8Array]);
    
    // Unzip the file
    console.log('Unzipping file...');
    const reader = new zip.BlobReader(blob);
    const zipReader = new zip.ZipReader(reader);
    const entries = await zipReader.getEntries();

    console.log(`Found ${entries.length} files in ZIP`);

    const results: {
      success: string[];
      errors: string[];
      total: number;
    } = {
      success: [],
      errors: [],
      total: 0,
    };

    // Process each file in the ZIP
    for (const entry of entries) {
      // Skip directories and hidden files
      if (entry.directory || entry.filename.startsWith('__MACOSX') || entry.filename.startsWith('.')) {
        continue;
      }

      // Only process image files
      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(entry.filename);
      if (!isImage) {
        console.log(`Skipping non-image file: ${entry.filename}`);
        continue;
      }

      results.total++;

      try {
        console.log(`Processing: ${entry.filename}`);
        
        // Extract the file content
        const writer = new zip.BlobWriter();
        const fileBlob = await entry.getData!(writer);
        
        // Generate unique filename
        const fileExt = entry.filename.split('.').pop();
        const timestamp = Date.now();
        const fileName = `${timestamp}_${results.total}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabaseClient.storage
          .from('celebrity-images')
          .upload(fileName, fileBlob, {
            contentType: fileBlob.type || 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          console.error(`Upload error for ${entry.filename}:`, uploadError);
          results.errors.push(`${entry.filename}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from('celebrity-images')
          .getPublicUrl(fileName);

        // Extract name from filename
        const pathParts = entry.filename.split('/');
        const baseName = pathParts[pathParts.length - 1];
        const displayName = baseName
          .replace(/\.[^/.]+$/, '')
          .replace(/[0-9]/g, '')
          .replace(/_/g, ' ')
          .replace(/-/g, ' ')
          .trim() || `Celebrity ${results.total}`;

        // Insert into database
        const { error: dbError } = await supabaseClient
          .from('celebrities')
          .insert({
            name: displayName,
            image_path: publicUrl,
          });

        if (dbError) {
          console.error(`Database error for ${entry.filename}:`, dbError);
          results.errors.push(`${entry.filename}: ${dbError.message}`);
        } else {
          console.log(`Successfully processed: ${displayName}`);
          results.success.push(displayName);
        }

      } catch (error) {
        console.error(`Error processing ${entry.filename}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${entry.filename}: ${errorMessage}`);
      }
    }

    await zipReader.close();

    console.log(`Batch upload complete. Success: ${results.success.length}, Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify(results),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
