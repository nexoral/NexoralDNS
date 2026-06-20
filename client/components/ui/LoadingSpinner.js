export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0d111a] border border-[rgba(130,165,220,0.18)] rounded-2xl p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#5b8cff]"></div>
          <span className="text-[#cdd9e8] font-medium text-sm">Authenticating...</span>
        </div>
      </div>
    </div>
  );
}
