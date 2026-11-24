
import React, { useRef, useState, useLayoutEffect } from 'react';
import { Link, useLocation } from "@/lib/router";
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const DockIcon = React.forwardRef(({ children, to, label, isActive, mouseX, onClick }, forwardedRef) => {
    const localRef = useRef(null);

    const distance = useTransform(mouseX, (val) => {
        const bounds = localRef.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - bounds.x - bounds.width / 2;
    });

    const widthSync = useTransform(distance, [-150, 0, 150], [60, 75, 60]);
    const width = useSpring(widthSync, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });

    const iconBase =
        "relative flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-lg transition-all duration-300";
    const iconState = isActive
        ? "bg-white/80 dark:bg-zinc-900/70 border-[#1AA874]/50 shadow-[0_0_0_2px_rgba(26,168,116,0.16),0_10px_20px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.7)]"
        : "bg-white/20 dark:bg-zinc-900/40 border-white/30 dark:border-white/5 shadow-[0_6px_16px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.45)] group-hover:bg-white/30 dark:group-hover:bg-zinc-900/55";
    const iconSheen =
        "pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/60 via-white/25 to-transparent opacity-80 dark:from-white/18 dark:via-white/6 dark:to-transparent";

    return (
        <motion.div
            ref={(node) => {
                localRef.current = node;
                if (typeof forwardedRef === 'function') {
                    forwardedRef(node);
                } else if (forwardedRef) {
                    forwardedRef.current = node;
                }
            }}
            style={{ width }}
            className="h-full flex items-center justify-center"
        >
            <Link
                to={to}
                onClick={(e) => {
                    if (onClick) {
                        e.preventDefault();
                        onClick();
                    }
                }}
                className={`group w-full h-full flex flex-col items-center justify-center gap-1 transition-colors duration-300 relative z-10 ${isActive
                    ? 'text-[#1AA874]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
            >
                <span className={`${iconBase} ${iconState} group-hover:-translate-y-0.5`}>
                    <span className={iconSheen} />
                    <span className="relative z-10 flex items-center justify-center">
                        {children}
                    </span>
                </span>
                <span className="text-[9px] font-semibold leading-none whitespace-nowrap">{label}</span>
            </Link>
        </motion.div>
    );
});

DockIcon.displayName = 'DockIcon';

const LiquidDock = ({ items }) => {
    const location = useLocation();
    const mouseX = useMotionValue(Infinity);
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const itemWrapperRefs = useRef([]);
    const innerContainerRef = useRef(null);
    const pillSize = 60;
    const [pillPos, setPillPos] = useState({ left: 0, top: 0, width: pillSize, height: pillSize });

    const activeIndex = items.findIndex(item => location.pathname === item.path);
    const targetIndex = hoveredIndex !== null ? hoveredIndex : activeIndex;

    useLayoutEffect(() => {
        const updatePillPosition = () => {
            if (targetIndex >= 0 && itemWrapperRefs.current[targetIndex] && innerContainerRef.current) {
                const innerRect = innerContainerRef.current.getBoundingClientRect();
                const itemRect = itemWrapperRefs.current[targetIndex].getBoundingClientRect();

                const left = itemRect.left - innerRect.left + itemRect.width / 2 - pillSize / 2;
                const top = (innerRect.height - pillSize) / 2;

                setPillPos({
                    left,
                    top,
                    width: pillSize,
                    height: pillSize,
                });
            }
        };

        updatePillPosition();

        const innerEl = innerContainerRef.current;
        const targetEl = itemWrapperRefs.current[targetIndex];
        if (!innerEl || !targetEl) return undefined;

        const resizeObserver = new ResizeObserver(updatePillPosition);
        resizeObserver.observe(innerEl);
        resizeObserver.observe(targetEl);
        window.addEventListener('resize', updatePillPosition);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updatePillPosition);
        };
    }, [targetIndex]);

    return (
        <div className="app-dock fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 flex justify-center pb-safe-4 pointer-events-none">
            <motion.div
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => {
                    mouseX.set(Infinity);
                    setHoveredIndex(null);
                }}
                className="relative bg-white/75 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-full shadow-2xl border border-white/40 dark:border-white/10 pointer-events-auto overflow-hidden"
                style={{
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1) inset',
                }}
            >
                <div className="relative h-[60px] px-3 py-2 z-10">
                    <div ref={innerContainerRef} className="relative h-full flex items-center gap-8">
                        {/* Icons */}
                        {items.map((item, index) => (
                            <div
                                key={item.path}
                                className="flex-1 flex justify-center min-w-0"
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <DockIcon
                                    ref={(el) => (itemWrapperRefs.current[index] = el)}
                                    to={item.path}
                                    label={item.label}
                                    isActive={location.pathname === item.path}
                                    mouseX={mouseX}
                                    onClick={item.onClick}
                                >
                                    {item.icon}
                                </DockIcon>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LiquidDock;
