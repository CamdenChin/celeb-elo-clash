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

    try {
      // Create form data with the ZIP file
      const formData = new FormData();
      formData.append('file', file);

      toast({
        title: "Processing ZIP file",
        description: "Unpacking and uploading images to the backend...",
      });

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('upload-celebrity-batch', {
        body: formData,
      });

      if (error) {
        throw error;
      }

      const results = data as {
        success: string[];
        errors: string[];
        total: number;
      };

      if (results.success.length > 0) {
        toast({
          title: "Upload Successful",
          description: `Successfully uploaded ${results.success.length} celebrity image(s)`,
        });
      }

      if (results.errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Some uploads failed",
          description: `${results.errors.length} error(s) occurred. Check console for details.`,
        });
        console.error("Upload errors:", results.errors);
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
                <p className="text-sm text-center text-muted-foreground">
                  Uploading images... Please wait.
                </p>
              )}
            </div>

            <div className="space-y-2 p-4 bg-secondary/20 rounded-lg border border-border/50">
              <h3 className="font-semibold text-sm">Instructions:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Upload a ZIP file containing all celebrity images</li>
                <li>Backend will unpack and process all images automatically</li>
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
