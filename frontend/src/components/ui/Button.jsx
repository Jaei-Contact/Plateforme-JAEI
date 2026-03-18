// ============================================================
// Button — composant réutilisable JAEI
// Variants : primary | secondary | outline | ghost | danger
// ============================================================

const Button = ({
  children,
  variant   = 'primary',
  size      = 'md',
  type      = 'button',
  disabled  = false,
  loading   = false,
  fullWidth = false,
  onClick,
  className = '',
  ...props
}) => {

  const base = `
    inline-flex items-center justify-center gap-2 font-medium
    rounded transition-all duration-150 cursor-pointer
    focus:outline-none focus:ring-2 focus:ring-offset-1
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    primary:   'bg-primary text-white hover:bg-primary-600 focus:ring-primary-300 border border-primary',
    secondary: 'bg-accent text-white hover:bg-accent-600 focus:ring-accent-300 border border-accent',
    outline:   'bg-white text-primary border border-primary hover:bg-primary-50 focus:ring-primary-200',
    ghost:     'bg-transparent text-neutral-700 hover:bg-neutral-100 border border-transparent focus:ring-neutral-200',
    danger:    'bg-error text-white hover:bg-red-700 focus:ring-red-300 border border-error',
    'outline-neutral': 'bg-white text-neutral-700 border border-neutral-300 hover:border-primary hover:text-primary focus:ring-primary-200',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
    xl: 'px-8 py-3 text-base',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${base}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin w-4 h-4 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
