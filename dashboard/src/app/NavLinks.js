'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Calendar,
  PhoneCall,
  MessageSquare,
  Wrench,
  Settings,
} from 'lucide-react';

const links = [
  { href: '/',          label: 'Overview',  Icon: LayoutDashboard },
  { href: '/bookings',  label: 'Bookings',  Icon: Calendar        },
  { href: '/calls',     label: 'Calls',     Icon: PhoneCall       },
  { href: '/callbacks', label: 'Callbacks', Icon: MessageSquare   },
  { href: '/services',  label: 'Services',  Icon: Wrench          },
];

export default function NavLinks() {
  const pathname = usePathname();

  // Exact match for '/', prefix match for everything else
  const isActive = (href) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className="sidebar-nav">
      {links.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`nav-link${isActive(href) ? ' active' : ''}`}
        >
          <Icon size={20} />
          <span>{label}</span>
        </Link>
      ))}

      <div className="sidebar-nav-bottom">
        <Link
          href="/settings"
          className={`nav-link${pathname.startsWith('/settings') ? ' active' : ''}`}
        >
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  );
}
