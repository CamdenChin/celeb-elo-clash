import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DatasetExport = () => {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [minVotes, setMinVotes] = useState("10");
  const [minElo, setMinElo] = useState("");
  const [maxElo, setMaxElo] = useState("");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('export-dataset', {
        body: {
          format,
          minVotes: parseInt(minVotes) || 0,
          minElo: minElo ? parseFloat(minElo) : undefined,
          maxElo: maxElo ? parseFloat(maxElo) : undefined,
        }
      });

      if (error) throw error;

      // Create download
      const blob = new Blob(
        [format === 'json' ? JSON.stringify(data.dataset, null, 2) : data.dataset],
        { type: format === 'json' ? 'application/json' : 'text/csv' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `celebrity-dataset-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        <div className="space-y-1">
          <div>Dataset exported successfully!</div>
          <div className="text-xs opacity-80">{data.count} celebrities included</div>
        </div>
      );
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export dataset");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/60 backdrop-blur-md">
        <div className="container mx-auto px-4 py-5">
          <nav className="flex items-center justify-between">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <h1 className="text-2xl font-serif font-semibold tracking-wide text-foreground">
              ML Dataset Export
            </h1>
            <div className="w-24" /> {/* Spacer for centering */}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Export Training Dataset</CardTitle>
            <CardDescription>
              Download celebrity data with normalized ratings (1-10 scale) for CNN training.
              Ratings are calculated from ELO scores with vote confidence metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={format === 'csv' ? 'default' : 'outline'}
                  onClick={() => setFormat('csv')}
                  className="justify-start"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant={format === 'json' ? 'default' : 'outline'}
                  onClick={() => setFormat('json')}
                  className="justify-start"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <h3 className="font-semibold">Filters</h3>
              
              <div className="space-y-2">
                <Label htmlFor="minVotes">Minimum Votes (data quality threshold)</Label>
                <Input
                  id="minVotes"
                  type="number"
                  value={minVotes}
                  onChange={(e) => setMinVotes(e.target.value)}
                  placeholder="e.g., 10"
                />
                <p className="text-xs text-muted-foreground">
                  Only include celebrities with at least this many votes for reliable ratings
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minElo">Min ELO Rating</Label>
                  <Input
                    id="minElo"
                    type="number"
                    value={minElo}
                    onChange={(e) => setMinElo(e.target.value)}
                    placeholder="e.g., 1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxElo">Max ELO Rating</Label>
                  <Input
                    id="maxElo"
                    type="number"
                    value={maxElo}
                    onChange={(e) => setMaxElo(e.target.value)}
                    placeholder="e.g., 1400"
                  />
                </div>
              </div>
            </div>

            {/* Export Info */}
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="font-semibold text-sm">Dataset Includes:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Celebrity ID and image URL</li>
                <li>• Normalized rating (1-10 scale from ELO)</li>
                <li>• Raw ELO score</li>
                <li>• Total votes (confidence metric)</li>
                <li>• Win/loss record</li>
                <li>• Games played</li>
              </ul>
            </div>

            {/* Export Button */}
            <Button 
              onClick={handleExport} 
              disabled={exporting}
              className="w-full"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Generating Export...' : 'Export Dataset'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DatasetExport;
