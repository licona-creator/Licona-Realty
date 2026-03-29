export default function AuthenticatedLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#d3a971', borderTopColor: 'transparent' }}
        />
        <span className="text-sm text-navy/40 dark:text-white/40 font-inter">
          Loading...
        </span>
      </div>
    </div>
  );
}
