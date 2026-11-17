import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PlatformShowcase from './platform-showcase';

describe('Examiner-facing editorial Showcase',()=>{
  it('presents a focused goal, an actionable route, and the existing role boundaries',()=>{
    render(<PlatformShowcase/>);
    expect(screen.getByRole('heading',{level:1,name:/From simulation\s+to evidence/i})).toBeInTheDocument();
    expect(screen.getByRole('link',{name:/Try the simulation/})).toHaveAttribute('href','/simulation?from=showcase');
    expect(screen.getByRole('link',{name:/View engineering evidence/})).toHaveAttribute('href','/quality?from=showcase');
    expect(screen.getByText(/All five demo personas can access this technical showcase/)).toBeInTheDocument();
    expect(screen.getByText(/not an additional business use case or UAM role/)).toBeInTheDocument();
    expect(screen.getByText(/not production authorization/)).toBeInTheDocument();
  });

  it('provides a clearly labeled three-step live demonstration for an examiner',()=>{
    render(<PlatformShowcase/>);
    const walk=screen.getByRole('complementary',{name:'Suggested examiner walkthrough'});
    expect(within(walk).getAllByRole('listitem')).toHaveLength(3);
    expect(within(walk).getByRole('link',{name:/Step 1: Open SimPy Workbench/})).toHaveAttribute('href','/simulation?from=showcase');
    expect(within(walk).getByRole('link',{name:/Step 2: Compare workload scenarios/})).toHaveAttribute('href','/compare?from=showcase');
    expect(within(walk).getByRole('link',{name:/Step 3: Inspect real engineering evidence/})).toHaveAttribute('href','/quality?from=showcase');
    expect(within(walk).getByText(/not an illustrative slide/)).toBeInTheDocument();
  });

  it('groups six real modules by user goal instead of repeating equal-weight feature cards',()=>{
    const {container}=render(<PlatformShowcase/>);
    expect(container.querySelectorAll('.tp-showcase-card')).toHaveLength(6);
    expect(screen.getAllByText(/MODEL & PERFORMANCE|QUALITY & DELIVERY|DESIGN & CONFIGURATION/)).toHaveLength(3);
    const expected=[
      ['SimPy Workbench','/simulation?from=showcase'],
      ['Compare Workloads','/compare?from=showcase'],
      ['Engineering Quality','/quality?from=showcase'],
      ['API Explorer','/developer?from=showcase'],
      ['Engine Methodology','/methodology?from=showcase'],
      ['LLM Settings','/settings?from=showcase'],
    ];
    for(const [name,href] of expected){
      const link=Array.from(container.querySelectorAll('.tp-showcase-card'))
        .find(el=>el.textContent?.includes(name));
      expect(link).toBeDefined();
      expect(link).toHaveAttribute('href',href);
      expect(link).toHaveClass('tp-showcase-card');
    }
  });

  it('surfaces authentic CI/CD and API artifacts early with explicit source links',()=>{
    render(<PlatformShowcase/>);
    const section=screen.getByRole('heading',{name:'Evidence, one click away.'}).closest('section')!;
    const primary=within(section).getAllByRole('link').filter(link=>link.classList.contains('tp-showcase-evidence-link'));
    expect(primary).toHaveLength(3);
    const additional=within(section).getAllByRole('link').filter(link=>link.closest('.tp-showcase-raw-links'));
    expect(additional).toHaveLength(3);
    for(const link of [...primary,...additional]){
      expect(link).toHaveAttribute('target','_blank');
      expect(link).toHaveAttribute('rel','noopener noreferrer');
    }
    expect(within(section).getByRole('link',{name:/GitHub Actions/}).getAttribute('href')).toMatch(/actions\/workflows\/quality.yml/);
    expect(within(section).getByRole('link',{name:/Verified results JSON/}).getAttribute('href')).toMatch(/quality-reports\/latest.json/);
    expect(within(section).getByRole('link',{name:/OpenAPI JSON/})).toHaveAttribute('href','/openapi.json');
    expect(within(section).getByRole('link',{name:/CI\/CD configuration/}).getAttribute('href')).toMatch(/\.github\/workflows\/quality.yml/);
    expect(within(section).getByRole('link',{name:/Swagger API documentation/})).toHaveAttribute('href','/docs');
    expect(within(section).getByRole('link',{name:/Backend quality JSON/})).toHaveAttribute('href','/api/v1/quality');
  });
});
