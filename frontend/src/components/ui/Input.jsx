// ============================================================
// Input — composant réutilisable JAEI
// Style propre, inspiré ScienceDirect forms
// ============================================================

const Input = ({
  id,
  label,
  type        = 'text',
  placeholder = '',
  value,
  onChange,
  error,
  hint,
  required    = false,
  disabled    = false,
  autoComplete,
  className   = '',
  inputClassName = '',
  icon,
  rightElement,
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-neutral-700"
        >
          {label}
          {required && (
            <span className="text-error ml-1" aria-hidden="true">*</span>
          )}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            {icon}
          </div>
        )}

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`
            w-full border rounded px-3 py-2 text-sm text-neutral-800
            bg-white placeholder-neutral-400
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary
            disabled:bg-neutral-100 disabled:cursor-not-allowed
            ${error
              ? 'border-error focus:ring-red-200 focus:border-error'
              : 'border-neutral-300 hover:border-neutral-400'
            }
            ${icon ? 'pl-10' : ''}
            ${rightElement ? 'pr-10' : ''}
            ${inputClassName}
          `}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-error flex items-center gap-1 mt-0.5">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {hint && !error && (
        <p className="text-xs text-neutral-500 mt-0.5">{hint}</p>
      )}
    </div>
  );
};

export default Input;
