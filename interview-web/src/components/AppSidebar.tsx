import { ChevronDown } from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import InterviewSettings from "./InterviewSettings";
import SessionCost from "./SessionCost";

const AppSidebar = () => {
	return (
		<Sidebar>
			<SidebarHeader>
				<h2 className="font-semibold text-sm tracking-tight">Developer panel</h2>
			</SidebarHeader>
			<SidebarContent>
				<Collapsible defaultOpen className="group/collapsible">
					<SidebarGroup>
						<SidebarGroupLabel render={<CollapsibleTrigger />}>
							Generation settings
							<ChevronDown className="ml-auto transition-transform group-data-open/collapsible:rotate-180" />
						</SidebarGroupLabel>
						<CollapsibleContent>
							<SidebarGroupContent>
								<SidebarMenuItem>
									<InterviewSettings />
								</SidebarMenuItem>
							</SidebarGroupContent>
						</CollapsibleContent>
					</SidebarGroup>
				</Collapsible>
			</SidebarContent>
			<SidebarFooter>
				<SessionCost />
			</SidebarFooter>
		</Sidebar>
	);
};

export default AppSidebar;
