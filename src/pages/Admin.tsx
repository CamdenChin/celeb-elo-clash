import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import JSZip from "jszip";
import { User } from "@supabase/supabase-js";

const Admin = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roles) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have admin privileges.",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdminStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleExportData = async () => {
    setExporting(true);
    
    try {
      const { data: celebrities, error } = await supabase
        .from('celebrities')
        .select('*')
        .order('elo_rating', { ascending: false });

      if (error) throw error;

      if (!celebrities || celebrities.length === 0) {
        toast({
          variant: "destructive",
          title: "No Data",
          description: "No celebrities found to export.",
        });
        return;
      }

      // Find min and max Elo for normalization
      const eloRatings = celebrities.map(c => Number(c.elo_rating));
      const minElo = Math.min(...eloRatings);
      const maxElo = Math.max(...eloRatings);

      // Normalize Elo to 1-10 scale
      const exportData = celebrities.map(celeb => {
        const normalizedRating = maxElo === minElo 
          ? 5.5 
          : 1 + ((Number(celeb.elo_rating) - minElo) / (maxElo - minElo)) * 9;
        
        return {
          id: celeb.id,
          name: celeb.name,
          image_path: celeb.image_path,
          label: Math.round(normalizedRating * 100) / 100, // 1-10 scale, rounded to 2 decimals
          elo_rating: celeb.elo_rating,
          games_played: celeb.games_played,
          wins: celeb.wins,
          losses: celeb.losses
        };
      });

      // Create CSV
      const csvHeader = 'id,name,image_path,label,elo_rating,games_played,wins,losses\n';
      const csvRows = exportData.map(row => 
        `${row.id},"${row.name}","${row.image_path}",${row.label},${row.elo_rating},${row.games_played},${row.wins},${row.losses}`
      ).join('\n');
      const csv = csvHeader + csvRows;

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `celebrity_ratings_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Also create JSON export
      const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const jsonUrl = window.URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `celebrity_ratings_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      window.URL.revokeObjectURL(jsonUrl);

      toast({
        title: "Export Complete",
        description: `Exported ${exportData.length} celebrities with ratings (1-10 scale).`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check if it's a ZIP file
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload a ZIP file containing celebrity images",
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setCurrentFile("Loading ZIP file...");

    const uploadedCelebrities: string[] = [];
    const errors: string[] = [];

    try {
      // Load and extract ZIP file in browser
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Filter image files
      const imageFiles = Object.keys(zipContent.files).filter(filename => {
        const file = zipContent.files[filename];
        return !file.dir && 
               !filename.startsWith('__MACOSX') && 
               !filename.startsWith('.') &&
               /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);
      });

      const totalFiles = imageFiles.length;
      
      if (totalFiles === 0) {
        throw new Error("No image files found in ZIP");
      }

      toast({
        title: "Processing ZIP",
        description: `Found ${totalFiles} images. Starting upload...`,
      });

      // Check which celebrities already exist by fetching all existing image paths
      setCurrentFile("Checking existing uploads...");
      const { data: existingCelebs } = await supabase
        .from('celebrities')
        .select('image_path');
      
      const existingPaths = new Set(existingCelebs?.map(c => c.image_path) || []);

      // Process images in batches of 100
      const BATCH_SIZE = 100;
      let skippedCount = 0;
      
      for (let batchStart = 0; batchStart < imageFiles.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, imageFiles.length);
        const batch = imageFiles.slice(batchStart, batchEnd);
        
        setCurrentFile(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} of ${Math.ceil(imageFiles.length / BATCH_SIZE)}...`);

        // Process batch in parallel
        const batchPromises = batch.map(async (filename, batchIndex) => {
          const globalIndex = batchStart + batchIndex;
          
          try {
            const fileData = zipContent.files[filename];
            
            // Extract file as blob
            const blob = await fileData.async('blob');
            
            // Generate unique filename
            const fileExt = filename.split('.').pop();
            const timestamp = Date.now();
            const uniqueFileName = `${timestamp}_${globalIndex}.${fileExt}`;

            // Get public URL to check if it exists
            const { data: { publicUrl } } = supabase.storage
              .from('celebrity-images')
              .getPublicUrl(uniqueFileName);

            // Skip if already uploaded
            if (existingPaths.has(publicUrl)) {
              skippedCount++;
              return { success: true, skipped: true };
            }

            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from('celebrity-images')
              .upload(uniqueFileName, blob, {
                contentType: blob.type || 'image/jpeg',
                upsert: false,
              });

            if (uploadError) {
              return { success: false, error: `${filename}: ${uploadError.message}` };
            }

            // Extract name from filename
            const pathParts = filename.split('/');
            const baseName = pathParts[pathParts.length - 1];
            const displayName = baseName
              .replace(/\.[^/.]+$/, '')
              .replace(/[0-9]/g, '')
              .replace(/_/g, ' ')
              .replace(/-/g, ' ')
              .trim() || `Celebrity ${globalIndex + 1}`;

            // Insert into database
            const { error: dbError } = await supabase
              .from('celebrities')
              .insert({
                name: displayName,
                image_path: publicUrl,
              });

            if (dbError) {
              return { success: false, error: `${filename}: ${dbError.message}` };
            }

            return { success: true, name: displayName };

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: `${filename}: ${errorMessage}` };
          }
        });

        // Wait for batch to complete
        const results = await Promise.all(batchPromises);
        
        // Collect results
        results.forEach(result => {
          if (result.success && result.name) {
            uploadedCelebrities.push(result.name);
          } else if (result.error) {
            errors.push(result.error);
          }
        });

        // Update progress
        setProgress(Math.round((batchEnd / totalFiles) * 100));
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setProgress(100);
      setCurrentFile("Upload complete!");

      const successMessage = skippedCount > 0 
        ? `Uploaded ${uploadedCelebrities.length} new images. Skipped ${skippedCount} existing.`
        : `Successfully uploaded ${uploadedCelebrities.length} celebrity image(s)`;

      if (uploadedCelebrities.length > 0 || skippedCount > 0) {
        toast({
          title: "Upload Complete",
          description: successMessage,
        });
      }

      if (errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Some uploads failed",
          description: `${errors.length} error(s) occurred. Check console for details.`,
        });
        console.error("Upload errors:", errors);
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setUploading(false);
      setProgress(0);
      setCurrentFile("");
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-border/50 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Admin Panel</CardTitle>
            <CardDescription>Upload celebrity images and export training data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Export Training Data</h3>
              <p className="text-sm text-muted-foreground">
                Download celebrity data with ratings normalized to 1-10 scale for CNN training
              </p>
              <Button 
                onClick={handleExportData} 
                disabled={exporting}
                className="w-full"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Data (CSV & JSON)
                  </>
                )}
              </Button>
            </div>
            
            <div className="border-t border-border/50 pt-6">
              <h3 className="font-semibold text-lg mb-4">Upload Celebrity Images</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/20 border-border/50 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploading ? (
                        <Loader2 className="w-12 h-12 mb-4 text-primary animate-spin" />
                      ) : (
                        <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
                      )}
                      <p className="mb-2 text-sm text-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ZIP file containing celebrity images
                      </p>
                    </div>
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".zip"
                      disabled={uploading}
                    />
                  </label>
                </div>

                {uploading && (
                  <div className="space-y-3">
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-center text-muted-foreground">
                      {currentFile}
                    </p>
                    <p className="text-xs text-center text-muted-foreground">
                      {progress}% complete
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2 p-4 bg-secondary/20 rounded-lg border border-border/50 mt-4">
                <h3 className="font-semibold text-sm">Instructions:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Upload a ZIP file containing all celebrity images</li>
                  <li>ZIP will be unpacked in your browser (no server memory limits)</li>
                  <li>Images uploaded in batches with real-time progress tracking</li>
                  <li>Celebrity names will be extracted from filenames</li>
                  <li>All celebrities start with an Elo rating of 1200</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
