import DashboardShell from '../../registry/blocks/dashboard-shell/dashboard-shell';
import DashboardStats from '../../registry/blocks/dashboard-shell/dashboard-stats';
import { ContentProps } from '../site/templates';

// The shell carries a theme of its own, so the half it is drawn in has to hand it over.
export default function Preview({ theme }: ContentProps) {
  return (
    <DashboardShell title="Overview" current="overview" theme={theme}>
      <DashboardStats />
    </DashboardShell>
  );
}
