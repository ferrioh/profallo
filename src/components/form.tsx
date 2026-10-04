import type { InputHTMLAttributes, ReactNode } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
  value?: string | number
  wrapClassName?: string
}

export function Field({
  name,
  label,
  value,
  type = 'text',
  wrapClassName = '',
  ...rest
}: FieldProps) {
  return (
    <div className={wrapClassName}>
      <label htmlFor={`f-${name}`}>{label}</label>
      <input
        id={`f-${name}`}
        name={name}
        type={type}
        defaultValue={value}
        {...rest}
      />
    </div>
  )
}

export function SelectField({
  name,
  label,
  value,
  children,
}: {
  name: string
  label: string
  value?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={`f-${name}`}>{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={value}>
        {children}
      </select>
    </div>
  )
}

export function TextField({
  name,
  label,
  value = '',
}: {
  name: string
  label: string
  value?: string
}) {
  return (
    <div className="full">
      <label htmlFor={`f-${name}`}>{label}</label>
      <textarea
        id={`f-${name}`}
        name={name}
        maxLength={3000}
        defaultValue={value}
      />
    </div>
  )
}
