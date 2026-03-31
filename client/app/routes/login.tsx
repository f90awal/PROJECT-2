import clsx from "clsx";
import { tryit } from "radashi";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
	type ActionFunctionArgs,
	Link,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
	useActionData,
	useNavigation,
	useSubmit,
} from "react-router";
import { checkAuth } from "~/lib/check-auth";
import { authCookie } from "~/lib/cookies.server";
import { methodNotAllowed } from "~/lib/responses";
import type {
	ActionData,
	AuthFormValues,
	LoginPayload,
	RegisterPayload,
} from "~/lib/types";

type AuthActionPayload =
	| ({ activeTab: "login" } & LoginPayload)
	| ({ activeTab: "signup" } & RegisterPayload);

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const [_, user] = await tryit(checkAuth)(request);

	if (user) {
		throw redirect("/");
	}
};

export const action = async ({ request }: ActionFunctionArgs) => {
	if (request.method !== "POST") {
		throw methodNotAllowed();
	}

	const payload = (await request.json()) as AuthActionPayload;
	const isSignup = payload.activeTab === "signup";

	const BASE_URL = process.env.GATEWAY_BASE!;
	const url = isSignup ? `${BASE_URL}/auth/register` : `${BASE_URL}/auth/login`;

	const rest: LoginPayload | RegisterPayload =
		payload.activeTab === "signup"
			? {
					name: payload.name,
					email: payload.email,
					password: payload.password,
					affiliation: payload.affiliation,
					role: payload.role,
				}
			: {
					email: payload.email,
					password: payload.password,
				};

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(rest),
	});

	const data = await response.json();

	if (!response.ok) {
		return Response.json(data, { status: response.status });
	}

	if (isSignup) {
		return Response.json(data, { status: response.status });
	}

	return redirect("/", {
		headers: {
			"Set-Cookie": await authCookie.serialize(data.token),
		},
	});
};

export const meta: MetaFunction = () => {
	return [{ title: "Sign in — Dispatch" }];
};

type AuthTab = "login" | "signup";

function getActionError(actionData?: ActionData) {
	if (!actionData) return null;
	if (actionData.detail) return actionData.detail;

	const props = actionData.errors?.properties;
	if (!props) return null;

	const firstFieldError = Object.values(props).find(
		(field) => field?.errors && field.errors.length > 0,
	)?.errors?.[0];

	return firstFieldError ?? "Something went wrong";
}

const fieldClass =
	"w-full border-b border-stone-300 dark:border-stone-600 bg-transparent px-0 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 outline-none focus:border-stone-700 dark:focus:border-stone-300 transition-colors font-mono";

const labelClass =
	"block text-[10px] font-mono font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1";

