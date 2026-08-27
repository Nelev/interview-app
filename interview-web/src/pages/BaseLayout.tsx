import type { ReactNode } from "react";
import AppSidebar from "@/components/AppSidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";

interface BaseLayoutProps {
	children: ReactNode;
}

const BaseLayout = ({ children }: BaseLayoutProps) => {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<SidebarTrigger />
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
};

export default BaseLayout;
