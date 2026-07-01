export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] border border-[var(--border-3)] rounded-2xl p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--blue)]"></div>
          <span className="text-[var(--text-2)] font-medium text-sm">Authenticating...</span>
        </div>
      </div>
    </div>
  );
}
