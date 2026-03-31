/**
 * Sync env files for all packages:
 * - If .env doesn't exist, copy .env.copy as-is.
 * - If .env exists, ONLY append missing keys from .env.copy.
 *   Existing keys/values (including multi-line ones) are never rewritten.
 */
import fs from "node:fs";

const packageFile = fs.readFileSync("./package.json", { encoding: "utf8" });
const packageJson = JSON.parse(packageFile);

const packages = packageJson.workspaces.packages;

console.log("Syncing envs for", packages.join(", "));

for (const pkg of packages) {
	const copyFile = `${pkg}/.env.copy`;
	const copyStat = fs.statSync(copyFile, { throwIfNoEntry: false });
	if (!copyStat) {
		console.log(`  [-]  ${pkg} (no .env.copy)`);
		continue;
	}

	const envFile = `${pkg}/.env`;
	const envStat = fs.statSync(envFile, { throwIfNoEntry: false });

	if (!envStat) {
		fs.copyFileSync(copyFile, envFile);
		console.log(`  [✓]  ${pkg} (created .env from .env.copy)`);
		continue;
	}

	const envCopy = parseEnvKeyValues(
		fs.readFileSync(copyFile, { encoding: "utf8" }),
	);

	const existingKeys = readEnvKeys(
		fs.readFileSync(envFile, { encoding: "utf8" }),
	);

	const toAppend = [];
	for (const [key, value] of Object.entries(envCopy)) {
		if (!existingKeys.has(key)) {
			toAppend.push(`${key}=${value}`);
		}
	}

	if (toAppend.length === 0) {
		console.log(`  [=]  ${pkg} (no new keys)`);
		continue;
	}

	fs.appendFileSync(envFile, `\n${toAppend.join("\n")}`);
	console.log(`  [x]  ${pkg} (added ${toAppend.length} key(s))`);
}

/**
 * Parse simple KEY=VALUE lines into an object.
 * Ignores comments and lines without '='.
 */
function parseEnvKeyValues(envText) {
	const lines = envText.split("\n");
	const entries = [];

	for (const raw of lines) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;
		const idx = line.indexOf("=");
		if (idx === -1) continue;

		const key = line.slice(0, idx).trim();
		const value = line.slice(idx + 1); // keep as-is
		if (!key) continue;

		entries.push([key, value]);
	}

	return Object.fromEntries(entries);
}

/**
 * Return a Set of keys present in an .env file.
 * Does not try to parse values, so multi-line values are preserved.
 */
function readEnvKeys(envText) {
	const lines = envText.split("\n");
	const keys = new Set();

	for (const raw of lines) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;
		const idx = line.indexOf("=");
		if (idx === -1) continue;

		const key = line.slice(0, idx).trim();
		if (key) keys.add(key);
	}

	return keys;
}
