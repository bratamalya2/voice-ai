import "./globals.css";
import { PhoneCall } from "lucide-react";
import NavLinks from "./NavLinks";

export const metadata = {
  title: "Voice Booking Agent Dashboard",
  description: "Provider management dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="dashboard-container">
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">
                <PhoneCall size={24} color="white" />
              </div>
              <span>Voice Agent</span>
            </div>

            <NavLinks />
          </aside>

          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
