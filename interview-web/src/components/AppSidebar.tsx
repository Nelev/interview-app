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
import GenerateQuestionsForm from "./GenerateQuestionsForm";
import SessionCost from "./SessionCost";

const AppSidebar = () => {
	return (
		<Sidebar>
			<SidebarHeader>
				<h2 className="font-semibold text-sm tracking-tight">Services</h2>
			</SidebarHeader>
			<SidebarContent>
				<Collapsible defaultOpen className="group/collapsible">
					<SidebarGroup>
						<SidebarGroupLabel render={<CollapsibleTrigger />}>
							Common interview questions
							<ChevronDown className="ml-auto transition-transform group-data-open/collapsible:rotate-180" />
						</SidebarGroupLabel>
						<CollapsibleContent>
							<SidebarGroupContent>
								<SidebarMenuItem>
									<GenerateQuestionsForm />
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
