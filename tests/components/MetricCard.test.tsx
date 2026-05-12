import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricCard } from '@/components/admin/MetricCard';

describe('MetricCard', () => {
  it('renderiza titulo e valor', () => {
    render(<MetricCard titulo="Jogadas" valor={42} />);
    expect(screen.getByText('Jogadas')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
  it('renderiza subtitulo quando passado', () => {
    render(<MetricCard titulo="X" valor={1} subtitulo="último mês" />);
    expect(screen.getByText(/último mês/)).toBeInTheDocument();
  });
});
