import { IncidentWidget } from "./incident-widget";
import { Profile } from "./profile";

function AuthNav() {
	return (
		<div className="flex items-center gap-2">
			<IncidentWidget />
			<Profile />
		</div>
	);
}

export { AuthNav };
