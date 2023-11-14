"use client";

import React, { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

// btn will accept default props as well as these custom ones
type FormSubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
} & ComponentProps<"button">;

const FormSubmitButton = ({
  children,
  className,
  ...props
}: FormSubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      disabled={pending}
      className={`btn btn-primary ${className}`}
    >
      {pending && <span className="loading loading-dots" />}
      {children}
    </button>
  );
};

export default FormSubmitButton;
