import { Breadcrumbs } from '@heroui/react'
import { useAtom } from 'jotai'
import { NavLink, Outlet } from 'react-router'

import { breadcrumbsAtom } from '@/atoms/groups/breadcrumbs'
import { RequireConnection } from '@/components/RequireConnection'

export default function Layout() {
  const [breadcrumbs] = useAtom(breadcrumbsAtom)

  return (
    <RequireConnection>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {/* <h1 className="mb-6 text-4xl font-bold">合集</h1> */}

        <Breadcrumbs className="mb-2 p-4">
          {breadcrumbs.map((item) => (
            <Breadcrumbs.Item key={item.label + (item.href || '')}>
              {item.href ? (
                <NavLink to={item.href}>{item.label}</NavLink>
              ) : (
                item.label
              )}
            </Breadcrumbs.Item>
          ))}
        </Breadcrumbs>

        <Outlet />
      </div>
    </RequireConnection>
  )
}
