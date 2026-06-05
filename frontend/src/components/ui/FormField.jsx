/**
 * Reusable form field component with consistent styling.
 * Wraps label + input/select/textarea + error message in a unified layout.
 * Uses the `.form-field` and `.form-label` utilities from the design system.
 */
export function FormField({
  label,
  id,
  type = 'text',
  required = false,
  error,
  className = '',
  children,
  ...inputProps
}) {
  const inputId = id || `field-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  // Render select or textarea based on type
  const renderInput = () => {
    if (children) {
      // For select elements passed as children
      return children;
    }

    if (type === 'textarea') {
      return (
        <textarea
          id={inputId}
          required={required}
          className={`form-field resize-none ${error ? '!border-error/50 !ring-error/10' : ''} ${className}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...inputProps}
        />
      );
    }

    if (type === 'select') {
      return (
        <select
          id={inputId}
          required={required}
          className={`form-field appearance-none cursor-pointer ${error ? '!border-error/50 !ring-error/10' : ''} ${className}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...inputProps}
        >
          {inputProps.options?.map((opt) => (
            <option
              key={typeof opt === 'string' ? opt : opt.value}
              value={typeof opt === 'string' ? opt : opt.value}
            >
              {typeof opt === 'string' ? opt : opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        id={inputId}
        type={type}
        required={required}
        className={`form-field ${error ? '!border-error/50 !ring-error/10' : ''} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...inputProps}
      />
    );
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      {renderInput()}
      {error && (
        <p
          id={`${inputId}-error`}
          className="text-[11px] text-error font-medium ml-1 mt-1"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
