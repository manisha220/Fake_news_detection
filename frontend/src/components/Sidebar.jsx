import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Zap,
  BarChart2,
  Clock,
  Upload,
  Cpu,
  Sun,
  Moon,
  Rss,
} from "lucide-react";
import { useTheme } from "../ThemeContext";

const links = [
  { to: "/",          label: "Home",       Icon: Home     },
  { to: "/detect",    label: "Detect",     Icon: Zap      },
  { to: "/train",     label: "Training",   Icon: Cpu      },
  { to: "/analytics", label: "Analytics",  Icon: BarChart2},
  { to: "/history",   label: "History",    Icon: Clock    },
  { to: "/upload",    label: "Upload",     Icon: Upload   },
  { to: "/live-news", label: "Live News",  Icon: Rss      },
];

export default function Sidebar() {
  const { dark, toggle } = useTheme();
  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 border-r border-slate-700/60 px-4 py-6 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white leading-none">FakeShield</p>
          <p className="text-xs text-slate-500">AI Detection</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              "nav-link" + (isActive ? " active" : "")
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400
                   hover:text-white hover:bg-slate-800 transition-all duration-150 font-medium"
      >
        {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        {dark ? "Light Mode" : "Dark Mode"}
      </button>

      <p className="text-xs text-slate-600 px-2 mt-4">v1.0.0 &copy; 2024</p>
    </aside>
  );
}
