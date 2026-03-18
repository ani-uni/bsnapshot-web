import {
  index,
  layout,
  prefix,
  type RouteConfig,
  route,
} from '@react-router/dev/routes'

export default [
  layout('./app/layout.tsx', [
    index('./app/index.tsx'),
    ...prefix('/tasks', [
      index('./app/tasks/index.tsx'),
      route('captures/:cid', './app/tasks/capture.tsx'),
    ]),
    ...prefix('/groups', [
      layout('./app/groups/layout.tsx', [
        index('./app/groups/index.tsx'),
        route('ss/:ssid', './app/groups/ss.tsx'),
        route('ep/:epid', './app/groups/ep.tsx'),
      ]),
    ]),
    route('/users', './app/users/index.tsx'),
    route('/settings', './app/settings/index.tsx'),
    route('/logs', './app/events/index.tsx'),
  ]),
  // * matches all URLs, the ? makes it optional so it will match / as well
  route('*?', 'catchall.tsx'),
] satisfies RouteConfig
