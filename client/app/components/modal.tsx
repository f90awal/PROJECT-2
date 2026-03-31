import clsx from "clsx";
import React from "react";
import ReactDOM from "react-dom";
import { useMounted } from "~/lib/use-mounted";

interface Props extends React.PropsWithChildren {
	className?: string;
	open?: boolean;
	onClose?: VoidFunction;
}

function Modal({ children, className, onClose, open }: Props) {
	const ref = React.useRef<HTMLDialogElement>(null);
	const mounted = useMounted();

	function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
		if (event.target === ref.current) {
			onClose?.();
		}
	}

	React.useEffect(() => {
		if (open) {
			if (!ref.current?.open) ref.current?.showModal();
		} else {
			ref.current?.close();
		}

		const listener = () => {
			onClose?.();
		};

		ref.current?.addEventListener("close", listener);

		return () => ref.current?.removeEventListener("close", listener);
	}, [open, onClose, mounted]);

	if (!mounted) {
		return null;
	}

	return ReactDOM.createPortal(
		<dialog
			className={clsx(
				"rounded border border-stone-300 dark:border-stone-700 shadow-2xl bg-white dark:bg-stone-900 p-0 backdrop:bg-stone-950/60",
				className,
			)}
			ref={ref}
			onClick={handleBackdropClick}
			onKeyDown={(event) => {
				if (event.key === "Escape") onClose?.();
			}}
		>
			{children}
		</dialog>,
		document.body,
	);
}

export { Modal };
