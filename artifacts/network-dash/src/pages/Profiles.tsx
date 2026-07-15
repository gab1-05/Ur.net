import { Layout } from "@/components/Layout/Layout";
import { useGetProfiles, getGetProfilesQueryKey, useRunProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, Target, Activity } from "lucide-react";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { useToast } from "@/hooks/use-toast";

export default function Profiles() {
  const { data: profiles, isLoading } = useGetProfiles({
    query: { queryKey: getGetProfilesQueryKey() }
  });
  const runProfile = useRunProfile();
  const { toast } = useToast();

  const handleRun = async (id: number) => {
    try {
      await runProfile.mutateAsync({ id });
      toast({
        title: "Profile execution started",
        description: "Diagnostics are running. Check history for results.",
      });
    } catch (error) {
      toast({
        title: "Execution failed",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Profiles & Presets</h1>
          <Button disabled>Create Profile</Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles?.map((profile) => (
              <Card key={profile.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {profile.name}
                        {profile.isPreset && <Badge variant="secondary" className="text-[10px]">Preset</Badge>}
                      </CardTitle>
                      <CardDescription className="mt-1.5">{profile.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" /> Targets
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.targets.map(t => (
                        <Badge key={t} variant="outline" className="font-mono bg-muted/50">{t}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" /> Diagnostics
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.diagnostics.map(d => (
                        <Badge key={d} variant="outline" className="uppercase text-[10px]">{d}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border bg-muted/20">
                  <Button 
                    className="w-full" 
                    onClick={() => handleRun(profile.id)}
                    disabled={runProfile.isPending}
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Run Profile
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
