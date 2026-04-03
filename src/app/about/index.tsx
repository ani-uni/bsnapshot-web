import { Card, ExternalLinkIcon, Link, Table, Tabs } from '@heroui/react'
import backendPackageJson from '~/backend/package.json'
import frontendPackageJson from '~/package.json'

type Dependency = {
  name: string
  version: string
  type: 'dependency' | 'devDependency'
}

type PackageJson = {
  name: string
  version: string
  homepage?: string
  author?: {
    name?: string
    url?: string
  }
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

function getDependencyList(packageJson: PackageJson): Dependency[] {
  return [
    ...Object.entries(packageJson.dependencies || {}).map(
      ([name, version]: [string, string]) => ({
        name,
        version,
        type: 'dependency' as const,
      }),
    ),
    ...Object.entries(packageJson.devDependencies || {}).map(
      ([name, version]: [string, string]) => ({
        name,
        version,
        type: 'devDependency' as const,
      }),
    ),
  ]
}

function DependencyTable({ dependencies }: { dependencies: Dependency[] }) {
  return (
    <Table aria-label="依赖列表">
      <Table.ScrollContainer>
        <Table.Content className="min-w-full">
          <Table.Header>
            <Table.Column isRowHeader>包名称</Table.Column>
            <Table.Column>版本</Table.Column>
            <Table.Column>类型</Table.Column>
          </Table.Header>
          <Table.Body>
            {dependencies.map((item) => (
              <Table.Row key={item.name}>
                <Table.Cell className="font-mono text-sm">
                  {item.name}
                </Table.Cell>
                <Table.Cell className="font-mono text-sm">
                  {item.version}
                </Table.Cell>
                <Table.Cell>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.type === 'dependency'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-purple-100 text-purple-900'
                    }`}
                  >
                    {item.type === 'dependency' ? '依赖' : '开发依赖'}
                  </span>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}

function DependencyStats({ dependencies }: { dependencies: Dependency[] }) {
  const prodCount = dependencies.filter((d) => d.type === 'dependency').length
  const devCount = dependencies.filter((d) => d.type === 'devDependency').length

  return (
    <div className="mt-4 flex gap-6 text-sm">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-blue-100"></div>
        <span>生产依赖: {prodCount}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-purple-100"></div>
        <span>开发依赖: {devCount}</span>
      </div>
    </div>
  )
}

export default function AboutPage() {
  const frontendDeps = getDependencyList(frontendPackageJson)
  const backendDeps = getDependencyList(backendPackageJson)

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">关于 BSnapshot</h1>
        {/* 项目信息 */}
        <Card>
          <Card.Header>
            <div className="flex flex-col gap-2">
              <Card.Title>关于</Card.Title>
              <Card.Description>
                版本 {backendPackageJson.version} •{' '}
                {backendPackageJson.license || 'Custom'} 许可证
              </Card.Description>
            </div>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-1">作者</p>
              <Link
                href={backendPackageJson.author.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground"
              >
                {backendPackageJson.author.name}
                <ExternalLinkIcon />
              </Link>
            </div>

            <div>
              <p className="text-sm font-semibold mb-1">项目相关</p>
              <Link
                href={backendPackageJson.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground"
              >
                访问项目主页/文档
                <ExternalLinkIcon />
              </Link>
              <br />
              <Link
                href={backendPackageJson.repository.url
                  .replace(/^git\+/, '')
                  .replace(/\.git$/, '')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground"
              >
                访问 {backendPackageJson.repository.type.toUpperCase()} 仓库
                <ExternalLinkIcon />
              </Link>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">特别感谢</p>
              <p className="text-sm leading-relaxed">
                感谢{' '}
                <Link
                  href="https://github.com/ccicnce113424"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground"
                >
                  @ccicnce113424
                  <ExternalLinkIcon />
                </Link>{' '}
                在{' '}
                <Link
                  href="https://github.com/HengXin666/BiLiBiLi_DanMu_Crawling/issues/14"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground"
                >
                  HengXin666/BiLiBiLi_DanMu_Crawling#14
                  <ExternalLinkIcon />
                </Link>{' '}
                中提供的新的爬取思路（该方法受 BiliPlus 全弹幕下载器启发）
              </p>
            </div>
          </Card.Content>
        </Card>

        {/* 项目描述 */}
        <Card>
          <Card.Header>
            <Card.Title>项目介绍</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="leading-relaxed">
              BSnapshot
              是一个B站全弹幕下载和管理工具，支持获取普通弹幕(实时、历史)、高级弹幕(BAS等)、基于创作中心的UP主专用弹幕获取接口。
              <br />
              我们提供定时任务、多账号轮询使用、片段弹幕获取、信息关联等功能，满足用户多样化的弹幕下载需求。
              <br />
              软件支持前后端分离，普通用户可以使用electron打包的桌面版本，高级用户可以分离部署后端服务，并使用Web客户端进行访问。
            </p>
          </Card.Content>
        </Card>

        {/* 依赖列表 - 前后端 Tab */}
        <div>
          <h2 className="mb-4 text-2xl font-semibold">项目依赖</h2>

          <Tabs defaultSelectedKey="frontend" variant="secondary">
            <Tabs.ListContainer>
              <Tabs.List aria-label="前后端依赖切换">
                <Tabs.Tab id="frontend">
                  前端 ({frontendDeps.length})
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="backend">
                  后端 ({backendDeps.length})
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>

            {/* 前端依赖面板 */}
            <Tabs.Panel id="frontend" className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold">
                前端依赖 - {frontendPackageJson.name}
              </h3>
              <DependencyTable dependencies={frontendDeps} />
              <DependencyStats dependencies={frontendDeps} />
            </Tabs.Panel>

            {/* 后端依赖面板 */}
            <Tabs.Panel id="backend" className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold">
                后端依赖 - {backendPackageJson.name}
              </h3>
              <DependencyTable dependencies={backendDeps} />
              <DependencyStats dependencies={backendDeps} />
            </Tabs.Panel>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
