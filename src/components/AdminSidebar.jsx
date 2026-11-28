import React, { useState } from 'react';
import {
    LayoutGrid,
    ArrowLeftRight,
    BarChart3,
    Package,
    HandCoins,
    Users,
    QrCode,
    Settings,
    ChevronDown,
    ChevronRight,
    LogOut,
    UserCircle2,
    Shield,
    Store,
    Building2,
    ShieldCheck,
    Wallet,
    FileText,
    LifeBuoy,
    TrendingUp,
    UserCheck,
    UserMinus,
    UserX,
    Gift,
    ShoppingBag,
    Newspaper,
    Bot,
} from 'lucide-react';
import StarBorder from './StarBorder';
import { useTheme } from "./ThemeProvider";

const AdminSidebar = ({
    collapsed,
    activeNav,
    onNavClick,
    adminInfo,
    onLogout,
    orderNotificationCount = 0
}) => {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [openMenus, setOpenMenus] = useState({ vendors: false, users: false });
    const { effectiveTheme } = useTheme();
    const logoSrc =
        effectiveTheme === "dark"
            ? "/dark theme incentify logo.png"
            : "/light theme incentify logo.png";

    const orderBadgeCount = Number(orderNotificationCount) || 0;
    const formatBadge = (count) => (count > 99 ? "99+" : String(count));

    const navGroups = [
        {
            label: "Main",
            items: [
                { id: 'overview', label: 'Dashboard', icon: LayoutGrid },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'ai-concierge', label: 'AI WhatsApp Concierge', icon: Bot },
            ],
        },
        {
            label: "Management",
            items: [
                {
                    id: 'vendors',
                    label: 'Vendor Management',
                    icon: Store,
                    subItems: [
                        { id: 'vendors', label: 'All Vendors', icon: Building2 },
                        { id: 'vendors-active', label: 'Active Vendors', icon: ShieldCheck },
                        { id: 'vendors-paused', label: 'Paused Vendors', icon: Shield },
                    ]
                },
                {
                    id: 'users',
                    label: 'Users',
                    icon: Users,
                    subItems: [
                        { id: 'users', label: 'All Users', icon: Users },
                        { id: 'users-active', label: 'Active Users', icon: UserCheck },
                        { id: 'users-inactive', label: 'Inactive Users', icon: UserMinus },
                        { id: 'users-blocked', label: 'Blocked Users', icon: UserX },
                    ]
                },
                { id: 'orders', label: 'QR Processing', icon: Package, badge: orderBadgeCount },
                { id: 'payouts', label: 'Payouts', icon: HandCoins },
            ],
        },
        {
            label: "Data",
            items: [
                { id: 'operations', label: 'Operations', icon: Wallet },
                { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
                { id: 'finance', label: 'Finance & Revenue', icon: TrendingUp },
                { id: 'qrs', label: 'QR Registry', icon: QrCode },
                { id: 'redeem-catalog', label: 'Redeem Catalog', icon: Gift },
                { id: 'product-track', label: 'Product Track', icon: ShoppingBag },
            ],
        },
        {
            label: "System",
            items: [
                { id: 'support', label: 'Support Tickets', icon: LifeBuoy },
                { id: 'blogs', label: 'Upload Blog', icon: Newspaper },
                { id: 'product-reports', label: 'Product Reports', icon: FileText },
                { id: 'logs', label: 'Logs & Audit', icon: FileText },
                { id: 'compliance', label: 'Compliance & Audit', icon: ShieldCheck },
            ],
        },
    ];

    const settingsItems = [
        { id: 'account', label: 'Account Settings', icon: UserCircle2 },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    const getInitials = (name) => {
        if (!name) return 'A';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
    };

    // StarBorder inner content class - dark bg that works in both themes
    const starBorderInner = "bg-white dark:bg-[#0f1611] text-slate-900 dark:text-white";

    const renderNavItem = (item) => {
        const Icon = item.icon;
        const hasSubItems = Array.isArray(item.subItems);
        const badgeCount = Number(item.badge) || 0;

        if (hasSubItems) {
            const activeKey = String(activeNav || "");
            const isSubActive =
                item.subItems.some((sub) => sub.id === activeNav) ||
                activeKey.startsWith(`${item.id}-`);
            const isActive = activeNav === item.id || isSubActive;
            const isOpen = openMenus[item.id] || isSubActive;
            const toggleMenu = () =>
                setOpenMenus((prev) => ({ ...prev, [item.id]: !prev[item.id] }));

            return (
                <div key={item.id} className="space-y-0.5">
                    {isActive ? (
                        <StarBorder
                            as="button"
                            onClick={toggleMenu}
                            color="#059669"
                            speed="6s"
                            thickness={1}
                            className="w-full"
                            innerClassName={`${starBorderInner} font-semibold`}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon size={17} className="flex-shrink-0 text-[#059669]" />
                            {!collapsed && (
                                <>
                                    <span className="text-sm flex-1 text-left">{item.label}</span>
                                    {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                </>
                            )}
                        </StarBorder>
                    ) : (
                        <button
                            onClick={toggleMenu}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                                text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white
                                ${collapsed ? 'justify-center' : ''}`}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon size={17} className="flex-shrink-0" />
                            {!collapsed && (
                                <>
                                    <span className="text-sm flex-1 text-left">{item.label}</span>
                                    {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                </>
                            )}
                        </button>
                    )}

                    {!collapsed && isOpen && (
                        <div className="ml-4 pl-3 border-l border-slate-200 dark:border-white/10 space-y-0.5 mt-0.5">
                            {item.subItems.map((sub) => {
                                const SubIcon = sub.icon;
                                const isSubItemActive = activeNav === sub.id;
                                return isSubItemActive ? (
                                    <StarBorder
                                        key={sub.id}
                                        as="button"
                                        onClick={() => onNavClick(sub.id)}
                                        color="#059669"
                                        speed="5s"
                                        thickness={1}
                                        className="w-full"
                                        innerClassName={`${starBorderInner} font-semibold`}
                                        style={{ borderRadius: '12px' }}
                                    >
                                        <SubIcon size={13} className="flex-shrink-0 text-[#059669]" />
                                        <span className="text-xs">{sub.label}</span>
                                    </StarBorder>
                                ) : (
                                    <button
                                        key={sub.id}
                                        onClick={() => onNavClick(sub.id)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-xs font-medium
                                            text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200"
                                    >
                                        <SubIcon size={13} className="flex-shrink-0" />
                                        <span>{sub.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        const isActive = activeNav === item.id;
        return isActive ? (
            <StarBorder
                key={item.id}
                as="button"
                onClick={() => onNavClick(item.id)}
                color="#059669"
                speed="6s"
                thickness={1}
                className="w-full"
                innerClassName={`${starBorderInner} font-semibold`}
                title={collapsed ? item.label : ''}
            >
                <div className="relative flex-shrink-0">
                    <Icon size={17} className="text-[#059669]" />
                    {collapsed && badgeCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500" />
                    )}
                </div>
                {!collapsed && <span className="text-sm flex-1 text-left">{item.label}</span>}
                {!collapsed && badgeCount > 0 && (
                    <span className="ml-auto rounded-full bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5">
                        {formatBadge(badgeCount)}
                    </span>
                )}
            </StarBorder>
        ) : (
            <button
                key={item.id}
                onClick={() => onNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                    text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white
                    ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : ''}
            >
                <div className="relative flex-shrink-0">
                    <Icon size={17} />
                    {collapsed && badgeCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500" />
                    )}
                </div>
                {!collapsed && <span className="text-sm flex-1 text-left">{item.label}</span>}
                {!collapsed && badgeCount > 0 && (
                    <span className="ml-auto rounded-full bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5">
                        {formatBadge(badgeCount)}
                    </span>
                )}
            </button>
        );
    };

    return (
        <div
            className={`${collapsed ? 'w-20' : 'w-64'} h-screen bg-white dark:bg-[#0d0d0e] border-r border-slate-200/70 dark:border-white/10 text-slate-900 dark:text-white flex flex-col transition-all duration-300 sticky top-0`}
        >
            {/* ── Header: Logo + Profile merged ── */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-200/70 dark:border-white/5 flex-shrink-0">
                {collapsed ? (
                    /* Collapsed: just avatar */
                    <div className="flex flex-col items-center gap-2">
                        <img src={logoSrc} alt="Incentify" className="w-8 h-8 object-contain" />
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#059669] to-[#047857] flex items-center justify-center text-white text-[11px] font-bold shadow-md">
                            {getInitials(adminInfo?.name)}
                        </div>
                    </div>
                ) : (
                    /* Expanded: logo row + profile row merged cleanly */
                    <div className="space-y-3">
                        {/* Logo */}
                        <div className="flex items-center gap-2.5">
                            <img src={logoSrc} alt="Incentify" className="h-7 w-auto object-contain" />
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-[0.12em]">Admin Portal</p>
                            </div>
                        </div>
                        {/* Profile */}
                        <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-white/[0.04] rounded-xl px-2.5 py-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#059669] to-[#047857] flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                                {getInitials(adminInfo?.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-slate-800 dark:text-white truncate leading-tight">
                                    {adminInfo?.name || 'Admin'}
                                </p>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#059669]">
                                    <ShieldCheck size={9} />
                                    Administrator
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Nav Groups */}
            <div className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10">
                <nav className="px-3 space-y-4">
                    {navGroups.map((group) => (
                        <div key={group.label}>
                            {!collapsed && (
                                <p className="px-1 text-[9px] font-bold text-slate-400 dark:text-white/25 uppercase tracking-[0.14em] mb-1.5">
                                    {group.label}
                                </p>
                            )}
                            <div className="space-y-0.5">
                                {group.items.map(renderNavItem)}
                            </div>
                        </div>
                    ))}

                    {/* Settings / Account group */}
                    <div>
                        {!collapsed && (
                            <p className="px-1 text-[9px] font-bold text-slate-400 dark:text-white/25 uppercase tracking-[0.14em] mb-1.5">
                                Account
                            </p>
                        )}
                        <div className="space-y-0.5">
                            <button
                                onClick={() => setSettingsOpen(!settingsOpen)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                                    text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white
                                    ${collapsed ? 'justify-center' : ''}`}
                                title={collapsed ? 'Settings' : undefined}
                            >
                                <Settings size={17} className="flex-shrink-0" />
                                {!collapsed && (
                                    <>
                                        <span className="text-sm flex-1 text-left">Settings</span>
                                        {settingsOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                    </>
                                )}
                            </button>

                            {settingsOpen && !collapsed && (
                                <div className="ml-4 pl-3 border-l border-slate-200 dark:border-white/10 space-y-0.5 mt-0.5">
                                    {settingsItems.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => onNavClick(item.id)}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200 transition-all text-xs font-medium"
                                            >
                                                <Icon size={13} className="flex-shrink-0" />
                                                <span>{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </nav>
            </div>

            {/* Logout */}
            <div className="px-3 py-3 border-t border-slate-200/70 dark:border-white/5 flex-shrink-0">
                <button
                    onClick={onLogout}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                        text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-all
                        ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? 'Log Out' : undefined}
                >
                    <LogOut size={17} className="flex-shrink-0" />
                    {!collapsed && <span className="text-sm font-medium">Log Out</span>}
                </button>
            </div>
        </div>
    );
};

export default AdminSidebar;
