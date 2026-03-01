import { Toast } from '@heroui/react'
import { Provider } from 'jotai'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <link href="/favicon.ico" rel="icon" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>BSnapshot</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Toast.Provider />
        <Provider>{children}</Provider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  return <Outlet />
}
