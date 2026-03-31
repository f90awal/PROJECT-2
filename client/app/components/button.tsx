import clsx from "clsx";
import React, { type ComponentProps } from "react";

const Button = React.forwardRef<HTMLButtonElement, ComponentProps<"button">>(
	({ className, children, ...props }, ref) => {
		return (
			<button
				type="button"
				className={clsx(
					"px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-50 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-white transition-colors",
					className,
				)}
				{...props}
				ref={ref}
			>
				{children}
			</button>
		);
	},
);

export { Button };
