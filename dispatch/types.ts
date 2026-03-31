declare global {
	namespace PrismaJson {
		type ResourceLocation = {
			address: string;
			lat: number;
			lng: number;
		};
	}
}

export {};
