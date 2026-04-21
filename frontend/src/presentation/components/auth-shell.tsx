import type { ReactNode } from 'react';
import { Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const AuthShell = ({ title, subtitle, children, footer }: AuthShellProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10 text-gray-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900/80 p-8 shadow-xl backdrop-blur">
        <Link to="/" className="flex items-center gap-3">
          <Landmark className="h-5 w-5 text-amber-300" />
          <span className="font-serif text-xl text-gray-100">Signature Stone</span>
        </Link>
        <h1 className="mt-6 font-serif text-3xl text-gray-100">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-slate-300">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6 text-center text-sm text-slate-300">{footer}</div> : null}
      </div>
    </div>
  );
};
