'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, FileSpreadsheet, History } from 'lucide-react';

const navItems = [
  { href: '/', label: '工作台', icon: LayoutDashboard },
  { href: '/import', label: '批量导入', icon: Upload },
  { href: '/templates', label: '映射方案', icon: FileSpreadsheet },
  { href: '/history', label: '运单记录', icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">W</div>
        <div>
          <h1>WaybillPro</h1>
          <span className="logo-sub">物流智能下单系统</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
