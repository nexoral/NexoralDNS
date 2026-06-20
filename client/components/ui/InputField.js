export default function InputField({
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  error,
  icon,
  rightIcon,
  className = ''
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5f6b7d]">
            {icon}
          </div>
        )}

        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`
            w-full px-4 py-3 bg-white/6 border border-[rgba(130,165,220,0.2)] rounded-lg
            text-[#e7eef6] placeholder-[#5f6b7d]
            focus:outline-none focus:ring-2 focus:ring-[#5b8cff]/50 focus:border-[#5b8cff]/60
            transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-[#ff6071]/50 focus:ring-[#ff6071]/40 focus:border-[#ff6071]/60' : ''}
            ${className}
          `}
        />

        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p className="text-[#ff6071] text-sm flex items-center">
          <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
