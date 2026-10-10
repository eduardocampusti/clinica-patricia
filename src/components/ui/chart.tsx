import type { ComponentProps } from 'react'
import { cn } from 'cn'
import { ResponsiveContainer, Tooltip } from 'recharts'

// Composição do ChartContainer oficial shadcn/base-nova, reduzida ao que esta
// entrega utiliza. Tokens pertencem ao escopo analítico, sem alterar o tema global.
// https://ui.shadcn.com/docs/components/base/chart
export function ChartContainer({ children, className, ...props }: ComponentProps<'div'> & {
  children: ComponentProps<typeof ResponsiveContainer>['children']
}) {
  return <div data-slot="chart" className={cn('analise-chart-container', className)} {...props}>
    <ResponsiveContainer initialDimension={{ width: 320, height: 280 }}>{children}</ResponsiveContainer>
  </div>
}
export const ChartTooltip = Tooltip
