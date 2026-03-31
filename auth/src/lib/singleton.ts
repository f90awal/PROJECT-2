function makeSingleton<T>(name: string, factory: () => T): T {
	let instance: T;
	if (process.env.NODE_ENV === "production") {
		instance = factory();
	} else {
		// @ts-ignore
		if (!global[name]) {
			// @ts-ignore
			global[name] = factory();
		}
		// @ts-ignore
		instance = global[name];
	}

	return instance;
}

export { makeSingleton };