export default function Login() {
	const [activeTab, setActiveTab] = useState<AuthTab>("login");
	const [submittedTab, setSubmittedTab] = useState<AuthTab | undefined>(
		undefined,
	);
	const { handleSubmit, register } = useForm<AuthFormValues>();
	const submit = useSubmit();
	const navigation = useNavigation();
	const actionData = useActionData<ActionData>();
	const errorMessage = getActionError(actionData);

	React.useEffect(() => {
		if (navigation.state !== "idle" || !submittedTab) return;

		if (submittedTab === "signup" && actionData && !errorMessage) {
			setActiveTab("login");
		}

		setSubmittedTab(undefined);
	}, [navigation.state, submittedTab, actionData, errorMessage]);

	async function login(data: AuthFormValues) {
		setSubmittedTab(activeTab);

		const payload =
			activeTab === "signup"
				? { ...data, activeTab, role: "admin" }
				: { ...data, activeTab };

		submit(JSON.stringify(payload), {
			method: "POST",
			encType: "application/json",
		});
	}

	const isPending = navigation.state !== "idle";

	return (
		<div className="min-h-screen w-full flex bg-stone-50 dark:bg-stone-950">
			{/* Left panel — branding */}
			<div className="hidden lg:flex w-80 flex-col justify-between bg-stone-900 dark:bg-stone-950 border-r border-stone-800 p-10 shrink-0">
				<div>
					<div className="flex items-center gap-2.5 mb-10">
						<div className="i-solar-danger-triangle-bold size-5 text-orange-400" />
						<span className="text-xs font-mono font-semibold uppercase tracking-widest text-stone-400">
							Dispatch
						</span>
					</div>
					<p className="text-xs font-mono text-stone-600 leading-relaxed">
						Emergency coordination and resource management platform for first responders.
					</p>
				</div>
				<p className="text-[10px] font-mono text-stone-700 uppercase tracking-widest">
					v1.0
				</p>
			</div>

			{/* Right panel — form */}
			<div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
				{/* Mobile logo */}
				<div className="flex items-center gap-2 mb-10 lg:hidden">
					<div className="i-solar-danger-triangle-bold size-5 text-orange-400" />
					<span className="text-xs font-mono font-semibold uppercase tracking-widest text-stone-600 dark:text-stone-400">
						Dispatch
					</span>
				</div>

				<div className="w-full max-w-sm">
					{/* Tab bar */}
					<div className="flex mb-8 border-b border-stone-200 dark:border-stone-800">
						<button
							type="button"
							onClick={() => setActiveTab("login")}
							className={clsx(
								"pb-2.5 mr-6 text-xs font-mono uppercase tracking-widest transition-colors",
								activeTab === "login"
									? "text-stone-900 dark:text-stone-100 border-b-2 border-stone-800 dark:border-stone-200 -mb-px"
									: "text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400",
							)}
						>
							Sign in
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("signup")}
							className={clsx(
								"pb-2.5 text-xs font-mono uppercase tracking-widest transition-colors",
								activeTab === "signup"
									? "text-stone-900 dark:text-stone-100 border-b-2 border-stone-800 dark:border-stone-200 -mb-px"
									: "text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400",
							)}
						>
							Register
						</button>
					</div>

					<form onSubmit={handleSubmit(login)} className="flex flex-col gap-5">
						{activeTab === "signup" && (
							<>
								<div>
									<label className={labelClass}>Full name</label>
									<input
										{...register("name")}
										type="text"
										placeholder="John Doe"
										className={fieldClass}
									/>
								</div>

								<div>
									<label className={labelClass}>Affiliation</label>
									<select
										{...register("affiliation", { required: true })}
										defaultValue=""
										className={fieldClass}
									>
										<option value="" disabled>Select affiliation</option>
										<option value="police">Police</option>
										<option value="fire">Fire</option>
										<option value="hospital">Hospital</option>
										<option value="system">System</option>
									</select>
								</div>
							</>
						)}

						<div>
							<label className={labelClass}>Email</label>
							<input
								{...register("email")}
								type="email"
								placeholder="you@example.com"
								className={fieldClass}
							/>
						</div>

						<div>
							<label className={labelClass}>Password</label>
							<input
								{...register("password")}
								type="password"
								placeholder="••••••••"
								className={fieldClass}
							/>
						</div>

						{errorMessage && (
							<p className="text-xs font-mono text-red-500">{errorMessage}</p>
						)}

						<button
							type="submit"
							disabled={isPending}
							className="mt-2 w-full rounded py-2.5 text-xs font-mono font-semibold uppercase tracking-widest bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-white disabled:opacity-60 transition-colors"
						>
							{isPending
								? "Please wait..."
								: activeTab === "login"
									? "Sign in"
									: "Create account"}
						</button>

						<p className="text-[10px] font-mono text-stone-400 dark:text-stone-600 leading-relaxed">
							By continuing you agree to our{" "}
							<Link to="/login" className="underline hover:text-stone-600 dark:hover:text-stone-400">
								Terms
							</Link>{" "}
							and{" "}
							<Link to="/login" className="underline hover:text-stone-600 dark:hover:text-stone-400">
								Privacy Policy
							</Link>
							.
						</p>
					</form>
				</div>
			</div>
		</div>
	);
}
