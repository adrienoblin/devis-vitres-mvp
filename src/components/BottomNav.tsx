'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Users, PlusCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const pathname = usePathname();

    const tabs = [
        { name: 'Accueil', href: '/', icon: Home },
        { name: 'Devis', href: '/historique', icon: ClipboardList },
        { name: 'Clients', href: '/clients', icon: Users },
        { name: 'Nouveau', href: '/devis', icon: PlusCircle },
        { name: 'Params', href: '/params', icon: Settings },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe">
            <div className="flex items-center justify-around h-16">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href;
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href!}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative",
                                isActive ? "text-blue-800" : "text-slate-500 hover:text-slate-900"
                            )}
                        >
                            <Icon className={cn("h-6 w-6", isActive && tab.href === '/devis' ? "text-blue-600 scale-110" : "")} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium leading-none">{tab.name}</span>
                            {isActive && (
                                <span className="absolute top-0 w-12 h-1 bg-blue-800 rounded-b-md" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
