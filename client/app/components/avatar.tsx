import { cn } from "~/lib/utils";

type Props = React.ComponentProps<"img"> & {
	name: string;
};

export const Avatar = ({ name, className, alt = "avatar" }: Props) => {
	return (
		<img
			className={cn("rounded-full size-10 object-cover", className)}
			alt={alt}
			src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${name}`}
		/>
	);
};
