import type {ComponentProps} from 'react'
import {cn} from 'cn'
// shadcn/ui base-nova Card, reduzido às partes utilizadas e aos tokens do projeto.
export function Card({className,...props}:ComponentProps<'div'>){return <div data-slot="card" className={cn('analise-card',className)} {...props}/>}
export function CardHeader({className,...props}:ComponentProps<'div'>){return <div data-slot="card-header" className={cn('analise-card-header',className)} {...props}/>}
export function CardContent({className,...props}:ComponentProps<'div'>){return <div data-slot="card-content" className={cn('analise-card-content',className)} {...props}/>}
