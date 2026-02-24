import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/items/new", label: "Add Item" },
  { href: "/items", label: "Inventory" },
  { href: "/tax-year", label: "Tax Year" },
  { href: "/needs-attention", label: "Needs Attention" },
  { href: "/import", label: "Import" },
  { href: "/backup", label: "Backup" },
];

export function Nav() {
  return (
    <nav className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <ul className="flex flex-wrap gap-2">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              href={item.href}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
