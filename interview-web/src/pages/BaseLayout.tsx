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
			{/* h-svh with an inner min-h-0 column: without it the scrolling child
			    grows past the viewport and the composer walks off screen. */}
			<SidebarInset className="flex h-svh flex-col overflow-hidden">
				<SidebarTrigger />
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
};

export default BaseLayout;
