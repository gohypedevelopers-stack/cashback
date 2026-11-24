"use client";

import React from 'react';
import { GlassDock, GlassButton, GlassFilter } from '../components/ui/LiquidGlass';
import { useNavigate } from "@/lib/router";
import { ArrowLeft } from 'lucide-react';

const LiquidGlassDemo = () => {
    const navigate = useNavigate();

    const dockIcons = [
        {
            src: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Google_Chrome_icon_%28February_2022%29.svg/800px-Google_Chrome_icon_%28February_2022%29.svg.png",
            alt: "Chrome",
        },
        {
            src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/2048px-Instagram_icon.png",
            alt: "Instagram",
        },
        {
            src: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/2560px-YouTube_full-color_icon_%282017%29.svg.png",
            alt: "YouTube",
        },
        {
            src: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/2048px-WhatsApp.svg.png",
            alt: "WhatsApp",
        },
    ];

    return (
        <div
            className="min-h-screen h-full flex items-center justify-center font-light relative overflow-hidden w-full"
            style={{
                background: `url("https://images.unsplash.com/photo-1432251407527-504a6b4174a2?q=80&w=1480&auto=format&fit=crop") center center`,
                animation: "moveBackground 60s linear infinite",
                backgroundSize: "cover"
            }}
        >
            <GlassFilter />

            {/* Back Button */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-4 left-4 z-50 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors"
            >
                <ArrowLeft size={24} />
            </button>

            <div className="flex flex-col gap-6 items-center justify-center w-full px-4">
                <GlassDock icons={dockIcons} href="#" />

                <GlassButton href="#">
                    <div className="text-xl text-white font-medium text-center">
                        <p>Experience the Fluid Design</p>
                    </div>
                </GlassButton>
            </div>
        </div>
    );
};

export default LiquidGlassDemo;
