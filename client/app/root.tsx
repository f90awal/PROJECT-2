import "@unocss/reset/tailwind-compat.css";
import "virtual:uno.css";
import "./styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { tryit } from "radashi";
import {
	data,
	Links,
	type LoaderFunctionArgs,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";
import { PendingUI } from "./components/pending-ui";
import { useColorScheme } from "./lib/use-color-scheme";
import { useDispatchLiveSync } from "./lib/use-dispatch";
import { getUserProfile } from "./lib/user";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const [, user] = await tryit(getUserProfile)(request);

	return data({ user });
};

const queryClient = new QueryClient();

function AppContent() {
	useDispatchLiveSync();
	return <Outlet />;
}

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<script src="/load-theme.js" type="text/javascript" />
				<Meta />
				<Links />
			</head>
			<body>
				<PendingUI />
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	useColorScheme();

	return (
		<QueryClientProvider client={queryClient}>
			<AppContent />
		</QueryClientProvider>
	);
}
