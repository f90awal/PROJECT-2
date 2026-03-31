import * as argon2 from "argon2";

async function hash(password: string): Promise<string> {
	return argon2.hash(password);
}

async function match(password: string, hash: string): Promise<boolean> {
	return argon2.verify(hash, password);
}

export { hash, match };
