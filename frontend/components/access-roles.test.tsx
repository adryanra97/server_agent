import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AccessRoles from './access-roles';
import { DEMO_SESSION_KEY, allowedPages, demoPersonas, type DemoRole } from '../lib/demo';

const push=vi.hoisted(()=>vi.fn());
vi.mock('next/navigation',()=>({useRouter:()=>({push})}));

beforeEach(()=>{push.mockClear();});

describe('Access & Roles permission matrix',()=>{
  it('shows actual permissions for all five roles across six workspace menus',()=>{
    render(<AccessRoles role="qa"/>);
    const table=screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(within(table).getAllByRole('columnheader')).toHaveLength(6);
    for (const persona of demoPersonas) {
      expect(within(table).getByRole('columnheader',{name:persona.shortRole})).toBeInTheDocument();
    }
    const routes=['/dashboard','/alignment','/incident','/signoff','/reports','/access'];
    for (const route of routes) {
      const row=within(table).getAllByRole('row').find(x=>x.querySelector('th[scope="row"]')?.textContent?.includes(
        ({'/dashboard':'Overview','/alignment':'Release alignment','/incident':'Incident response','/signoff':'Sign-off','/reports':'Report','/access':'Access & roles'} as Record<string,string>)[route]
      ));
      expect(row).toBeDefined();
      const cells=within(row!).getAllByRole('cell');
      demoPersonas.forEach((persona,index)=>{
        const permitted=allowedPages(persona.id).some(page=>page.href===route);
        expect(cells[index].getAttribute('aria-label')).toBe(permitted?'Available':'Not assigned');
      });
    }
  });

  it('shows which role is active and switches perspective through the demo session',()=>{
    const {rerender}=render(<AccessRoles role="qa"/>);
    expect(screen.getByText('Current: QA Tester')).toBeInTheDocument();
    const qaButton=screen.getByRole('button',{name:/QA Tester/});
    expect(qaButton).toHaveClass('active');
    const managerButton=screen.getByRole('button',{name:/Project Manager/});
    fireEvent.click(managerButton);
    expect(sessionStorage.getItem(DEMO_SESSION_KEY)).toBe('manager');
    expect(push).toHaveBeenCalledWith('/dashboard');
    rerender(<AccessRoles role={'manager' as DemoRole}/>);
    expect(screen.getByText('Current: Project Manager')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:/Project Manager/})).toHaveClass('active');
    expect(screen.getByRole('button',{name:/QA Tester/})).not.toHaveClass('active');
  });
});
