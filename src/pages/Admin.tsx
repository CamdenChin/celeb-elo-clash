import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Admin = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedCelebrities = [];
    const errors = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Generate a unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('celebrity-images')
          .upload(filePath, file);

        if (uploadError) {
          errors.push(`${file.name}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('celebrity-images')
          .getPublicUrl(filePath);

        // Extract name from filename (remove extension and numbers)
        const displayName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[0-9]/g, '')
          .replace(/_/g, ' ')
          .trim() || `Celebrity ${i + 1}`;

        // Insert into database
        const { error: dbError } = await supabase
          .from('celebrities')
          .insert({
            name: displayName,
            image_path: publicUrl,
          });

        if (dbError) {
          errors.push(`${file.name}: ${dbError.message}`);
        } else {
          uploadedCelebrities.push(displayName);
        }
      }

      if (uploadedCelebrities.length > 0) {
        toast({
          title: "Upload Successful",
          description: `Successfully uploaded ${uploadedCelebrities.length} celebrity image(s)`,
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
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="border-border/50 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Admin Panel</CardTitle>
            <CardDescription>Upload celebrity images to populate the database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                      PNG, JPG or WEBP (Multiple files supported)
                    </p>
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*"
                    disabled={uploading}
                  />
                </label>
              </div>

              {uploading && (
                <p className="text-sm text-center text-muted-foreground">
                  Uploading images... Please wait.
                </p>
              )}
            </div>

            <div className="space-y-2 p-4 bg-secondary/20 rounded-lg border border-border/50">
              <h3 className="font-semibold text-sm">Instructions:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Select multiple celebrity images to upload</li>
                <li>Images will be stored in Lovable Cloud storage</li>
                <li>Celebrity names will be extracted from filenames</li>
                <li>All celebrities start with an Elo rating of 1200</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
