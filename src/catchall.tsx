import { Link } from '@heroui/react'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h1 className="mb-4 text-6xl font-bold">404</h1>
        <p className="mb-8 text-xl text-muted">页面未找到</p>
        <Link
          href="/"
          className="rounded-md bg-accent px-4 py-2 text-accent-foreground hover:bg-accent/90"
        >
          返回首页
          <Link.Icon />
        </Link>
      </div>
    </div>
  )
}
