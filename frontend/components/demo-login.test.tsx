import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DemoLogin from './demo-login';
import { DEMO_SESSION_KEY } from '../lib/demo';

const push=vi.hoisted(()=>vi.fn());
vi.mock('next/navigation',()=>({useRouter:()=>({push})}));
beforeEach(()=>push.mockClear());

describe('five-persona guided login',()=>{
  it('rejects an incorrect password without creating a session',()=>{
    render(<DemoLogin/>);
    fireEvent.change(screen.getByLabelText('ACCESS PASSWORD'),{target:{value:'incorrect'}});
    fireEvent.click(screen.getByRole('button',{name:/Continue as QA Tester/}));
    expect(screen.getByRole('alert')).toHaveTextContent('Password demo tidak sesuai');
    expect(sessionStorage.getItem(DEMO_SESSION_KEY)).toBeNull();
    expect(push).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('DEMO USER'),{target:{value:'lead'}});
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:/Continue as Technical Lead/})).toBeInTheDocument();
  });

  it('shows and hides password, then uses the provided demo credentials',()=>{
    render(<DemoLogin/>);
    const password=screen.getByLabelText('ACCESS PASSWORD') as HTMLInputElement;
    expect(password.type).toBe('password');
    fireEvent.click(screen.getByRole('button',{name:'Show password'}));
    expect(password.type).toBe('text');
    fireEvent.click(screen.getByRole('button',{name:'Hide password'}));
    expect(password.type).toBe('password');
    fireEvent.click(screen.getByRole('button',{name:'Use demo password'}));
    expect(password.value).toBe('demo123');
    fireEvent.click(screen.getByRole('button',{name:/Continue as QA Tester/}));
    expect(sessionStorage.getItem(DEMO_SESSION_KEY)).toBe('qa');
    expect(push).toHaveBeenCalledWith('/dashboard');
  });

  it('persists the selected persona and clears an error when the password changes',()=>{
    render(<DemoLogin/>);
    fireEvent.change(screen.getByLabelText('ACCESS PASSWORD'),{target:{value:'bad'}});
    fireEvent.click(screen.getByRole('button',{name:/Continue as QA Tester/}));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('ACCESS PASSWORD'),{target:{value:'demo123'}});
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('DEMO USER'),{target:{value:'support'}});
    fireEvent.click(screen.getByRole('button',{name:/Continue as Support & Monitoring/}));
    expect(sessionStorage.getItem(DEMO_SESSION_KEY)).toBe('support');
    expect(push).toHaveBeenCalledWith('/dashboard');
  });
});
