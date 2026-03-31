declare global {
	namespace PrismaJson {
		type IncidentLocation = {
			address: string;
			center: [number, number]; // [lat,lng]
			radius: number; // in km
		};

		type IncidentType = {
			code: string;
			category?: string; // EMS, Fire etc
		};

		type IncidentPriority = {
			level: "low" | "medium" | "high";
			score?: number;
			escalationMins?: number; // how many minutes can pass at that priority before escalation or auto-alert rules trigger (would need crons in the future)
		};

		type IncidentMetadata = {
			callerName: string;
			callerContact: string;
			notes?: string;
		};
		
		type ResponderLocation = {
			lat: number;
			lng: number;
		};
	}
}

export {};
