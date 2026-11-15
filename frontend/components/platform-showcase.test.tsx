import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PlatformShowcase from './platform-showcase';

describe('Platform Showcase for examiners',()=>{
  it('explains that technical demonstrations are shared, not a sixth business role',()=>{
    render(<PlatformShowcase/>);
    expect(screen.getByRole('heading',{level:1,name:/See what powers every release decision/i})).toBeInTheDocument();
    expect(screen.getByText(/All five demo personas can access this technical showcase/)).toBeInTheDocument();
    expect(screen.getByText(/not an additional business use case or UAM role/)).toBeInTheDocument();
    expect(screen.getByText(/not production authorization/)).toBeInTheDocument();
  });

  it('exposes six real product tools with unambiguous destinations',()=>{
    const {container}=render(<PlatformShowcase/>);
    expect(container.querySelectorAll('.tp-showcase-card')).toHaveLength(6);
    const expected=[
      ['SimPy Workbench','/simulation'],
      ['Compare Workloads','/compare'],
      ['Engineering Quality','/quality'],
      ['API Explorer','/developer'],
      ['Engine Methodology','/methodology'],
      ['LLM Settings','/settings'],
    ];
    for(const [name,url] of expected){
      const heading=screen.getByRole('heading',{name});
      expect(heading.closest('a')).toHaveAttribute('href',url);
    }
    expect(screen.getByRole('link',{name:/View engineering evidence/})).toHaveAttribute('href','/quality');
    expect(screen.getByRole('link',{name:/Inspect API contracts/})).toHaveAttribute('href','/developer');
  });

  it('links to real source workflows, published test evidence and original API documentation',()=>{
    render(<PlatformShowcase/>);
    const evidence=screen.getByRole('heading',{name:'Source, pipeline and JSON.'}).closest('section')!;
    const entries=within(evidence).getAllByRole('link');
    expect(entries).toHaveLength(6);
    for (const link of entries){
      expect(link).toHaveAttribute('target','_blank');
      expect(link).toHaveAttribute('rel','noopener noreferrer');
    }
    expect(within(evidence).getByRole('link',{name:/CI\/CD execution history/})).toHaveAttribute('href',/actions\/workflows\/quality.yml/);
    expect(within(evidence).getByRole('link',{name:/CI pipeline definition/})).toHaveAttribute('href',/\.github\/workflows\/quality.yml/);
    expect(within(evidence).getByRole('link',{name:/Test evidence JSON/})).toHaveAttribute('href',/quality-reports\/latest.json/);
    expect(within(evidence).getByRole('link',{name:/OpenAPI specification/})).toHaveAttribute('href','/openapi.json');
    expect(within(evidence).getByRole('link',{name:/Swagger API documentation/})).toHaveAttribute('href','/docs');
    expect(within(evidence).getByRole('link',{name:/Backend quality JSON/})).toHaveAttribute('href','/api/v1/quality');
  });
});
