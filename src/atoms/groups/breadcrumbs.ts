import { atom } from 'jotai'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export const breadcrumbsAtom = atom<BreadcrumbItem[]>([])
