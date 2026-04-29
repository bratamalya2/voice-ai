import "./globals.css";
import { 
  LayoutDashboard, 
  Calendar, 
  PhoneCall, 
  MessageSquare, 
  Settings, 
  Wrench,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

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
              <div style={{ backgroundColor: 'var(--primary)', padding: '6px', borderRadius: '8px' }}>
                <PhoneCall size={24} color="white" />
              </div>
              <span>Voice Agent</span>
            </div>
            
            <nav className="sidebar-nav">
              <Link href="/" className="nav-link active">
                <LayoutDashboard size={20} />
                <span>Overview</span>
              </Link>
              <Link href="/bookings" className="nav-link">
                <Calendar size={20} />
                <span>Bookings</span>
              </Link>
              <Link href="/calls" className="nav-link">
                <PhoneCall size={20} />
                <span>Calls</span>
              </Link>
              <Link href="/callbacks" className="nav-link">
                <MessageSquare size={20} />
                <span>Callbacks</span>
              </Link>
              <Link href="/services" className="nav-link">
                <Wrench size={20} />
                <span>Services</span>
              </Link>
              <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                <Link href="/settings" className="nav-link">
                  <Settings size={20} />
                  <span>Settings</span>
                </Link>
              </div>
            </nav>
          </aside>
          
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
