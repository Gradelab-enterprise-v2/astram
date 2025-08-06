
export function ClassLoadingState() {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[300px] bg-background/50 rounded-lg border border-dashed">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
      <p className="text-center text-muted-foreground">Loading class details...</p>
      <p className="text-xs text-muted-foreground mt-2">This may take a moment</p>
    </div>
  );
}
