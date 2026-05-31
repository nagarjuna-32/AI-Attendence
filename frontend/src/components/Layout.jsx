import React from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export function Layout({ children, role, title }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar role={role} />
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <TopNav title={title} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
