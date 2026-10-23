import { forwardRef, useId } from 'react';

/**
 * Material-style outlined text field with a floating label.
 *
 * Works directly with react-hook-form: <TextField label="Email" {...register('email')} />
 * (a ref, name, onChange and onBlur are all forwarded to the <input>).
 *
 * Note: the floating label relies on an empty placeholder, so do not pass `placeholder`.
 * Use `helper` for hint text instead.
 */
const TextField = forwardRef(
  ({ label, error, helper, leading, trailing, className = '', id, type = 'text', ...rest }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    const describedBy = error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined;

    const borderClasses = error
      ? 'border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-400'
      : 'border-vault-border hover:border-gray-500 focus:border-brand-400 focus:ring-1 focus:ring-brand-400';

    const labelColor = error
      ? 'text-red-400'
      : 'text-gray-400 peer-focus:text-brand-300';

    return (
      <div className={className}>
        <div className="relative">
          {leading && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              {leading}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            placeholder=" "
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            className={`peer w-full h-14 rounded-xl border bg-transparent text-base text-white outline-none transition-colors duration-150 disabled:opacity-60 read-only:text-gray-300 ${
              leading ? 'pl-12' : 'pl-4'
            } ${trailing ? 'pr-12' : 'pr-4'} ${borderClasses}`}
            {...rest}
          />

          <label
            htmlFor={inputId}
            className={`pointer-events-none absolute ${
              leading ? 'left-11' : 'left-3'
            } top-0 -translate-y-1/2 bg-vault-panel px-1.5 text-xs transition-all duration-150 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-focus:top-0 peer-focus:text-xs peer-[:-webkit-autofill]:top-0 peer-[:-webkit-autofill]:text-xs ${labelColor}`}
          >
            {label}
          </label>

          {trailing && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">{trailing}</span>
          )}
        </div>

        {error ? (
          <p id={`${inputId}-error`} role="alert" className="mt-1.5 ml-4 text-xs text-red-400">
            {error}
          </p>
        ) : helper ? (
          <p id={`${inputId}-helper`} className="mt-1.5 ml-4 text-xs text-gray-500">
            {helper}
          </p>
        ) : null}
      </div>
    );
  }
);

TextField.displayName = 'TextField';

export default TextField;
